import ImporterInterface from "./ImporterInterface";
import ObjectImporter from "./ObjectImporter";

export default class JsonImporter extends ObjectImporter implements ImporterInterface {

    readonly handle: string = 'json';

    readonly name: string = 'JSON';

    readonly pastePlaceholder: string = '';

    protected unserialize(serialized: string): any {
        try {
            return JSON.parse(serialized);
        } catch {
            throw new Error('The JSON is invalid');
        }
    }
}
