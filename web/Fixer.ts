import Configuration, { FixerState } from './Configuration';
import { PFCFixer, PFCFixerOption, PFCFixerCodeSample } from './PCFDataDefinitions';
import FixerOrSetInterface from './FixerOrSetInterface';
import FixerSet, { FixerSetFixer } from './FixerSet';
import { textToHtml, getSearchableArray, ValueType } from './Utils';
import Version from './Version';

/**
 * Represents a PHP-CS-Fixer fixer and all its data.
 */
export default class Fixer implements FixerOrSetInterface {

    public readonly type: string = 'fixer';

    public readonly uniqueKey: string;

    /**
     * The version where this fixer is defined.
     */
    public readonly version: Version;

    /**
     * The name of the fixer.
     */
    public readonly name: string;

    /**
     * The short fixer description (plain text).
     */
    public readonly summary: string;

    /**
     * The short fixer description (HTML).
     */
    public readonly summaryHtml: string;

    /**
     * A longer fixer description (plain text).
     */
    public readonly description: string;

    /**
     * A longer fixer description (html).
     */
    public readonly descriptionHtml: string;

    /**
     * Is this fixer risky?
     */
    public readonly risky: boolean;

    /**
     * A description why the fixer is risky (plain text).
     */
    public readonly riskyDescription: string;

    /**
     * A description why the fixer is risky (HTML).
     */
    public readonly riskyDescriptionHtml: string;

    public readonly options: PFCFixerOption[];

    public readonly codeSamples: PFCFixerCodeSample[];

    public readonly fullClassName: string;

    private _fixerSets?: FixerSet[];

    public get fixerSets(): FixerSet[] {
        if (this._fixerSets !== undefined) {
            return this._fixerSets;
        }
        const fixerSets: FixerSet[] = [];
        this.version.fixerSets.forEach((fixerSet: FixerSet) => {
            fixerSet.fixers.forEach((fixerSetFixer: FixerSetFixer) => {
                if (fixerSetFixer.fixer === this) {
                    fixerSets.push(fixerSet);
                }
            });
        });
        this._fixerSets = fixerSets;
        return this._fixerSets;
    }

    /**
     * If this fixer is deprecated, list of the names of the fixers that should be used instead.
     * Empty array if not deprecated.
     */
    public readonly deprecated_switchToNames: string[];

    /**
     * If this fixer is deprecated, list of the fixers that should be used instead.
     * Empty array if not deprecated.
     * undefined is still not resolved
     */
    private _deprecated_switchTo?: Fixer[];

    /**
     * If this fixer is deprecated, list of the names of the fixers that should be used instead.
     * Empty array if not deprecated.
     */
    public get deprecated_switchTo(): Fixer[] {
        if (this._deprecated_switchTo !== undefined) {
            return this._deprecated_switchTo;
        }
        const fixers: Fixer[] = [];
        (<string[]>this.deprecated_switchToNames).forEach((fixerName: string) => {
            const fixer: Fixer | null = this.version.getFixerByName(fixerName);
            if (fixer === null) {
                throw new Error(`Unable to find a fixer named ${fixerName}`);
            }
            fixers.push(fixer);
        });
        this._deprecated_switchTo = fixers;
        return this._deprecated_switchTo;
    }

    private _supersedes?: Fixer[];

    public get supersedes(): Fixer[] {
        if (this._supersedes !== undefined) {
            return this._supersedes;
        }
        const supersedes: Fixer[] = [];
        this.version.fixers.forEach((fixer: Fixer) => {
            if (fixer.deprecated_switchTo.indexOf(this) >= 0) {
                supersedes.push(fixer);
            }
        });
        this._supersedes = supersedes;
        return this._supersedes;
    };

    private _searchableString?: string;

    protected get searchableString(): string {
        if (this._searchableString !== undefined) {
            return this._searchableString;
        }
        const strings = [this.name, this.summary, this.description];
        if (this.riskyDescription) {
            strings.push(this.riskyDescription);
        }
        this._searchableString = ' ' + getSearchableArray(strings.join(' ')).join(' ') + ' ';
        return this._searchableString;
    }


    /**
     * Initialize the instance.
     *
     * @param version The version where this fixer is defined.
     * @param name The name of the fixer.
     * @param data The PHP-CS-Fixer data.
     */
    constructor(version: Version, name: string, data: PFCFixer) {
        this.version = version;
        this.name = name;
        this.uniqueKey = name + '@' + version.fullVersion;
        this.summary = data.summary === undefined ? '' : <string>data.summary;
        this.summaryHtml = textToHtml(this.summary, true);
        this.description = data.description === undefined ? '' : <string>data.description;
        this.descriptionHtml = textToHtml(this.description, true);
        this.risky = data.risky ? true : false;
        this.riskyDescription = data.riskyDescription === undefined ? '' : <string>data.riskyDescription;
        this.riskyDescriptionHtml = textToHtml(this.riskyDescription, true);
        this.options = data.configuration === undefined ? [] : data.configuration;
        this.codeSamples = data.codeSamples === undefined ? [] : data.codeSamples;
        this.fullClassName = data.fullClassName === undefined ? '' : data.fullClassName;
        if (data.deprecated_switchTo === undefined) {
            this.deprecated_switchToNames = [];
            this._deprecated_switchTo = [];
        } else {
            this.deprecated_switchToNames = data.deprecated_switchTo;
            this.deprecated_switchToNames.sort((a: string, b: string) => {
                return a < b ? -1 : a > b ? 1 : 0;
            });
        }
        data.codeSamples
    }
    public satisfySearch(keywords: string[], searchFixerSets: (FixerSet | null)[]): boolean {
        var ok = true;
        var searchableString = this.searchableString;
        keywords.some((keyword) => {
            if (searchableString.indexOf(keyword) < 0) {
                ok = false;
                return true;
            }
            return false;
        })
        if (ok && searchFixerSets.length > 0) {
            ok = false;
            if (this.fixerSets.length === 0) {
                ok = searchFixerSets.indexOf(null) >= 0;
            } else {
                ok = false;
                this.fixerSets.some((fixerSet: FixerSet) => {
                    ok = searchFixerSets.indexOf(fixerSet) >= 0;
                    return ok;
                });
            }
        }
        return ok;
    }

    /**
     * Check that a configuration is valid for this fixer
     * @param configuration the configuration to be checked
     * @param warnings problems will be reported here
     * @returns the configuration with only valid values (or true if the configuration is empty)
     */
    public validateConfiguration(configuration: object | true, warnings: string[] = []): object | true {
        if (configuration === true || Object.keys(configuration).length === 0) {
            return true;
        }
        configuration = JSON.parse(JSON.stringify(configuration));
        Object.keys(configuration).forEach((optionName: string): void => {
            const checkedValue = this.validateOptionValue(optionName, (<any>configuration)[optionName], warnings);
            if (checkedValue === null) {
                delete (<any>configuration)[optionName];
                return;
            }
            const [actualOptionName, normalizedValue] = checkedValue;
            (<any>configuration)[actualOptionName] = (<any>configuration)[optionName];
            if (actualOptionName !== optionName) {
                delete (<any>configuration)[optionName];
            }
        });
        return Object.keys(configuration).length === 0 ? true : configuration;
    }

    /**
     * Check that a value is valid for an option
     * @param optionName the option name (aliases are accepted too)
     * @param value the option value
     * @param warnings warnings will be added here
     * @return null in case of errors (invalid option name, invalid option value)
     */
    public validateOptionValue(optionName: string, value: any, warnings: string[]): [string, any] | null {
        let option: PFCFixerOption | null = this.getOptionByName(optionName);
        if (option === null) {
            warnings.push(`The fixer ${this.name} does not have an option named ${optionName} for version ${this.version.fullVersion}: it has been removed`);
            return null;
        }
        if (optionName === option.alias) {
            warnings.push(`The option ${optionName} of the fixer ${this.name} has been renamed to ${option.name} for version ${this.version.fullVersion}`);
        }
        if (option.allowedValues !== undefined) {
            if (option.allowedValues.indexOf(value) < 0) {
                warnings.push(`The option ${optionName} of the fixer ${this.name} has an invalid value`);
                return null;
            }
        } else if (option.allowedTypes !== undefined) {
            const valueType = ValueType.get(value);
            let typeFound: boolean = false;
            option.allowedTypes.some((allowedType: string): boolean => {
                switch (allowedType) {
                    case 'array':
                        switch (ValueType.get((<PFCFixerOption>option).defaultValue)) {
                            case ValueType.ARRAY:
                                typeFound = valueType === ValueType.ARRAY;
                                break;
                            case ValueType.OBJECT:
                                typeFound = valueType === ValueType.OBJECT;
                                break;
                            default:
                                typeFound = valueType === ValueType.ARRAY || valueType === ValueType.OBJECT;
                                break;
                        }
                        break;
                    case 'bool':
                        typeFound = valueType === ValueType.BOOLEAN;
                        break;
                    case 'null':
                        typeFound = valueType === ValueType.NULL;
                        break;
                    case 'string':
                        typeFound = valueType === ValueType.STRING;
                        break;
                    case 'integer':
                        typeFound = valueType === ValueType.INTEGER;
                        break;
                    case 'double':
                        typeFound = valueType === ValueType.DECIMAL || valueType === ValueType.INTEGER;
                        break;
                    case 'null':
                        typeFound = valueType === ValueType.NULL;
                        break;
                }
                return typeFound;
            });
            if (typeFound === false) {
                warnings.push(`The type of the option ${optionName} of the fixer ${this.name} is not an accepted one`);
                return null;
            }
        }
        return [option.name, value];
    }

    /**
     * Get the index of a configuration option, searching for the canonical name and/or its alias
     * @param name
     * @param alias null to search both canonical and alias names, false to search for canonical name only, true to search for alias name only
     *
     * @returns -1 if not found
     */
    public getOptionIndexByName(name: string, alias: boolean | null = null): number {
        for (let index = this.options.length - 1; index >= 0; index--) {
            let option = this.options[index];
            if (alias !== true && option.name === name) {
                return index;
            }
            if (alias !== false && option.alias !== undefined && option.alias === name) {
                return index;
            }
        }
        return -1;
    }

    /**
     * Get a configuration option, searching for the canonical name and/or its alias
     * @param name
     * @param alias null to search both canonical and alias names, false to search for canonical name only, true to search for alias name only
     *
     * @returns null if not found
     */
    public getOptionByName(name: string, alias: boolean | null = null): PFCFixerOption | null {
        const index = this.getOptionIndexByName(name, alias);
        return index === -1 ? null : this.options[index];
    }

    public getCssClass(configuration: Configuration|null) : string {
        const classes : string[] = [];
        if (this.deprecated_switchToNames.length > 0) {
            classes.push('fixer-deprecated');
        }
        if (this.risky) {
            classes.push('fixer-risky');
        }
        if (configuration) {
            const state = configuration.getFixerState(this);
            switch (state.state) {
                case FixerState.UNSELECTED:
                    break;
                case FixerState.BYFIXERSET_INCLUDED:
                    classes.push('fixer-selected-by-fixerset');
                    break;
                case FixerState.BYFIXERSET_EXCLUDED:
                    break;
                case FixerState.MANUALLY_INCLUDED:
                    classes.push(state.configuration === null ? 'fixer-selected-by-user' : 'fixer-selected-by-user-configured');
                    break;
                case FixerState.MANUALLY_EXCLUDED:
                    classes.push('fixer-unselected-by-user');
                    break;
                default:
                    throw new Error('Unrecognized fixer state');
            }
        }
        return classes.join(' ');
    }
}
