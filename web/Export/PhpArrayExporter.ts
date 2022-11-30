import ExporterInterface, { RenderOptions } from "./ExporterInterface";
import { SerializedConfigurationInterface } from "../Configuration";
import { toPhp } from "../Utils";

export default class PhpArrayExporter implements ExporterInterface {

    readonly handle: string = 'php-array';

    readonly name: string = 'PHP array';

    readonly language: string = 'php';

    readonly supportConfiguringWhitespace: boolean = false;

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
            '/*',
            ' * This document has been generated with',
            ' * https://mlocati.github.io/php-cs-fixer-configurator/#version:' + configuration.version + '|configurator',
            ' * you can change this configuration by importing this file.',
            ' */',
            '[',
        ];
        if (configuration.fixerSets !== undefined) {
            configuration.fixerSets.forEach((fixerSetName: string): void => {
                if (fixerSetName.charAt(0) === '-') {
                    lines.push(INDENT + toPhp(fixerSetName.substr(1)) + ' => false,');
                } else {
                    lines.push(INDENT + toPhp(fixerSetName) + ' => true,');
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
                            lines.push(INDENT + '// ' + comment.replace(/\r\n?/g, ' ').replace(/\?>/g, '? >'));
                        }
                    }
                }
                lines.push(INDENT + toPhp(fixerName) + ' => ' + toPhp(fixerConfiguration) + ',');
            });
        }
        lines.push('];');
        lines.push('');
        return lines.join(LINE_ENDING);
    }
}
