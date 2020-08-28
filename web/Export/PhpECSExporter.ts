import ExporterInterface, { RenderOptions } from "./ExporterInterface";
import { SerializedConfigurationInterface } from "../Configuration";
import { toPhp, setNameToConst } from "../Utils";

export default class PhpECSExporter implements ExporterInterface {

    readonly handle: string = 'php-ecs';

    readonly name: string = 'ecs.php';

    readonly language: string = 'php';

    readonly supportConfiguringWhitespace: boolean = true;

    readonly supportFixerDescriptions: boolean = true;

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
            'use Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator;',
            'use Symplify\\EasyCodingStandard\\Configuration\\Option;',
            '',
            'return static function (ContainerConfigurator $containerConfigurator): void {',
            INDENT + '$parameters = $containerConfigurator->parameters();',
        ];
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
            lines.push(INDENT + INDENT + '// @TODO must be reviewed manually, as names differ and there is no set-exclude in easy-coding-standard');
            configuration.fixerSets.forEach((fixerSetName: string): void => {
                if (fixerSetName.charAt(0) === '-') {
                    lines.push(INDENT + INDENT + '// exclude: SetList::' + fixerSetName.substr(2) + ',');
                } else {
                    lines.push(INDENT + INDENT + 'SetList::' + setNameToConst(fixerSetName.substr(1)) + ',');
                }
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
                if (typeof fixerConfiguration === 'boolean') {
                    lines.push(INDENT + '$services->set(' + fixer.fullClassName + '::class);');
                } else {
                    lines.push(INDENT + '$services->set(' + fixer.fullClassName + '::class)');
                    lines.push(INDENT + INDENT + '->call(\'configure\', [' + toPhp(fixerConfiguration) + ']);');
                }
            });
        }
        lines.push('\};\n');
        return lines.join(LINE_ENDING);
    }
}
