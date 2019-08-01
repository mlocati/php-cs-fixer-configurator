import Fixer from "./Fixer";
import Version from "./Version";
import FixerSet from "./FixerSet";

export const FixerStateFlag = {
    INCLUDED: 0b00000001,
    EXCLUDED: 0b00000010,
    BYFIXERSET: 0b00000100,
    MANUALLY: 0b00001000,
}

export const FixerState = {
    /**
     * Fixer not selected.
     */
    UNSELECTED: 0,

    /**
     * Fixer selected because of a selected fixer set.
     */
    BYFIXERSET_INCLUDED: FixerStateFlag.INCLUDED + FixerStateFlag.BYFIXERSET,

    /**
     * Fixer included by a fixer set, but excluded by another fixer set.
     */
    BYFIXERSET_EXCLUDED: FixerStateFlag.EXCLUDED + FixerStateFlag.BYFIXERSET,

    /**
     * Fixer state: directly selected (without being configured).
     */
    MANUALLY_INCLUDED: FixerStateFlag.INCLUDED + FixerStateFlag.MANUALLY,

    /**
     * Fixer state: included in selected fixer sets but manually excluded.
     */
    MANUALLY_EXCLUDED: FixerStateFlag.EXCLUDED + FixerStateFlag.MANUALLY,
}

/**
 * The state of a fixer as resulting by selected fixers/fixer sets.
 */
interface FixerData {

    /**
     * The fixer set that configures the fixer (if defined).
     */
    fixerSet: FixerSet | null,

    /**
     * The fixer configuration (if defined).
     */
    configuration: object | null,

    /**
     * One of the FixerState constants.
     */
    state: number,
}

/**
 * The state of a fixer as resulting by selected fixers/fixer sets.
 */
interface FixerDataWithFixer extends FixerData {
    /**
     * The involved fixer.
     */
    fixer: Fixer,
}

/**
 * Represents a serialized configuration for white spaces
 */
interface SerializedWhitespaceConfigurationInterface {
    /**
     * Indentation configuration.
     */
    indent?: string;
    /**
     * Line ending character sequence.
     */
    lineEnding?: string;
}

/**
 * Represents a serialized configuration
 */
export interface SerializedConfigurationInterface {
    /**
     * The PHP-CS-Fixer version.
     */
    version?: string,

    /**
     * Does configuration include some risky fixer?
     */
    risky?: boolean;

    /**
     * White-space configuration
     */
    whitespace?: SerializedWhitespaceConfigurationInterface;

    /**
     * List of the names of the included/excluded fixer sets.
     */
    fixerSets?: string[];

    /**
     * List of the names of the included/excluded fixers.
     */
    fixers?: { [fixerName: string]: boolean | object };
}

function cloneConfiguration(configuration: any): any {
    return JSON.parse(JSON.stringify(configuration));
}

export default class Configuration {

    /**
     * The configured indentation (undefined if not configured).
     */
    private _indent?: string;

    /**
     * Get the indentation.
     */
    public get indent(): string {
        return this._indent === undefined ? this.version.indent : this._indent;
    }

    /**
     * Set the indentation.
     */
    public set indent(value: string) {
        this._indent = value;
    }

    /**
     * The configured line ending character sequence (undefined if not configured).
     */
    private _lineEnding?: string;

    /**
     * Get the line ending character sequence.
     */
    public get lineEnding(): string {
        return this._lineEnding === undefined ? this.version.lineEnding : this._lineEnding;
    }

    /**
     * Set the line ending character sequence.
     */
    public set lineEnding(value: string) {
        this._lineEnding = value;
    }

    /**
     * The PHP-CS-Fixer version for which this configuration is for.
     */
    private _version: Version;

    /**
     * Fixers manually selected/included/excluded/configured.
     *
     * Keys are the fixer names.
     * Values are:
     * - false: if manually excluded
     * - true: if manually included (without manual configuration)
     * - object: if manually included (with manual configuration)
     */
    private _fixers: { [fixerName: string]: boolean | object } = {};

    /**
     * The names of the fixer sets included or excluded.
     * If they are excluded, the names are prefixed with '-'.
     */
    private _fixerSets: string[] = [];

    /**
     * Get the names of the fixer sets included or excluded.
     * If they are excluded, the names are prefixed with '-'.
     */
    public get fixerSets(): string[] {
        return this._fixerSets;
    }

    /**
     * The cached value built by expandFixersInSets().
     * null if we need to (re)build it
     */
    private _expandedFixersInSets: { [fixerName: string]: FixerDataWithFixer } | null = {};

    /**
     * The cached value built by expandFixers().
     * null if we need to (re)build it
     */
    private _expandedFixers: { [fixerName: string]: FixerDataWithFixer } | null = {};

    /**
     * Initialize the class.
     * @param version the PHP-CS-Fixer version for which this configuration is for
     */
    public constructor(version: Version) {
        this._version = version;
    }

    private cloneExpandedState(states: { [fixerName: string]: FixerDataWithFixer } | null): { [fixerName: string]: FixerDataWithFixer } | null {
        if (states === null) {
            return null;
        }
        const result: { [fixerName: string]: FixerDataWithFixer } = {};
        Object.keys(states).forEach((fixerName: string): void => {
            const state: FixerDataWithFixer = states[fixerName];
            result[fixerName] = {
                fixer: state.fixer,
                fixerSet: state.fixerSet,
                configuration: cloneConfiguration(state.configuration),
                state: state.state,
            };
        });
        return result;
    }

    /**
     * Return a clone of this instance
     */
    public clone(): Configuration {
        const result = new Configuration(this.version);
        result._indent = this._indent;
        result._lineEnding = this._lineEnding;
        result._fixers = cloneConfiguration(this._fixers);
        result._fixerSets = (<string[]>[]).concat(this._fixerSets);
        result._expandedFixersInSets = this.cloneExpandedState(this._expandedFixersInSets);
        result._expandedFixers = this.cloneExpandedState(this._expandedFixers);
        return result;
    }

    /**
     * Get the PHP-CS-Fixer version for which this configuration is for.
     */
    public get version(): Version {
        return this._version;
    }

    /**
     * Changes the PHP-CS-Fixer version for which this configuration is for.
     * 
     * @param version the new version (it must be already fully loaded)
     * 
     * @return warnings occurred during the conversion will be added to this array
     */
    public setVersion(version: Version): string[] {
        const warnings: string[] = [];
        if (version === this._version) {
            return warnings;
        }
        const fixerSets: string[] = [];
        for (var fixerSetIndex = 0; fixerSetIndex < this._fixerSets.length;) {
            const fixerSetName = this._fixerSets[fixerSetIndex],
                negated = fixerSetName.charAt(0) === '-',
                actualFixerSetName = negated ? fixerSetName.substr(1) : fixerSetName,
                fixerSet: FixerSet | null = version.getFixerSetByName(actualFixerSetName);
            if (fixerSet !== null) {
                fixerSets.push(fixerSetName);
                fixerSetIndex++;
                continue;
            }
            warnings.push(`The version ${version.fullVersion} does not define a fixer set named ${actualFixerSetName}: it has been removed from the configuration`);
            fixerSetIndex++;
            if (fixerSetIndex > 0) {
                continue;
            }
            // this is the first fixer set: let's skip to the next non negated fixer set
            while (fixerSetIndex < this._fixerSets.length && this._fixerSets[fixerSetIndex].charAt(0) === '-') {
                fixerSetIndex++;
            }
        }
        const fixers: { [fixerName: string]: boolean | object } = {};
        Object.keys(this._fixers).forEach((fixerName: string): void => {
            const fixer: Fixer | null = version.getFixerByName(fixerName);
            if (fixer === null) {
                warnings.push(`The version ${version.fullVersion} does not define a fixer named ${fixerName}: it has been removed from the configuration`);
                return;
            }
            fixers[fixerName] = this._fixers[fixerName] === false ? false : fixer.validateConfiguration({ configuration: this._fixers[fixerName], warnings });
        });
        this._version = version;
        this._expandedFixersInSets = null;
        this._expandedFixers = null;
        this._fixerSets = fixerSets;
        this._fixers = fixers;
        return warnings;
    }

    /**
     * Clear the configuration state.
     */
    public clear(): void {
        this._indent = undefined;
        this._lineEnding = undefined;
        this._fixers = {};
        this._fixerSets = [];
        this._expandedFixersInSets = {};
        this._expandedFixers = {};
    }

    /**
     * Manually include a fixer (with its default configuration).
     *
     * @throws if the fixer version is not for the version of this configuration.
     */
    public includeFixer(fixer: Fixer): void {
        if (fixer.version !== this.version) {
            throw new Error(`The fixer is for version ${fixer.version.fullVersion} and not for  ${this.version.fullVersion}`)
        }
        if (this._fixers.hasOwnProperty(fixer.name) && this._fixers[fixer.name] === true) {
            return;
        }
        this._expandedFixers = null;
        this._fixers[fixer.name] = true;
    }

    /**
     * Manually include a fixer (with a manually defined configuration).
     *
     * @param fixer the fixer to be included
     * @param configuration the configuration of the fixer (it must be valid for the fixer)
     * 
     * @throws if the fixer version is not for the version of this configuration.
     */
    public includeFixerWithConfiguration(fixer: Fixer, configuration: object): void {
        if (fixer.version !== this.version) {
            throw new Error(`The fixer is for version ${fixer.version.fullVersion} and not for  ${this.version.fullVersion}`)
        }
        this._expandedFixers = null;
        this._fixers[fixer.name] = configuration;
    }

    /**
     * Manually exclude a fixer.
     * @throws if the fixer version is not for the version of this configuration.
     */
    public excludeFixer(fixer: Fixer): void {
        if (fixer.version !== this.version) {
            throw new Error(`The fixer is for version ${fixer.version.fullVersion} and not for  ${this.version.fullVersion}`)
        }
        if (this._fixers.hasOwnProperty(fixer.name) && this._fixers[fixer.name] === false) {
            return;
        }
        this._expandedFixers = null;
        this._fixers[fixer.name] = false;
    }

    /**
     * Remove the fixer from the manually selected/removed fixers.
     * @throws if the fixer version is not for the version of this configuration.
     */
    public unsetFixer(fixer: Fixer): void {
        if (fixer.version !== this.version) {
            throw new Error(`The fixer is for version ${fixer.version.fullVersion} and not for  ${this.version.fullVersion}`)
        }
        if (!this._fixers.hasOwnProperty(fixer.name)) {
            return;
        }
        this._expandedFixers = null;
        delete this._fixers[fixer.name];
    }

    /**
     * Include a fixer set.
     * @throws if the fixer set version is not for the version of this configuration.
     */
    public includeFixerSet(fixerSet: FixerSet): void {
        if (fixerSet.version !== this.version) {
            throw new Error(`The fixer is for version ${fixerSet.version.fullVersion} and not for  ${this.version.fullVersion}`)
        }
        const fixerSetIndex = this.getFixerSetIndex(fixerSet);
        if (fixerSetIndex < 0) {
            this._fixerSets.push(fixerSet.name);
        } else {
            this._fixerSets[fixerSetIndex] = fixerSet.name;
        }
        this._expandedFixersInSets = null;
        this._expandedFixers = null;
    }

    /**
     * Exclude a fixer set.
     * @throws if the fixer set version is not for the version of this configuration.
     */
    public excludeFixerSet(fixerSet: FixerSet): void {
        if (fixerSet.version !== this.version) {
            throw new Error(`The fixer is for version ${fixerSet.version.fullVersion} and not for  ${this.version.fullVersion}`)
        }
        if (this._fixerSets.length === 0) {
            return;
        }
        const fixerSetIndex = this.getFixerSetIndex(fixerSet);
        if (fixerSetIndex === 0) {
            this.unsetFixerSet(fixerSet);
            return
        }
        if (fixerSetIndex < 0) {
            this._fixerSets.push('-' + fixerSet.name);
        } else {
            this._fixerSets[fixerSetIndex] = '-' + fixerSet.name;
        }
        this._expandedFixersInSets = null;
        this._expandedFixers = null;
    }

    /**
     * Remove the fixer set from the selected/removed fixer sets.
     *
     * @throws if the fixer set version is not for the version of this configuration.
     */
    public unsetFixerSet(fixerSet: FixerSet): void {
        if (fixerSet.version !== this.version) {
            throw new Error(`The fixer is for version ${fixerSet.version.fullVersion} and not for  ${this.version.fullVersion}`)
        }
        const fixerSetIndex = this.getFixerSetIndex(fixerSet);
        if (fixerSetIndex < 0) {
            return;
        }
        if (fixerSetIndex === 0) {
            this._fixerSets.shift();
            while (this._fixerSets.length > 0 && this._fixerSets[0].charAt(0) === '-') {
                this._fixerSets.shift();
            }
        } else {
            this._fixerSets.splice(fixerSetIndex, 1);
        }
        this._expandedFixersInSets = null;
        this._expandedFixers = null;
    }

    /**
     * Get the index of a fixer set in the selected fixer set list.
     *
     * @return -1 if not found
     */
    protected getFixerSetIndex(fixerSet: FixerSet): number {
        let fixerSetIndex: number = this._fixerSets.indexOf(fixerSet.name);
        if (fixerSetIndex < 0) {
            fixerSetIndex = this._fixerSets.indexOf('-' + fixerSet.name);
        }
        return fixerSetIndex < 0 ? -1 : fixerSetIndex;
    }

    /**
     * Expand the list of fixers as defined by the fixer sets, among with their configuration (if the fixer sets define it).
     */
    protected expandFixersInSets(): { [fixerName: string]: FixerDataWithFixer } {
        if (this._expandedFixersInSets !== null) {
            return this._expandedFixersInSets;
        }
        const expandedFixersInSets: { [fixerName: string]: FixerDataWithFixer } = {};
        this._fixerSets.forEach((fixerSetName: string): void => {
            const negated: boolean = fixerSetName.charAt(0) === '-';
            const fixerSet: FixerSet = <FixerSet>this.version.getFixerSetByName(negated ? fixerSetName.substr(1) : fixerSetName);
            fixerSet.fixers.forEach((fixerDef): void => {
                if (negated) {
                    if (expandedFixersInSets.hasOwnProperty(fixerDef.fixer.name)) {
                        expandedFixersInSets[fixerDef.fixer.name] = {
                            fixer: fixerDef.fixer,
                            fixerSet: fixerSet,
                            configuration: null,
                            state: FixerState.BYFIXERSET_EXCLUDED,
                        };
                    }
                } else {
                    expandedFixersInSets[fixerDef.fixer.name] = {
                        fixer: fixerDef.fixer,
                        fixerSet: fixerSet,
                        configuration: fixerDef.configuration,
                        state: FixerState.BYFIXERSET_INCLUDED,
                    };
                }
            });
        });
        this._expandedFixersInSets = expandedFixersInSets;
        return this._expandedFixersInSets;
    }

    /**
     * Expand the list of fixers as defined by the fixer sets and the manually defined ones, among with their configuration (if the fixer sets or the user define it).
     */
    protected expandFixers(): { [fixerName: string]: FixerDataWithFixer } {
        if (this._expandedFixers !== null) {
            return this._expandedFixers;
        }
        const expandedFixersInSets: { [fixerName: string]: FixerDataWithFixer } = this.expandFixersInSets();
        const expandedFixers: { [fixerName: string]: FixerDataWithFixer } = {};
        Object.keys(expandedFixersInSets).forEach((fixerName: string): void => {
            expandedFixers[fixerName] = expandedFixersInSets[fixerName];
        });
        Object.keys(this._fixers).forEach((fixerName: string): void => {
            const configuration: boolean | object = this._fixers[fixerName];
            if (configuration === false) {
                if (expandedFixers.hasOwnProperty(fixerName)) {
                    expandedFixers[fixerName] = {
                        fixer: expandedFixers[fixerName].fixer,
                        fixerSet: null,
                        configuration: null,
                        state: FixerState.MANUALLY_EXCLUDED,
                    };
                }
            } else {
                const fixer: Fixer = <Fixer>this.version.getFixerByName(fixerName);
                expandedFixers[fixerName] = {
                    fixer: fixer,
                    fixerSet: null,
                    configuration: configuration === true ? null : configuration,
                    state: FixerState.MANUALLY_INCLUDED
                };
            }
        });
        this._expandedFixers = expandedFixers;
        return this._expandedFixers;
    }

    /**
     * Get the fixer state.
     *
     * @throws if the fixer set version is not for the version of this configuration.
     */
    public getFixerState(fixer: Fixer, onlyBySets: boolean = false): FixerData {
        if (fixer.version !== this.version) {
            throw new Error(`The fixer is for version ${fixer.version.fullVersion} and not for  ${this.version.fullVersion}`)
        }
        const expandedFixers = onlyBySets ? this.expandFixersInSets() : this.expandFixers();
        if (expandedFixers.hasOwnProperty(fixer.name)) {
            return {
                fixerSet: expandedFixers[fixer.name].fixerSet,
                state: expandedFixers[fixer.name].state,
                configuration: expandedFixers[fixer.name].configuration,
            }
        }
        return {
            fixerSet: null,
            state: FixerState.UNSELECTED,
            configuration: null,
        };
    }

    /**
     * There is some risky enabled in this configuration?
     */
    public get risky(): boolean {
        let risky = false;
        const expandedFixers = this.expandFixers();
        Object.keys(expandedFixers).some((fixerName: string): boolean => {
            if ((expandedFixers[fixerName].state & FixerStateFlag.INCLUDED) === FixerStateFlag.INCLUDED) {
                risky = expandedFixers[fixerName].fixer.risky;
            }
            return risky;
        });

        return risky;
    }

    /**
     * Create a clone of this configuration with all the fixer sets expanded, so that the result will have only fixers and not fixer sets.
     */
    public flatten(): Configuration {
        const result = new Configuration(this.version);
        result._indent = this._indent;
        result._lineEnding = this._lineEnding;
        const expandedFixers = this.expandFixers();
        Object.keys(expandedFixers).forEach((fixerName: string): void => {
            const fixerState = expandedFixers[fixerName];
            if ((fixerState.state & FixerStateFlag.INCLUDED) !== FixerStateFlag.INCLUDED) {
                return;
            }
            result._fixers[fixerName] = fixerState.configuration === null ? true : cloneConfiguration(fixerState.configuration);
            (<{ [fixerName: string]: FixerDataWithFixer }>result._expandedFixers)[fixerName] = {
                fixerSet: null,
                fixer: fixerState.fixer,
                configuration: cloneConfiguration(fixerState.configuration),
                state: FixerState.MANUALLY_INCLUDED
            };
        });
        return result;
    }

    public serialize(): SerializedConfigurationInterface {
        const result = <SerializedConfigurationInterface>{
            version: this.version.fullVersion,
        };
        const risky = this.risky;
        if (risky) {
            result.risky = risky;
        }
        if (this.indent !== this.version.indent) {
            if (!result.hasOwnProperty('whitespace')) {
                result.whitespace = {};
            }
            (<SerializedWhitespaceConfigurationInterface>result.whitespace).indent = this.indent;
        }
        if (this.lineEnding !== this.version.lineEnding) {
            if (!result.hasOwnProperty('whitespace')) {
                result.whitespace = {};
            }
            (<SerializedWhitespaceConfigurationInterface>result.whitespace).lineEnding = this.lineEnding;
        }
        if (this._fixerSets.length > 0) {
            result.fixerSets = (<string[]>[]).concat(this._fixerSets);
        }
        const expandedFixers = this.expandFixers();
        Object.keys(expandedFixers).forEach((fixerName: string): void => {
            const fixerState = expandedFixers[fixerName];
            if ((fixerState.state & FixerStateFlag.MANUALLY) !== FixerStateFlag.MANUALLY) {
                return;
            }
            if (!result.hasOwnProperty('fixers')) {
                result.fixers = {};
            }
            if (fixerState.state === FixerState.MANUALLY_EXCLUDED) {
                (<{ [fixerName: string]: boolean | object }>result.fixers)[fixerName] = false;
            } else {
                (<{ [fixerName: string]: boolean | object }>result.fixers)[fixerName] = fixerState.configuration === null ? true : fixerState.configuration;
            }
        });

        return result;
    }

    /**
     * Parse a serialize configuration and builds a new Configuration instance.
     * @param version 
     * @param serializedConfiguration 
     * @param warnings 
     */
    public static fromSerializedConfiguration(version: Version, serializedConfiguration: SerializedConfigurationInterface, warnings: string[] = []): Configuration {
        const result = new Configuration(version);
        if (serializedConfiguration.whitespace !== undefined) {
            if (serializedConfiguration.whitespace.indent !== undefined && serializedConfiguration.whitespace.indent !== version.indent) {
                result._indent = serializedConfiguration.whitespace.indent;
            }
            if (typeof serializedConfiguration.whitespace.lineEnding !== undefined && serializedConfiguration.whitespace.lineEnding !== version.lineEnding) {
                result._lineEnding = serializedConfiguration.whitespace.lineEnding;
            }
        }
        if (serializedConfiguration.fixerSets !== undefined) {
            serializedConfiguration.fixerSets.forEach((fixerSetName: string): void => {
                if (fixerSetName.length === 0) {
                    return;
                }
                const negated = fixerSetName.charAt(0) === '-';
                if (negated) {
                    fixerSetName = fixerSetName.substr(1);
                }
                const fixerSet = version.getFixerSetByName(fixerSetName);
                if (fixerSet === null) {
                    warnings.push(`The version ${version.fullVersion} does not define a fixer set named ${fixerSetName}: it has been removed from the configuration`);
                    return;
                }
                if (negated && result._fixerSets.length === 0) {
                    warnings.push(`The fixer set named ${fixerSetName} is negated but it's the first one: skipped`);
                    return;
                }
                if (result.getFixerSetIndex(<FixerSet>fixerSet) >= 0) {
                    warnings.push(`The fixer set named ${fixerSetName} is duplicated in the fixer set list: skipped`);
                    return;
                }
                if (negated) {
                    result.excludeFixerSet(<FixerSet>fixerSet);
                } else {
                    result.includeFixerSet(<FixerSet>fixerSet);
                }
            });
        }
        if (serializedConfiguration.fixers !== undefined) {
            Object.keys(serializedConfiguration.fixers).forEach((fixerName: string): void => {
                const fixer = version.getFixerByName(fixerName);
                if (fixer === null) {
                    warnings.push(`The version ${version.fullVersion} does not define a fixer named ${fixerName}: it has been removed from the configuration`);
                    return;
                }
                let fixerConfiguration = (<{ [fixerName: string]: boolean | object }>serializedConfiguration.fixers)[fixerName];
                if (fixerConfiguration === false) {
                    result.excludeFixer(fixer);
                } else if (fixerConfiguration === true || (fixerConfiguration !== null && typeof fixerConfiguration === 'object')) {
                    fixerConfiguration = fixer.validateConfiguration(fixerConfiguration, warnings);
                    if (fixerConfiguration === true) {
                        result.includeFixer(fixer);
                    } else {
                        result.includeFixerWithConfiguration(fixer, fixerConfiguration);
                    }
                } else {
                    warnings.push(`The configuration value of the fixer ${fixerName} has an unrecognized type`);
                }
            });
        }
        return result;
    }
}
