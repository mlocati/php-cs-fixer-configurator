import ExporterInterface, { RenderOptions } from "./ExporterInterface";
import { SerializedConfigurationInterface } from "../Configuration";
import { supportedFixerSets } from "../ExportImport/LaravelPint";

export default class LaravelPintExporter implements ExporterInterface {
    readonly handle: string = 'laravel-pint';

    readonly language: string = 'json';

    readonly name: string = 'Laravel Pint';

    readonly supportConfiguringWhitespace: boolean = false;

    readonly supportFixerDescriptions: boolean = false;

    render(configuration: SerializedConfigurationInterface, options: RenderOptions): string {
        const converted: { preset: string | undefined, rules: undefined | object } = {
            preset: undefined,
            rules: configuration.fixers
        };

        if (configuration.fixerSets !== undefined) {
            if (configuration.fixerSets.length > 1) {
                throw new Error('Laravel Pint supports up to 1 preset: try expanding the presets.');
            }
            if (!supportedFixerSets.has(configuration.fixerSets[0])) {
                throw new Error(`Laravel Pint only supports the following presets:\n- ${Array.from(supportedFixerSets.keys()).join('\n- ')}\n\nTry expanding the preset.`);
            }
            converted.preset = supportedFixerSets.get(configuration.fixerSets[0]);
        }

        return JSON.stringify(converted, null, 4);
    }

}