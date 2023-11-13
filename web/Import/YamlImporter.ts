import ImporterInterface from "./ImporterInterface";
import jsyaml from 'js-yaml';
import ObjectImporter from "./ObjectImporter";

export default class YamlImporter extends ObjectImporter implements ImporterInterface {

    readonly handle: string = 'yaml';

    readonly name: string = 'YAML';

    readonly isGeneric: boolean = true;

    readonly pastePlaceholder: string = '';

    protected unserialize(serialized: string): any {
        try {
            return jsyaml.safeLoad(serialized)
        } catch {
            throw new Error('The YAML is invalid');
        }
    }
}
