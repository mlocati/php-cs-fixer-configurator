import ExporterInterface, { RenderOptions } from "./ExporterInterface";
import { SerializedConfigurationInterface } from "../Configuration";

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
                throw new Error('Laravel Pint supports up to 1 preset; Try to expand them');
            }

            if (!['@Symfony', '@PER', '@PSR12'].includes(configuration.fixerSets[0])) {
                throw new Error('Laravel Pint only supports the following presets: psr12, symfony, per; Try to expand them');
            }

            converted.preset = configuration.fixerSets[0].substr(1).toLowerCase();
        }

        return JSON.stringify(converted, null, 4);
    }

}