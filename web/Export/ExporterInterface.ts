import { SerializedConfigurationInterface } from "../Configuration";
import Version from "../Version";

export interface RenderOptions {
    readonly version: Version;
    readonly exportFixerDescriptions: boolean,
}

interface ExporterInterface {
    /**
     * The unique handle of the exporter.
     */
    readonly handle: string;

    /**
     * The name of the exporter.
     */
    readonly name: string;

    /**
     * The language identifier of the exported code.
     */
    readonly language: string;

    /**
     * Does this exporter support exporting whitespace configuration (indentation, line endings)?
     */
    readonly supportConfiguringWhitespace: boolean;

    /**
     * Does this exporter support exporting fixer descriptions?
     */
    readonly supportFixerDescriptions: boolean;

    /**
     * Generate the text representing the configuration
     */
    render(configuration: SerializedConfigurationInterface, options: RenderOptions): string;
}

export default ExporterInterface;
