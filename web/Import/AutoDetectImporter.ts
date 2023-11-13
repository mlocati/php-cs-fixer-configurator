import ImporterInterface from "./ImporterInterface";
import JsonImporter from "./JsonImporter";
import { SerializedConfigurationInterface } from "../Configuration";
import YamlImporter from "./YamlImporter";

interface FoundImporter {
    configuration: SerializedConfigurationInterface;
    importer: ImporterInterface;
}

export default class AutoDetectImporter implements ImporterInterface {

    private readonly actualImporters: ImporterInterface[];

    readonly handle: string = 'auto-detect';

    readonly name: string = 'Auto-detect';

    readonly isGeneric: boolean = false;

    readonly pastePlaceholder: string = "Paste here the state in any of the supported formats.\n\nWe'll try to auto - detect its format.";

    public constructor(actualImporters: ImporterInterface[]) {
        this.actualImporters = actualImporters;
    }
    public parse(serialized: string): SerializedConfigurationInterface {
        var found: FoundImporter | undefined;
        this.actualImporters.some((importer: ImporterInterface) => {
            if (importer instanceof AutoDetectImporter) {
                return false;
            }
            var configuration: SerializedConfigurationInterface;
            try {
                configuration = importer.parse(serialized);
            } catch {
                return false;
            }
            if (found === undefined || found.importer.isGeneric && !importer.isGeneric) {
                found = { configuration: configuration, importer: importer };
                return false;
            }
            if (importer.isGeneric && !found.importer.isGeneric) {
                return false;
            }
            found = undefined;
            return true;
        });
        if (found === undefined) {
            throw new Error('Automatic detection failed. Try to use a specific format.');
        }
        return found.configuration;
    }
}
