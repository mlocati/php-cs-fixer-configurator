import axios, { AxiosResponse } from 'axios';
import Fixer from './Fixer';
import FixerSet from './FixerSet';
import * as PCF from './PCFDataDefinitions';

/**
 * The list of PHP-CS-Fixer versions available.
 * Undefined if not yet loaded.
 */
let versions: Version[] | undefined;

/**
 * Represents a PHP-CS-Fixer version and all its data.
 */
export default class Version {

    /**
     * The full PHP-CS-Fixer version.
     *
     * @example 1.2.3
     */
    public readonly fullVersion: string;

    /**
     * The major.minor PHP-CS-Fixer version.
     *
     * @example 1.2
     */
    public readonly majorMinorVersion: string;

    /**
     * Is this version already fully loaded?
     */
    private _loaded: boolean = false;

    /**
     * Is this version already fully loaded?
     */
    public get loaded(): boolean {
        return this._loaded;
    }

    /**
     * The indentation defined for this PHP-CS-Fixer version.
     * Undefined if the data is not yet loaded.
     */
    private _indent?: string;

    /**
     * Get the indentation defined for this PHP-CS-Fixer version.
     *
     * @throws if the data is not yet loaded
     */
    public get indent(): string {
        if (this.loaded === false) {
            throw new Error('Data not loaded.');
        }
        return <string>this._indent;
    }

    /**
     * The line ending character sequence defined for this PHP-CS-Fixer version.
     * Undefined if the data is not yet loaded.
     */
    private _lineEnding?: string;

    /**
     * Get the line ending character sequence defined for this PHP-CS-Fixer version.
     *
     * @throws if the data is not yet loaded
     */
    public get lineEnding(): string {
        if (this.loaded === false) {
            throw new Error('Data not loaded.');
        }
        return <string>this._lineEnding;
    }

    /**
     * The list of fixers (sorted by name) defined in this PHP-CS-Fixer version.
     * Undefined if the data is not yet loaded.
     */
    private _fixers?: Fixer[];

    /**
     * Get the list of fixers (sorted by name) defined in this PHP-CS-Fixer version.
     *
     * @throws if the data is not yet loaded
     */
    public get fixers(): Fixer[] {
        if (this.loaded === false) {
            throw new Error('Data not loaded.');
        }
        return (<Fixer[]>[]).concat(<Fixer[]>this._fixers);
    }

    /**
     * The list of fixer sets (sorted by name) defined in this PHP-CS-Fixer version.
     * Undefined if the data is not yet loaded.
     */
    private _fixerSets?: FixerSet[];

    /**
     * Get the list of fixer sets (sorted by name) defined in this PHP-CS-Fixer version.
     *
     * @throws if the data is not yet loaded
     */
    public get fixerSets(): FixerSet[] {
        if (this.loaded === false) {
            throw new Error('Data not loaded.');
        }
        return (<FixerSet[]>[]).concat(<FixerSet[]>this._fixerSets);
    }

    /**
     * The mapping from the fixer names and the fixer instances.
     * Empty if the data is not yet loaded
     */
    private readonly _fixersMap: { [fixerName: string]: Fixer } = {};

    /**
     * The mapping from the fixer set names and the fixer set instances.
     * Empty if the data is not yet loaded
     */
    private readonly _fixerSetsMap: { [fixerSetName: string]: FixerSet } = {};

    private _loadPromise: Promise<void> | null = null;

    /**
     * Initialize the instance.
     * @param fullVersion the full PHP-CS-Fixer version
     */
    constructor(fullVersion: string) {
        this.fullVersion = fullVersion;
        const matches = /^(\d+\.\d+)/.exec(fullVersion);
        this.majorMinorVersion = matches === null ? fullVersion : matches[1];
    }

    /**
     * Load the PHP-CS-Fixer version data
     */
    public load(): Promise<void> {
        if (this._loaded === true) {
            return new Promise<void>((resolve, reject): void => {
                resolve();
            });
        }
        if (this._loadPromise !== null) {
            return this._loadPromise;
        }
        this._loadPromise = new Promise<void>((resolve, reject) => {
            axios.get(`data/${this.fullVersion}.min.json`)
                .then((response: AxiosResponse) => {
                    this._loadPromise = null;
                    this.setPCFData(response.data);
                    resolve();
                })
                .catch((error) => {
                    this._loadPromise = null;
                    reject(error);
                })
                ;
        });
        return this._loadPromise;
    }

    /**
     * Set the PHP-CS-Fier data, marking this instance as loaded.
     */
    private setPCFData(data: PCF.PCFData): void {
        this._indent = data.indent;
        this._lineEnding = data.lineEnding;
        this._fixers = [];
        this._fixerSets = [];
        Object.keys(data.fixers).forEach((fixerName: string) => {
            const fixer: Fixer = new Fixer(this, fixerName, data.fixers[fixerName]);
            (<Fixer[]>this._fixers).push(fixer);
            this._fixersMap[fixerName] = fixer;
        });
        this._fixers.sort((a: Fixer, b: Fixer) => {
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        });
        Object.keys(data.sets).forEach((fixerSetName: string) => {
            const fixerSet: FixerSet = new FixerSet(this, fixerSetName, data.sets[fixerSetName]);
            (<FixerSet[]>this._fixerSets).push(fixerSet);
            this._fixerSetsMap[fixerSetName] = fixerSet;
        });
        this._fixerSets.sort((a: FixerSet, b: FixerSet) => {
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        });
        this._loaded = true;
    }

    /**
     * Get the list of available PHP-CS-Fixer versions data (without loading all their data).
     */
    public static getVersions(): Promise<Version[]> {
        return new Promise<Version[]>((resolve) => {
            if (versions !== undefined) {
                resolve(versions);
                return;
            }
            axios.get('data/versions.json').then((response: AxiosResponse) => {
                const list: Version[] = [];
                (<string[]>response.data).forEach(fullVersion => list.push(new Version(fullVersion)));
                versions = list;
                resolve(versions);
            });
        });
    }

    public static async loadAllVersions(): Promise<Version[]> {
        const versions = await Version.getVersions();
        const versionLoaders: Promise<void>[] = [];
        versions.forEach((version: Version): void => {
            versionLoaders.push(version.load());
        })
        await Promise.all(versionLoaders);
        return versions;
    }

    /**
     * Get a fixer given its name.
     *
     * @throws if the data is not yet loaded
     */
    public getFixerByName(fixerName: string): Fixer | null {
        if (this.loaded === false) {
            throw new Error('Data not loaded.');
        }
        return this._fixersMap.hasOwnProperty(fixerName) ? this._fixersMap[fixerName] : null;
    }

    /**
     * Get a fixer set given its name.
     *
     * @throws if the data is not yet loaded
     */
    public getFixerSetByName(fixerSetName: string): FixerSet | null {
        if (this.loaded === false) {
            throw new Error('Data not loaded.');
        }
        return this._fixerSetsMap.hasOwnProperty(fixerSetName) ? this._fixerSetsMap[fixerSetName] : null;
    }
}
