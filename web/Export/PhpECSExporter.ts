import ExporterInterface, { RenderOptions } from "./ExporterInterface";
import { SerializedConfigurationInterface } from "../Configuration";
import {toPhp, setNameToConst } from "../Utils";

export default class PhpECSExporter implements ExporterInterface {

    readonly handle: string = 'php-ecs';

    readonly name: string = 'ecs.php';

    readonly language: string = 'php';

    readonly supportConfiguringWhitespace: boolean = true;

    readonly supportFixerDescriptions: boolean = true;

    readonly supportImportFixerClasses: boolean = true;

    /**
     * Generate the text representing the configuration
     */
    render(configuration: SerializedConfigurationInterface, options: RenderOptions): string {
        const INDENT = '    ';
        const LINE_ENDING = '\n';
        let lines: string[] = [
            '<?php',
            'declare(strict_types=1);',
            '',
            '/*',
            ' * This document has been generated with',
            ' * https://mlocati.github.io/php-cs-fixer-configurator/#version:' + configuration.version + '|configurator',
            ' * you can change this configuration by importing this file.',
            ' */',
            '',
        ];

        if (options.importFixerClasses && configuration.fixers !== undefined) {
            let importFixers = PhpECSExporter.getImports(Object.keys(configuration.fixers), options);
            importFixers.forEach((fixerName: string): void => {
                lines.push('use ' + fixerName + ';');
            });
        }

        lines.push('use Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator;');
        lines.push('use Symplify\\EasyCodingStandard\\Configuration\\Option;');
        if (configuration.fixerSets !== undefined) {
            lines.push('use Symplify\\EasyCodingStandard\\ValueObject\\Set\\SetList;');
        }
        lines.push('');
        lines.push('return static function (ContainerConfigurator $containerConfigurator): void {');
        lines.push(INDENT + '$parameters = $containerConfigurator->parameters();');

        if (configuration.risky) {
            lines.push(INDENT + '// risky are allowed, though there is no setting in ECS.');
        }
        if (configuration.whitespace !== undefined) {
            if (configuration.whitespace.indent !== undefined) {
                lines.push(INDENT + '$parameters->set(Option::INDENTATION,' + toPhp(configuration.whitespace.indent) + ');');
            }
            if (configuration.whitespace.lineEnding !== undefined) {
                lines.push(INDENT + '$parameters->set(Option::LINE_ENDING,' + toPhp(configuration.whitespace.lineEnding) + ');');
            }
        }

        lines.push(INDENT + '$parameters->set(Option::PATHS, [');
        lines.push(INDENT + INDENT + '__DIR__ . \'/src\',');
        lines.push(INDENT + INDENT + '__DIR__ . \'/tests\',');
        lines.push(INDENT + ']);');
        lines.push('');

        lines.push(INDENT + '$parameters->set(Option::EXCLUDE_PATHS, [');
        lines.push(INDENT + INDENT + '__DIR__ . \'/vendor\',');
        lines.push(INDENT + ']);');
        lines.push('');

        if (configuration.fixerSets !== undefined) {
            lines.push(INDENT + '$parameters->set(Option::SETS, [');
            lines.push(INDENT + INDENT + '// @TODO must be reviewed manually, as preset names differ');
            configuration.fixerSets.forEach((fixerSetName: string): void => {
                if (fixerSetName.charAt(0) === '-') {
                    throw new Error("easy-coding-standard doesn't support subtracting presets.\nYour only option is to check the 'Expand presets' checkbox");
                }
                lines.push(INDENT + INDENT + 'SetList::' + setNameToConst(fixerSetName.substr(1)) + ',');
            });
            lines.push(INDENT + ']);');
            lines.push('');
        }
        if (configuration.fixers !== undefined) {
            lines.push(INDENT + '$services = $containerConfigurator->services();');
            Object.keys(configuration.fixers).forEach((fixerName: string): void => {
                const fixer = options.version.getFixerByName(fixerName);
                if (fixer === null) {
                    return;
                }
                if (options.exportFixerDescriptions) {
                    let comment = fixer.summary.length === 0 ? fixer.description : fixer.summary;
                    if (comment.length > 0) {
                        lines.push(INDENT + '// ' + comment.replace(/\r\n?/g, ' ').replace(/\?>/g, '? >'));
                    }
                }
                const fixerConfiguration = (<{ [fixerName: string]: boolean | object }>configuration.fixers)[fixerName];
                let fixerUsedName = options.importFixerClasses ? PhpECSExporter.getImportedName(fixer.fullClassName) : fixer.fullClassName;
                if (typeof fixerConfiguration === 'boolean') {
                    lines.push(INDENT + '$services->set(' + fixerUsedName + '::class);');
                } else {
                    lines.push(INDENT + '$services->set(' + fixerUsedName + '::class)');
                    lines.push(INDENT + '         ' + '->call(\'configure\', [' + toPhp(fixerConfiguration) + ']);');
                }
            });
        }
        lines.push('\};\n');
        return lines.join(LINE_ENDING);
    }

    private static getImportedName(classname: string): string {
        let namespaces: string[] = classname.split('\\');
        return namespaces[namespaces.length - 1];
    }

    private static getImports(fixers: any, options: any): any {
        let imports: string[] = [];
        fixers.forEach((fixerName: string): void => {
            const fixer = options.version.getFixerByName(fixerName);
            if (fixer !== null) {
                imports.push(fixer.fullClassName);
            }
        });
        return imports.sort();
    }
}
