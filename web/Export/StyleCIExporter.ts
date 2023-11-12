import ExporterInterface, { RenderOptions } from "./ExporterInterface";
import { SerializedConfigurationInterface } from "../Configuration";
import jsyaml from 'js-yaml';

export default class StyleCIExporter implements ExporterInterface {

    readonly handle: string = 'style_ci';

    readonly name: string = 'StyleCI-like';

    readonly language: string = 'yaml';

    readonly supportConfiguringWhitespace: boolean = false;

    readonly supportFixerDescriptions: boolean = false;

    render(configuration: SerializedConfigurationInterface, options: RenderOptions): string {
        return jsyaml.safeDump(this.convertConfiguration(configuration), null, 4);
    }

    protected convertConfiguration(configuration: SerializedConfigurationInterface): object {
        let converted: any = {};
        if (configuration.risky) {
            converted.risky = true;
        }
        switch (configuration.fixerSets === undefined ? 0 : configuration.fixerSets.length) {
            case 0:
                break;
            case 1:
                converted.preset = (<string[]>configuration.fixerSets)[0].substr(1);
                break;
            default:
                throw new Error('StyleCI supports up to 1 preset');
        }
        if (configuration.fixers !== undefined) {
            converted.enabled = [];
            converted.disabled = [];
            Object.keys(configuration.fixers).forEach((fixerName: string): void => {
                const fixerData = (<{ [fixerName: string]: boolean | object }>configuration.fixers)[fixerName];
                if (fixerData === true) {
                    converted.enabled.push(fixerName)
                } else if (fixerData === false) {
                    converted.disabled.push(fixerName);
                } else {
                    throw new Error('StyleCI does not support configured fixers');
                }
            });
        }
        if (Object.keys(converted).length === 0) {
            return converted;
        }
        if (converted.enabled.length === 0) {
            delete converted.enabled;
        }
        if (converted.disabled.length === 0) {
            delete converted.disabled;
        }
        return converted;
    }
}
