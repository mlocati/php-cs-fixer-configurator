import { SerializedConfigurationInterface } from "../Configuration";

interface ImporterInterface {
    /**
     * The unique handle of the importer.
     */
    readonly handle: string;

    /**
     * The name of the importer.
     */
    readonly name: string;

    /**
     * The text to be displayed in the import dialog.
     */
    readonly pastePlaceholder: string;

    /**
     * Parse the serialized data.
     * @param serialized the data to be parsed
     * @throws in case the data can't be parsed
     */
    parse(serialized: string): SerializedConfigurationInterface;
}

export default ImporterInterface;
