import FixerOrSetInterface from "./FixerOrSetInterface";
import Version from "./Version";
import VersionComparison from "./VersionComparison"

const CHUNK_SEPARATOR: string = '|';
const KEYVALUE_SEPARATOR: string = ':';
const CHUNK_VERSION: string = 'version';
const CHUNK_CONFIGURING: string = 'configurator';
const CHUNK_FIXER: string = 'fixer';
const CHUNK_FIXERSET: string = 'fixerset';
const CHUNK_COMPARISON: string = 'compare';

export class HashData {
    public majorMinorVersion: string = '';
    public configuring: boolean = false;
    public fixerOrSetName: string = '';
    public versionComparisonThreeDotNotation: string = '';
    public static create(
        version: Version,
        configuring: boolean = false,
        fixerOrSet: FixerOrSetInterface | null = null,
        versionComparison: VersionComparison | null = null
    ): HashData {
        let hashData = new HashData();
        hashData.majorMinorVersion = (fixerOrSet === null ? version : fixerOrSet.version).majorMinorVersion;
        hashData.configuring = configuring;
        hashData.fixerOrSetName = fixerOrSet === null ? '' : fixerOrSet.name;
        hashData.versionComparisonThreeDotNotation = versionComparison === null ? '' : versionComparison.threeDotNotation;
        return hashData;
    }
}

function fromLocationHash(hash: string): HashData {
    let hashData: HashData = new HashData();
    hash.split(CHUNK_SEPARATOR).forEach((chunk: string) => {
        if (chunk.length === 0) {
            return;
        }
        let keyValueSeparatorPosition: number = chunk.indexOf(KEYVALUE_SEPARATOR);
        let key: string = keyValueSeparatorPosition < 0 ? chunk : chunk.substr(0, keyValueSeparatorPosition);
        let value: string | null = keyValueSeparatorPosition < 0 ? null : chunk.substr(keyValueSeparatorPosition + 1);
        switch (key) {
            case CHUNK_VERSION:
                if (value !== null && value.match(/^\d+\.\d+$/)) {
                    hashData.majorMinorVersion = value;
                } else {
                    console.warn(`Invalid version specification in URL hash: ${value}`);
                }
                break;
            case CHUNK_CONFIGURING:
                if (value === null) {
                    hashData.configuring = true;
                } else {
                    console.warn('Invalid configurator specification in URL hash');
                }
                break;
            case CHUNK_FIXER:
                if (value !== null && value.match(/^\w+$/)) {
                    if (hashData.fixerOrSetName.length === 0) {
                        hashData.fixerOrSetName = value;
                    } else {
                        console.warn(`Duplicated fixer/fixer-set specification in URL hash: ${value}`);
                    }
                } else {
                    console.warn(`Invalid fixer specification in URL hash: ${value}`);
                }
                break;
            case CHUNK_FIXERSET:
                if (value !== null && value.match(/^@\w+$/)) {
                    if (hashData.fixerOrSetName.length === 0) {
                        hashData.fixerOrSetName = value;
                    } else {
                        console.warn(`Duplicated fixer/fixer-set specification in URL hash: ${value}`);
                    }
                } else {
                    console.warn(`Invalid fixer set specification in URL hash: ${value}`);
                }
                break;
            case CHUNK_COMPARISON:
                if (value !== null && value.match(/^\d+\.\d+\.\.\.\d+\.\d+$/)) {
                    hashData.versionComparisonThreeDotNotation = value;
                }
                else {
                    console.warn(`Invalid comparison specification in URL hash: ${value}`);
                }
                break;
            default:
                console.warn(`Unsupported chunk URL hash: ${key}`);
                return;
        }
    });
    return hashData;
}

function toHash(hashData: HashData): string {
    let chunks: string[] = [];
    if (hashData.majorMinorVersion.length !== 0) {
        chunks.push(CHUNK_VERSION + KEYVALUE_SEPARATOR + hashData.majorMinorVersion);
    }
    if (hashData.configuring === true) {
        chunks.push(CHUNK_CONFIGURING);
    }
    if (hashData.fixerOrSetName.length !== 0) {
        if (hashData.fixerOrSetName.charAt(0) === '@') {
            chunks.push(CHUNK_FIXERSET + KEYVALUE_SEPARATOR + hashData.fixerOrSetName);
        } else {
            chunks.push(CHUNK_FIXER + KEYVALUE_SEPARATOR + hashData.fixerOrSetName);
        }
    }
    if (hashData.versionComparisonThreeDotNotation.length !== 0) {
        chunks.push(CHUNK_COMPARISON + KEYVALUE_SEPARATOR + hashData.versionComparisonThreeDotNotation);
    }
    return chunks.join(CHUNK_SEPARATOR);
}

export function fromWindowLocation(win: Window = window): HashData {
    let hash: string = decodeURIComponent(win.location.hash.replace(/^#/, ''));
    return fromLocationHash(hash);
}

export function toWindowLocation(hasdData: HashData, win: Window = window): void {
    let hash: string = toHash(hasdData);
    if (hash.length === 0) {
        try {
            win.history.replaceState(null, '', ' ');
        } catch (e) {
            let x = win.document.body.scrollLeft,
                y = win.document.body.scrollTop;
            win.location.hash = hash;
            win.document.body.scrollLeft = x;
            win.document.body.scrollTop = y;
        }
    } else {
        win.location.hash = hash;
    }
}
