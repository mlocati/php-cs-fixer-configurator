import ImporterInterface from "./ImporterInterface";
import ObjectImporter from "./ObjectImporter";
import { supportedFixerSets } from "../ExportImport/LaravelPint";

export default class LaravelPintImporter extends ObjectImporter implements ImporterInterface {

    readonly handle: string = 'laravel-pint';

    readonly name: string = 'Laravel Pint';

    readonly isGeneric: boolean = false;

    readonly pastePlaceholder: string = '';

    protected unserialize(serialized: string): any {
        let unserialized: any;
        try {
            unserialized = JSON.parse(serialized);
        } catch {
            throw new Error('The JSON is invalid');
        }
        if (typeof unserialized !== 'object' || unserialized === null || unserialized instanceof Array) {
            throw new Error('The JSON does not represent an object');
        }
        const parsed: any = {};
        if (unserialized.hasOwnProperty('preset')) {
            if (typeof unserialized.preset !== 'string' || unserialized.preset.length === 0) {
                throw new Error('The "preset" property should be a non-empty string');
            }
            supportedFixerSets.forEach((value: string, key: string) => {
                if (value === unserialized.preset) {
                    parsed.fixerSets = [key];
                }
            });
            if (!parsed.hasOwnProperty('fixerSets')) {
                throw new Error(`The preset "${unserialized.preset}" is not supported`);
            }
            delete unserialized.preset;
        }
        if (unserialized.hasOwnProperty('rules')) {
            if (typeof unserialized.rules !== 'object' || unserialized.rules === null || unserialized.rules instanceof Array) {
                throw new Error('The "rules" property should be an object');
            }
            parsed.fixers = unserialized.rules;
            delete unserialized.rules;
        }
        const unrecognizedKeys: string[] = Object.keys(unserialized);
        if (unrecognizedKeys.length !== 0) {
            throw new Error(`Unrecognized properties:\n- ${unrecognizedKeys.join('\n- ')}`);
        }
        return parsed;
    }
}
