import ImporterInterface from "./ImporterInterface";
import PhpParser from 'php-parser';
import { SerializedConfigurationInterface } from "../Configuration";
import {camelCaseToUnderscore} from "../Utils";

export default class PhpECSImporter implements ImporterInterface {

    readonly handle: string = 'php-ecs';

    readonly name: string = 'PHP Easy Coding Standard (ecs.php)';

    readonly pastePlaceholder: string = 'Paste here the full contents of your ecs.php files';

    private readonly parser: any;

    public constructor() {
        this.parser = new PhpParser({
            parser: {
                debug: false,
                locations: false,
                extractDoc: false,
                suppressErrors: false
            },
            lexer: {
                all_tokens: false,
                comment_tokens: false,
                mode_eval: true,
                asp_tags: false,
                short_tags: false
            }
        });
    }

    parse(serialized: string): SerializedConfigurationInterface {
        let ast = this.getAST(serialized),
            parameters = PhpECSImporter.getParameters(ast),
            services = this.getServices(ast);

        if (services === null) {
            throw new Error('Unable to find the services definitions.');
        }
        let configuration = this.parseSetRulesArray(services);
        let indentValue = parameters['Option::INDENTATION'];
        if (typeof indentValue === 'string') {
            if (configuration.whitespace === undefined) {
                configuration.whitespace = {};
            }
            configuration.whitespace.indent = indentValue;
        }
        let lineEndingValue = parameters['Option::LINE_ENDING'];
        if (typeof lineEndingValue === 'string') {
            if (configuration.whitespace === undefined) {
                configuration.whitespace = {};
            }
            configuration.whitespace.lineEnding = lineEndingValue;
        }
        return configuration;
    }

    protected getAST(serialized: string): any {
        let ast = this.parser.parseCode(serialized),
            numChildren: number = ast.children ? ast.children.length : 0;
        if (ast.kind === 'program' && numChildren) {
            for (let childIndex = 0; childIndex < numChildren; childIndex++) {
                if (ast.children[childIndex].kind === "return" &&
                    ast.children[childIndex].expr.kind === "closure" &&
                    ast.children[childIndex].expr.arguments &&
                    ast.children[childIndex].expr.arguments.length &&
                    ast.children[childIndex].expr.arguments[0].type.kind === "classreference" &&
                    ast.children[childIndex].expr.arguments[0].type.name === "ContainerConfigurator"
                ) {
                    return ast.children[childIndex].expr.body.children;
                }
            }
        }
        return ast;
    }

    /**
     * Parse the rules array, extracting the fixer and fixer sets.
     *
     * @param setRulesArray
     * @throws
     */
    protected parseSetRulesArray(setRulesArray: any): SerializedConfigurationInterface {
        let configuration: SerializedConfigurationInterface = {};
        Object.keys(<Object>setRulesArray).forEach((key: string | any) => {
            if (typeof key !== 'string') {
                throw new Error('Expected dictionary as setRules() array.');
            }
            let value: any = (<any>setRulesArray)[key];

            if (value !== true && value !== false && (value === null || typeof value !== 'object')) {
                throw new Error('Unsupported value type in setRules() array.');
            }
            if (configuration.fixers === undefined) {
                configuration.fixers = {};
            }
            configuration.fixers[key] = value;
        });
        return configuration;
    }

    /**
     * Parse an AST node and extract its value.
     * @param value
     * @throws
     */
    protected valueToJavascript(value: any): boolean | string | number | Array<any> | Object {
        let valueKind: string = value && value.kind ? value.kind : '?';
        switch (valueKind) {
            case 'boolean':
            case 'number':
            case 'string':
                return value.value;
            case 'array':
                let arr: Object | Array<any> = {},
                    values: Array<any> = value.items;
                values.some((v) => {
                    if (v && !v.key) {
                        arr = [];
                        return true;
                    }
                    return false;
                });
                values.forEach((v, index) => {
                    if (!v) {
                        return;
                    }
                    if (v.key) {
                        (<any>arr)[<string>this.valueToJavascript(v.key)] = this.valueToJavascript(v.value);
                    } else {
                        (<Array<any>>arr).push(this.valueToJavascript(v));
                    }
                });
                return arr;
        }
        throw new Error(`Unsupported value type ${valueKind} in setRules() array.`);
    }

    private static getParameters(ast: any): any {
        let numExpressions = ast ? ast.length : 0,
            parameters: any[any] = [];
        for (let exprIndex = 0; exprIndex < numExpressions; exprIndex++) {
            if (ast[exprIndex].kind === "expressionstatement" &&
                ast[exprIndex].expression.kind === "call" &&
                ast[exprIndex].expression.what.kind === "propertylookup" &&
                ast[exprIndex].expression.what.offset.kind === "identifier" &&
                ast[exprIndex].expression.what.offset.name === "set" &&
                ast[exprIndex].expression.what.what.kind === "variable" &&
                ast[exprIndex].expression.what.what.name === "parameters" &&
                ast[exprIndex].expression.arguments[0].kind === "staticlookup" &&
                ast[exprIndex].expression.arguments[0].offset.kind === "identifier" &&
                ast[exprIndex].expression.arguments[0].what.kind === "classreference"
            ) {
                let key: string = ast[exprIndex].expression.arguments[0].what.name + '::' + ast[exprIndex].expression.arguments[0].offset.name;
                parameters[key] = ast[exprIndex].expression.arguments[1].raw ? ast[exprIndex].expression.arguments[1].raw : ast[exprIndex].expression.arguments[1];
            }
        }
        return parameters;
    }

    private getServices(ast: any): any {
        let numExpressions = ast ? ast.length : 0,
            services: any[any] = [];
        for (let exprIndex = 0; exprIndex < numExpressions; exprIndex++) {
            if (ast[exprIndex].kind === "expressionstatement" &&
                ast[exprIndex].expression.kind === "call" &&
                ast[exprIndex].expression.what.kind === "propertylookup" &&
                ast[exprIndex].expression.what.offset.kind === "identifier" &&
                ast[exprIndex].expression.what.offset.name === "set" &&
                ast[exprIndex].expression.what.what.kind === "variable" &&
                ast[exprIndex].expression.what.what.name === "services" &&
                ast[exprIndex].expression.arguments[0].kind === "staticlookup" &&
                ast[exprIndex].expression.arguments[0].offset.kind === "identifier" &&
                ast[exprIndex].expression.arguments[0].what.kind === "classreference"
            ) {
                let name: string = PhpECSImporter.getUnderscoreName(ast[exprIndex].expression.arguments[0].what.name);
                services[name] = true;
            }
            if (ast[exprIndex].kind === "expressionstatement" &&
                ast[exprIndex].expression.kind === "call" &&
                ast[exprIndex].expression.what.kind === "propertylookup" &&
                ast[exprIndex].expression.what.offset.kind === "identifier" &&
                ast[exprIndex].expression.what.offset.name === "call" &&
                ast[exprIndex].expression.what.what.kind === "call" &&
                ast[exprIndex].expression.what.what.what.kind === "propertylookup" &&
                ast[exprIndex].expression.what.what.what.what.kind === "variable" &&
                ast[exprIndex].expression.what.what.what.what.name === "services" &&
                ast[exprIndex].expression.arguments[0].kind === "string" &&
                ast[exprIndex].expression.arguments[0].value === "configure" &&
                ast[exprIndex].expression.what.what.arguments[0].kind === "staticlookup" &&
                ast[exprIndex].expression.what.what.arguments[0].what.kind === "classreference"
            ) {
                let name: string = PhpECSImporter.getUnderscoreName(ast[exprIndex].expression.what.what.arguments[0].what.name);
                services[name] = this.valueToJavascript(ast[exprIndex].expression.arguments[1].items[0]);
            }
        }
        return services;
    }

    private static getUnderscoreName(classname: string): string {
        let namespaces: string[] = classname.split('\\');
        return camelCaseToUnderscore(namespaces[namespaces.length - 1]).replace('_fixer', '');
    }
}
