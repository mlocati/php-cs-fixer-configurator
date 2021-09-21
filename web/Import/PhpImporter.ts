import ImporterInterface from "./ImporterInterface";
import PhpParser from 'php-parser';
import { SerializedConfigurationInterface } from "../Configuration";

export default class PhpImporter implements ImporterInterface {

    readonly handle: string = 'php';

    readonly name: string = 'PHP';

    readonly pastePlaceholder: string = 'Paste here the full contents of your .php_cs / .php_cs.dist files (or just the array with the rules).';

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
        let ast;
        try {
            ast = this.getAST(serialized);
        } catch (e) {
            try {
                ast = this.getAST(`<?php\n${serialized}`);
            } catch (e2) {
                throw e;
            }
        }
        let setRulesArray = this.findRelevantValue(ast, 'setRules');
        if (setRulesArray === null) {
            throw new Error('Unable to find the setRules() call, and the PHP code is not an array.');
        }
        let configuration = this.parseSetRulesArray(setRulesArray);
        let indentValue = this.findRelevantValue(ast, 'setIndent');
        if (typeof indentValue === 'string') {
            if (configuration.whitespace === undefined) {
                configuration.whitespace = {};
            }
            configuration.whitespace.indent = indentValue;
        }
        let lineEndingValue = this.findRelevantValue(ast, 'setLineEnding');
        if (typeof lineEndingValue === 'string') {
            if (configuration.whitespace === undefined) {
                configuration.whitespace = {};
            }
            configuration.whitespace.lineEnding = lineEndingValue;
        }
        return configuration;
    }

    protected getAST(serialized: string): any {
        let ast = this.parser.parseCode(serialized);
        if (ast.children.length === 1 && ast.children[0].kind === 'inline') {
            ast = this.parser.parseEval(serialized);
        }
        return ast;
    }

    /**
     * Find the relelevant node associated to a specific method.
     *
     * @param ast
     * @param method
     * @throws
     */
    protected findRelevantValue(ast: any, method: string): any | null {
        let methodLC = method.toLowerCase(),
            numChildren: number = ast.children ? ast.children.length : 0,
            arr: any
            ;
        for (let childIndex = 0; childIndex < numChildren; childIndex++) {
            arr = this.walkForRelevantValue(ast.children[childIndex], method, methodLC);
            if (arr !== null) {
                return arr;
            }
        }
        if (methodLC === 'setrules' && numChildren === 1 && ast.children[0].kind === 'expressionstatement' && ast.children[0].expression.kind === 'array') {
            return ast.children[0].expression;
        }
        return null;
    }

    /**
     * Walk a node structure searching for the relevant AST note for a specific method.
     *
     * @param node
     * @param method
     * @param methodLC
     * @throws
     */
    protected walkForRelevantValue(node: any, method: string, methodLC: string): any | null {
        if (!node) {
            return null;
        }
        let result = null;
        switch (node.kind) {
            case 'call':
                if (node.what && node.what.offset && typeof node.what.offset.name === 'string' && node.what.offset.name.toLowerCase() === methodLC) {
                    switch (methodLC) {
                        case 'setrules':
                            if (node.arguments.length !== 1 || node.arguments[0].kind !== 'array') {
                                throw new Error(`Expecting an array as the only argument of ${method}().`);
                            }
                            result = node.arguments[0];
                            break;
                        case 'setindent':
                        case 'setlineending':
                            if (node.arguments.length !== 1 || node.arguments[0].kind !== 'string') {
                                throw new Error(`Expecting a string as the only argument of ${method}().`);
                            }
                            result = node.arguments[0].value;
                            break;
                    }
                }
                if (result === null && node.arguments) {
                    Object.keys(node.arguments).some((key) => {
                        result = this.walkForRelevantValue(node.arguments[key], method, methodLC);
                        return result !== null;
                    })
                }
                if (result === null && node.what && node.what.kind === 'propertylookup') {
                    result = this.walkForRelevantValue(node.what.what, method, methodLC);
                }
                break;
            case 'return':
                result = this.walkForRelevantValue(node.expr, method, methodLC);
                break;
        }
        return result;
    };

    /**
     * Parse the rules array, extracting the fixer and fixer sets.
     *
     * @param setRulesArray
     * @throws
     */
    protected parseSetRulesArray(setRulesArray: any): SerializedConfigurationInterface {
        let arr = this.valueToJavascript(setRulesArray);
        if (typeof arr !== 'object' || arr instanceof Array) {
            throw new Error('Expected dictionary as setRules() array.');
        }
        let configuration: SerializedConfigurationInterface = {};
        Object.keys(<Object>arr).forEach((key: string | any) => {
            if (typeof key !== 'string') {
                throw new Error('Expected dictionary as setRules() array.');
            }
            let value: any = (<any>arr)[key];
            if (key.charAt(0) === '@') {
                if (value !== true && value !== false) {
                    throw new Error('Unsupported value type in setRules() array.');
                }
                if (configuration.fixerSets === undefined) {
                    configuration.fixerSets = [];
                }
                configuration.fixerSets.push((value ? '' : '-') + key);
            } else {
                if (value !== true && value !== false && (value === null || typeof value !== 'object')) {
                    throw new Error('Unsupported value type in setRules() array.');
                }
                if (configuration.fixers === undefined) {
                    configuration.fixers = {};
                }
                configuration.fixers[key] = value;
            }
        });
        return configuration;
    }

    /**
     * Parse an AST node and extract its value.
     * @param value
     * @throws
     */
    protected valueToJavascript(value: any): boolean | string | number | Array<any> | Object | null {
        let valueKind: string = value && value.kind ? value.kind : '?';
        switch (valueKind) {
            case 'boolean':
            case 'number':
            case 'string':
            case 'nowdoc':
                return value.value;
            case 'encapsed':
                if (value.value instanceof Array && value.value.length === 1 && value.value[0] && value.value[0].expression && value.value[0].expression.kind === 'string') {
                    return value.value[0].expression.value;
                }
                break;
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
            case 'identifier':
                if (value.name && value.name.kind === 'classreference' && value.name.name === 'null') {
                    return null;
                }
                break;
        }
        throw new Error(`Unsupported value type ${valueKind} in setRules() array.`);
    }
}
