import ExporterInterface, { RenderOptions } from "./ExporterInterface";
import { SerializedConfigurationInterface } from "../Configuration";
import { toPhp } from "../Utils";

export default class PhpCsExporter implements ExporterInterface {

    readonly handle: string = 'php-cs';

    readonly name: string = '.php_cs / .php_cs.dist file';

    readonly language: string = 'php';

    readonly supportConfiguringWhitespace: boolean = true;

    readonly supportFixerDescriptions: boolean = true;

    /**
     * Generate the text representing the configuration
     * @param version 
     * @param configuration 
     * @param keepMetadata 
     */
    render(configuration: SerializedConfigurationInterface, options: RenderOptions): string {
        const INDENT = '    ';
        const LINE_ENDING = '\n';
        let lines: string[] = [
            '<?php',
            '/*',
            ' * This document has been generated with',
            ' * https://mlocati.github.io/php-cs-fixer-configurator/#version:' + configuration.version + '|configurator',
            ' * you can change this configuration by importing this file.',
            ' */',
            '$config = new PhpCsFixer\\Config();',
            'return $config'
        ];
        if (configuration.risky) {
            lines.push(INDENT + '->setRiskyAllowed(true)');
        }
        if (configuration.whitespace !== undefined) {
            if (configuration.whitespace.indent !== undefined) {
                lines.push(INDENT + '->setIndent(' + toPhp(configuration.whitespace.indent) + ')');
            }
            if (configuration.whitespace.lineEnding !== undefined) {
                lines.push(INDENT + '->setLineEnding(' + toPhp(configuration.whitespace.lineEnding) + ')');
            }
        }
        lines.push(INDENT + '->setRules([');
        if (configuration.fixerSets !== undefined) {
            configuration.fixerSets.forEach((fixerSetName: string): void => {
                if (fixerSetName.charAt(0) === '-') {
                    lines.push(INDENT + INDENT + toPhp(fixerSetName.substr(1)) + ' => false,');
                } else {
                    lines.push(INDENT + INDENT + toPhp(fixerSetName) + ' => true,');
                }
            });
        }
        if (configuration.fixers !== undefined) {
            const fixerNames = Object.keys(configuration.fixers);
            fixerNames.sort();
            fixerNames.forEach((fixerName: string): void => {
                const fixerConfiguration = (<{ [fixerName: string]: boolean | object }>configuration.fixers)[fixerName];
                if (options.exportFixerDescriptions) {
                    const fixer = options.version.getFixerByName(fixerName);
                    if (fixer !== null) {
                        let comment = fixer.summary.length === 0 ? fixer.description : fixer.summary;
                        if (comment.length > 0) {
                            lines.push(INDENT + INDENT + '// ' + comment.replace(/\r\n?/g, ' ').replace(/\?>/g, '? >'));
                        }
                    }
                }
                lines.push(INDENT + INDENT + toPhp(fixerName) + ' => ' + toPhp(fixerConfiguration) + ',');
            });
        }
        lines.push(INDENT + '])');
        lines.push(INDENT + '->setFinder(PhpCsFixer\\Finder::create()');
        lines.push(INDENT + INDENT + '->in(__DIR__)');
        lines.push(INDENT + ')');
        lines.push(';');
        lines.push('');
        return lines.join(LINE_ENDING);
    }
}
