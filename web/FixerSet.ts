import Fixer from './Fixer';
import Version from './Version';
import FixerOrSetInterface from './FixerOrSetInterface';
import { PFCFixerSet } from './PCFDataDefinitions';

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

    private _rawData?: PFCFixerSet;

    private readonly _extendNames: string[];

    private _directFixers?: FixerSetFixer[];

    public get directFixers(): FixerSetFixer[] {
        if (this._directFixers === undefined) {
            this.parseRawData();
        }
        return <FixerSetFixer[]>this._directFixers;
    }

    private _fixers?: FixerSetFixer[];

    /**
     * The fixers and their (optional) configuration.
     */
    public get fixers(): FixerSetFixer[] {
        if (this._fixers === undefined) {
            const result: FixerSetFixer[] = ([] as FixerSetFixer[]).concat(this.directFixers);
            this._extendNames.forEach((name: string): void => {
                const fixerSet = this.version.getFixerSetByName(name);
                if (fixerSet !== null) {
                    fixerSet.fixers.forEach((fixer: FixerSetFixer): void => {
                        if (!result.some((already: FixerSetFixer): boolean => {
                            return already.fixer === fixer.fixer;
                        })) {
                            result.push(fixer);
                        }
                    });
                }
            });
            result.sort((a: FixerSetFixer, b: FixerSetFixer): number => {
                if (a.fixer.name < b.fixer.name) {
                    return -1;
                }
                if (a.fixer.name > b.fixer.name) {
                    return 1;
                }
                return 0;
            });
            this._fixers = result;
        }
        return this._fixers;
    }

    public usesFixer(fixer: Fixer, onlyDirectly: boolean = false): boolean
    {
        if (this._rawData !== undefined) {
            if (this._rawData.rules.hasOwnProperty(fixer.name)) {
                return true;
            }
        } else if(this.fixers.some((item: FixerSetFixer): boolean => item.fixer === fixer)) {
            return true;
        }
        if (onlyDirectly) {
            return false;
        }
        if (this._extendNames.some((name: string): boolean => {
            const fixerSet = this.version.getFixerSetByName(name);
            return fixerSet !== null && fixerSet.usesFixer(fixer, false) ? true : false;
        })) {
            return true;
        }

        return false;
    }

    private _risky?: boolean;

    public get risky(): boolean {
        if (this._risky === undefined) {
            this.parseRawData();
        }
        return <boolean>this._risky;
    }

    private _description?: string;

    public get description(): string {
        if (this._description === undefined) {
            this.parseRawData();
        }
        return <string>this._description;
    }

    /**
     * If this fixer set is deprecated, list of the names of the fixer sets that should be used instead.
     * null if not deprecated.
     */
    public readonly deprecated_switchToNames: string[]|null;

    /**
     * If this fixer set is deprecated, list of the fixer setss that should be used instead.
     * null if not deprecated.
     * undefined is still not resolved
     */
    private _deprecated_switchTo?: FixerSet[]|null;

    /**
     * If this fixer is deprecated, list of the names of the fixers that should be used instead.
     * null if not deprecated.
     */
    public get deprecated_switchTo(): FixerSet[]|null {
        if (this._deprecated_switchTo !== undefined) {
            return this._deprecated_switchTo;
        }
        if (this.deprecated_switchToNames === null) {
            this._deprecated_switchTo = null;
            return this._deprecated_switchTo;
        }
        const fixerSets: FixerSet[] = [];
        (<string[]>this.deprecated_switchToNames).forEach((fixerSetName: string) => {
            const fixerSet: FixerSet | null = this.version.getFixerSetByName(fixerSetName);
            if (fixerSet === null) {
                throw new Error(`Unable to find a fixer set named ${fixerSetName}`);
            }
            fixerSets.push(fixerSet);
        });
        this._deprecated_switchTo = fixerSets;
        return this._deprecated_switchTo;
    }

    /**
     * The version where this fixer set is defined.
     */
    public readonly version: Version;

    constructor(version: Version, name: string, rawData: PFCFixerSet) {
        this.version = version;
        this.name = name;
        this.uniqueKey = name + '@' + version.fullVersion;
        this._rawData = rawData;
        this._extendNames = rawData.extends === undefined ? [] : rawData.extends;
        if (rawData.deprecated_switchTo === undefined) {
            this.deprecated_switchToNames = null;
            this._deprecated_switchTo = null;
        } else {
            this.deprecated_switchToNames = rawData.deprecated_switchTo;
            this.deprecated_switchToNames.sort((a: string, b: string): number => {
                return a < b ? -1 : a > b ? 1 : 0;
            });
        }
    }

    private parseRawData(): void {
        const fixers: FixerSetFixer[] = [];
        const rawData: PFCFixerSet = <PFCFixerSet>this._rawData;
        Object.keys(rawData.rules).forEach((fixerName: string): void => {
            const fixer: Fixer | null = this.version.getFixerByName(fixerName);
            if (fixer === null) {
                throw new Error(`Unable to find the fixer ${fixerName}`);
            }
            fixers.push(new FixerSetFixer(fixer, rawData.rules[fixerName]));
        });
        fixers.sort((a: FixerSetFixer, b: FixerSetFixer) => {
            return a.fixer.name < b.fixer.name ? -1 : a.fixer.name > b.fixer.name ? 1 : 0;
        });
        let risky: boolean;
        if (rawData.risky !== undefined) {
            risky = rawData.risky;
        } else {
            risky = false;
            fixers.some((fixer: FixerSetFixer) => {
                risky = fixer.fixer.risky;
                return risky;
            });
        }
        this._directFixers = fixers;
        this._risky = risky;
        this._description = rawData.description === undefined ? '' : rawData.description;
        delete this._rawData;
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
