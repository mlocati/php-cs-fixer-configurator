import { SerializedConfigurationInterface } from "../Configuration";

export default abstract class ObjectImporter {

    public parse(serialized: string): SerializedConfigurationInterface {
        let obj: any = this.unserialize(serialized);
        return this.parseUnserialized(obj);
    }

    protected abstract unserialize(serialized: string): any;

    protected parseUnserialized(unserialized: any): SerializedConfigurationInterface {
        if (unserialized === null) {
            throw new Error('The serialized configuration can\'t be null');
        }
        if (typeof unserialized !== 'object') {
            throw new Error(`The serialized configuration is of type ${typeof unserialized} instead of an object`);
        }
        const result: SerializedConfigurationInterface = {};
        switch (typeof unserialized.version) {
            case 'undefined':
                break;
            case 'string':
                if (!unserialized.version.match(/^\d+(.\d+){1,2}$/)) {
                    throw new Error(`The serialized version ${unserialized.version} is not valid`);
                }
                result.version = unserialized.version;
                break;
            case 'number':
                result.version = (<number>unserialized.version).toString();
                break;
            default:
                throw new Error(`The serialized configuration contains the "version" field which is not a string but a ${typeof unserialized.version}`);
        }
        switch (typeof unserialized.whitespace) {
            case 'undefined':
                break;
            case 'object':
                if (unserialized.whitespace === null) {
                    throw new Error(`The serialized configuration contains the "whitespace" field which is null`);
                }
                switch (typeof unserialized.whitespace.indent) {
                    case 'undefined':
                        break;
                    case 'string':
                        if (result.whitespace === undefined) {
                            result.whitespace = {};
                        }
                        result.whitespace.indent = unserialized.whitespace.indent;
                        break;
                    default:
                        throw new Error(`The serialized configuration contains the "whitespace.indent" field which is not a string but a ${typeof unserialized.whitespace.indent}`);
                }
                switch (typeof unserialized.whitespace.lineEnding) {
                    case 'undefined':
                        break;
                    case 'string':
                        if (result.whitespace === undefined) {
                            result.whitespace = {};
                        }
                        result.whitespace.lineEnding = unserialized.whitespace.lineEnding;
                        break;
                    default:
                        throw new Error(`The serialized configuration contains the "whitespace.lineEnding" field which is not a string but a ${typeof unserialized.whitespace.lineEnding}`);
                }
                break;
            default:
                throw new Error(`The serialized configuration contains the "whitespace" field which is not a object but a ${typeof unserialized.whitespace}`);
        }
        if (unserialized.fixerSets !== undefined) {
            if (!(unserialized.fixerSets instanceof Array)) {
                throw new Error(`The serialized configuration contains the "fixerSets" field which is not an array but a ${typeof unserialized.fixerSets}`);
            }
            unserialized.fixerSets.forEach((fixerSetName: any): void => {
                if (typeof fixerSetName !== 'string') {
                    throw new Error(`The serialized configuration contains the "fixerSets" field containing an element of type ${typeof fixerSetName} which should be a string`);
                }
                if (!fixerSetName.match(/^-?@\S+$/)) {
                    throw new Error(`The serialized configuration contains the "fixerSets" field containing "${fixerSetName}" which is not a name of a fixer set`);
                }
                if (result.fixerSets === undefined) {
                    if (fixerSetName.charAt(0) === '-') {
                        throw new Error(`The serialized configuration contains the "fixerSets" field containing "${fixerSetName}" which is a negated fixer set that may not be at the first position`);
                    }
                    result.fixerSets = [];
                }
                result.fixerSets.push(fixerSetName);
            });
        }
        if (unserialized.fixers !== undefined) {
            if (typeof unserialized.fixers !== 'object') {
                throw new Error(`The serialized configuration contains the "fixers" field which is not an object but a ${typeof unserialized.fixers}`);
            }
            if (typeof unserialized.fixers === null) {
                throw new Error(`The serialized configuration contains the "fixers" field which is not an object but it's null`);
            }
            Object.keys(unserialized.fixers).forEach((fixerName: string): void => {
                if (!fixerName.match(/^\S+$/)) {
                    throw new Error(`The serialized configuration contains the "fixers" field containing "${fixerName}" which is not a name of a fixer`);
                }
                const fixerConfiguration = unserialized.fixers[fixerName];
                if (fixerConfiguration === null) {
                    throw new Error(`The "${fixerName}" fixer name contained in the "fixers" field of the serialized configuration has an invalid (null) value`);
                }
                if (fixerConfiguration !== true && fixerConfiguration !== false && typeof fixerConfiguration !== 'object') {
                    throw new Error(`The "${fixerName}" fixer name contained in the "fixers" field of the serialized configuration has an invalid (${typeof fixerConfiguration}) value`);
                }
                if (result.fixers === undefined) {
                    result.fixers = {};
                }
                result.fixers[fixerName] = fixerConfiguration;
            });
        }
        return result;
    }
}
/*
        if (typeof v.fixers === 'object') {
            Object.keys(v.fixers).forEach((fixerName: string) => {
                let value = v.fixers[fixerName];
                if (typeof value === 'boolean' || typeof value === 'object') {
                    configuration.fixers[fixerName] = value;
                }
            });
        }
        return configuration;
    }
}
*/