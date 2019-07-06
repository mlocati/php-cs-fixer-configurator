import Version from "./Version";

/**
 * Represents a fixer and/or a fixer set and all its data.
 */
interface FixerOrSetInterface {
    readonly type: string;
    readonly uniqueKey: string;
    readonly name: string;
    readonly version: Version;
}

export default FixerOrSetInterface;
