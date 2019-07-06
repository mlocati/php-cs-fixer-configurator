import ExporterInterface, { RenderOptions } from "./ExporterInterface";
import { SerializedConfigurationInterface } from "../Configuration";
import jsyaml from 'js-yaml';

export default class YamlExporter implements ExporterInterface {

    readonly handle: string = 'yaml';

    readonly name: string = 'YAML';

    readonly language: string = 'yaml';

    readonly supportConfiguringWhitespace: boolean = true;

    readonly supportFixerDescriptions: boolean = true;

    render(configuration: SerializedConfigurationInterface, options: RenderOptions): string {
        const INDENT: string = '    ';
        const dumpOptions = { indent: INDENT.length };
        if (options.exportFixerDescriptions === false || !configuration.fixers || Object.keys(configuration.fixers).length === 0) {
            return jsyaml.safeDump(configuration, dumpOptions);
        }
        const fixers = <{ [fixerName: string]: boolean | object }>configuration.fixers;
        delete configuration.fixers;
        try {
            let result: string = jsyaml.safeDump(configuration, dumpOptions);

            result = result.replace(/\s+$/, '') + '\nfixers:\n';
            Object.keys(fixers).forEach((fixerName: string): void => {
                const fixer = options.version.getFixerByName(fixerName);
                if (fixer !== null) {
                    let comment = fixer.summary.length === 0 ? fixer.description : fixer.summary;
                    if (comment.length !== 0) {
                        result += '    # ' + comment.replace(/\r?\n/g, ' ') + '\n';
                    }
                }
                const singleFixerDetails: any = {};
                singleFixerDetails[fixerName] = fixers[fixerName];
                result += INDENT + <string>jsyaml.safeDump(singleFixerDetails, dumpOptions).replace(/\s+$/, '').replace(/\r?\n/g, '\n' + INDENT) + '\n';
            });
            return result;
        } finally {
            configuration.fixers = fixers;
        }
    }
}
