import ExporterInterface, { RenderOptions } from "./ExporterInterface";
import { SerializedConfigurationInterface } from "../Configuration";

export default class JsonExporter implements ExporterInterface {

    readonly handle: string = 'json';

    readonly name: string = 'JSON';

    readonly language: string = 'json';

    readonly supportConfiguringWhitespace: boolean = true;

    readonly supportFixerDescriptions: boolean = false;

    render(configuration: SerializedConfigurationInterface, options: RenderOptions): string {
        return JSON.stringify(configuration, null, 4);
    }
}
