import Fixer from './Fixer';
import Version from './Version';
import FixerOrSetInterface from './FixerOrSetInterface';

/**
 * Represents a PHP-CS-Fixer set of fixers and all its data.
 */
export default class FixerSet implements FixerOrSetInterface {

    public readonly type: string = 'fixer set';

    public readonly uniqueKey: string;

    /**
     * The name of the fixer set.
     */
    public readonly name: string;

    private _rawData?: { [fixerName: string]: object | null };

    private _fixers?: FixerSetFixer[];

    /**
     * The fixers and their (optional) configuration.
     */
    public get fixers(): FixerSetFixer[] {
        if (this._fixers !== undefined) {
            return this._fixers;
        }
        const fixers: FixerSetFixer[] = [];
        Object.keys(<{ [fixerName: string]: object | null }>this._rawData).forEach((fixerName: string): void => {
            const fixer: Fixer | null = this.version.getFixerByName(fixerName);
            if (fixer === null) {
                throw new Error(`Unable to find the fixer ${fixerName}`);
            }
            fixers.push(new FixerSetFixer(fixer, (<{ [fixerName: string]: object | null }>this._rawData)[fixerName]));
        });
        fixers.sort((a: FixerSetFixer, b: FixerSetFixer) => {
            return a.fixer.name < b.fixer.name ? -1 : a.fixer.name > b.fixer.name ? 1 : 0;
        });
        this._fixers = fixers;
        delete this._rawData;
        return this._fixers;
    }

    private _risky?: boolean;

    public get risky(): boolean {
        if (this._risky !== undefined) {
            return this._risky;
        }
        let risky: boolean = false;
        this.fixers.some((fixer: FixerSetFixer) => {
            risky = fixer.fixer.risky;
            return risky;
        })
        this._risky = risky;
        return this._risky;
    }

    /**
     * The version where this fixer set is defined.
     */
    public readonly version: Version;

    constructor(version: Version, name: string, fixers: { [fixerName: string]: object | null }) {
        this.version = version;
        this.name = name;
        this.uniqueKey = name + '@' + version.fullVersion;
        this._rawData = fixers;
    }
}

export class FixerSetFixer {
    public readonly fixer: Fixer;
    public readonly configuration: object | null;

    constructor(fixer: Fixer, configuration: object | null) {
        this.fixer = fixer;
        this.configuration = configuration;
    }
}
