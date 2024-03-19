import Version from "./Version";
import Fixer from "./Fixer";
import FixerSet from "./FixerSet";

interface PreviousNextDifferenceData {
    previousData: any | undefined,
    nextData: any | undefined,
}

export interface Difference {
    description: string;
    data?: PreviousNextDifferenceData;
}
export interface FixerChanges {
    readonly newerFixer: Fixer;
    readonly olderFixer: Fixer;
    readonly differences: Difference[];
}

interface FixerSetChanges {
    readonly newerFixerSet: FixerSet;
    readonly olderFixerSet: FixerSet;
    readonly differences: Difference[];
}

export interface VersionChanges {
    empty: boolean;
    readonly newerVersion: Version;
    readonly olderVersion: Version;
    readonly addedFixers: Fixer[];
    readonly removedFixers: Fixer[];
    readonly changedFixers: FixerChanges[];
    readonly addedFixerSets: FixerSet[];
    readonly removedFixerSets: FixerSet[];
    readonly changedFixerSets: FixerSetChanges[];
}

interface FixersPair {
    readonly newerFixer: Fixer;
    readonly olderFixer: Fixer;
}
interface FixerSetsPair {
    readonly newerFixerSet: FixerSet;
    readonly olderFixerSet: FixerSet;
}

export interface FixerHistoryEntry {
    readonly version: Version;
    readonly previousVersionFixer: Fixer | null;
    readonly newerVersionFixer: Fixer | null;
    readonly differences: Difference[];
}

export function compareVersions(newerVersion: Version, olderVersion: Version): Promise<VersionChanges> {
    return new Promise<VersionChanges>((resolve, reject) => {
        Promise.all([newerVersion.load(), olderVersion.load()]).then(() => {
            resolve(compareLoadedVersions(newerVersion, olderVersion));
        })
    });
}

export async function getFixerHistory(fixerName: string): Promise<FixerHistoryEntry[]> {
    const versions: Version[] = await Version.loadAllVersions();
    return getFixerHistoryLoaded(fixerName, versions);
}

function compareLoadedVersions(newerVersion: Version, olderVersion: Version): VersionChanges {
    const changes: VersionChanges = {
        empty: true,
        newerVersion,
        olderVersion,
        addedFixers: [],
        removedFixers: [],
        changedFixers: [],
        addedFixerSets: [],
        removedFixerSets: [],
        changedFixerSets: [],
    }
    const fixerPairs: FixersPair[] = [];
    newerVersion.fixers.forEach((newerFixer: Fixer): void => {
        const olderFixer = olderVersion.getFixerByName(newerFixer.name);
        if (olderFixer === null) {
            changes.empty = false;
            changes.addedFixers.push(newerFixer);
        } else {
            fixerPairs.push({ newerFixer, olderFixer });
        }
    });
    olderVersion.fixers.forEach((olderFixer): void => {
        if (newerVersion.getFixerByName(olderFixer.name) === null) {
            changes.empty = false;
            changes.removedFixers.push(olderFixer);
        }
    });
    fixerPairs.forEach((fixerPair): void => {
        var pairDifferences = compareFixers(fixerPair.newerFixer, fixerPair.olderFixer);
        if (pairDifferences.length > 0) {
            changes.empty = false;
            changes.changedFixers.push({ newerFixer: fixerPair.newerFixer, olderFixer: fixerPair.olderFixer, differences: pairDifferences });
        }
    });
    const fixerSetPairs: FixerSetsPair[] = [];
    newerVersion.fixerSets.forEach((newerFixerSet: FixerSet): void => {
        const olderFixerSet = olderVersion.getFixerSetByName(newerFixerSet.name);
        if (olderFixerSet === null) {
            changes.empty = false;
            changes.addedFixerSets.push(newerFixerSet);
        } else {
            fixerSetPairs.push({ newerFixerSet, olderFixerSet });
        }
    });
    olderVersion.fixerSets.forEach((olderFixerSet): void => {
        if (newerVersion.getFixerSetByName(olderFixerSet.name) === null) {
            changes.empty = false;
            changes.removedFixerSets.push(olderFixerSet);
        }
    });
    fixerSetPairs.forEach((fixerSetPair): void => {
        var pairDifferences = compareFixerSets(fixerSetPair.newerFixerSet, fixerSetPair.olderFixerSet);
        if (pairDifferences.length > 0) {
            changes.empty = false;
            changes.changedFixerSets.push({ newerFixerSet: fixerSetPair.newerFixerSet, olderFixerSet: fixerSetPair.olderFixerSet, differences: pairDifferences });
        }
    });
    return changes;
}

function getFixerHistoryLoaded(fixerName: string, versions: Version[]): FixerHistoryEntry[] {
    versions = (<Version[]>[]).concat(versions);
    versions.reverse();
    const result: FixerHistoryEntry[] = [];
    let previousVersionFixer: Fixer | null = null;
    versions.forEach((version: Version, versionIndex: number): void => {
        const newerVersionFixer = version.getFixerByName(fixerName);
        if (newerVersionFixer === null) {
            if (previousVersionFixer !== null) {
                result.push({
                    version: previousVersionFixer.version,
                    previousVersionFixer,
                    newerVersionFixer,
                    differences: [{ description: `The fixer has been removed in version ${version.majorMinorVersion}` }],
                });
            }
        } else if (previousVersionFixer === null) {
            if (versionIndex > 0) {
                result.push({
                    version: newerVersionFixer.version,
                    previousVersionFixer,
                    newerVersionFixer,
                    differences: [{ description: `The fixer has been introduced in version ${version.majorMinorVersion}` }],
                });
            }
        } else {
            const diffs: Difference[] = compareFixers(newerVersionFixer, previousVersionFixer);
            if (diffs.length !== 0) {
                result.push({
                    version: newerVersionFixer.version,
                    previousVersionFixer,
                    newerVersionFixer,
                    differences: diffs,
                });
            }
        }
        previousVersionFixer = newerVersionFixer;
    });
    return result;
}

function compareFixers(newerFixer: Fixer, olderFixer: Fixer): Difference[] {
    const diffs: Difference[] = [];
    if (newerFixer.risky !== olderFixer.risky) {
        diffs.push({ description: newerFixer.risky ? 'The fixer became risky' : 'The fixer is no more risky' });
    }
    if ((newerFixer.deprecated_switchTo !== null) !== (olderFixer.deprecated_switchTo !== null)) {
        switch (newerFixer.deprecated_switchTo === null ? -1 : newerFixer.deprecated_switchTo.length) {
            case -1:
                diffs.push({ description: 'The fixer is no more deprecated' });
                break;
            case 0:
                diffs.push({ description: 'The fixer has been deprecated (no successor has been provided)' });
                break;
            case 1:
                diffs.push({ description: `The fixer has been deprecated in favor of \`${(<Fixer[]>newerFixer.deprecated_switchTo)[0].name}\`` });
                break;
            default:
                let newFixerNames: string[] = [];
                (<Fixer[]>newerFixer.deprecated_switchTo).forEach((fixer: Fixer): void => {
                    newFixerNames.push(fixer.name);
                });
                diffs.push({ description: 'The fixer has been deprecated in favor of `' + newFixerNames.join('`, `') + '`' });
                break;
        }
    }
    newerFixer.options.forEach((newerOption): void => {
        let olderOption = olderFixer.getOptionByName(newerOption.name, null);
        if (olderOption === null && newerOption.alias !== undefined) {
            olderOption = olderFixer.getOptionByName(newerOption.alias, null);
        }
        if (olderOption === null) {
            diffs.push({ description: `The fixer has the new \`${newerOption.name}\` option` });
            return;
        }
        if (newerOption.name !== olderOption.name) {
            diffs.push({ description: `The name of the option \`${olderOption.name}\` changed to \`${newerOption.name}\` (previous name is still usable)` });
        }
        if ((newerOption.deprecationReason === undefined) !== (olderOption.deprecationReason === undefined)) {
            diffs.push({
                description: newerOption.deprecationReason !== undefined ?
                    `The \`${newerOption.name}\` option has been deprecated` :
                    `The \`${newerOption.name}\` option is no more deprecated`
            });
        }
        if ((newerOption.defaultValue === undefined) !== (olderOption.defaultValue === undefined)) {
            diffs.push({
                description: newerOption.defaultValue !== undefined ?
                    `The \`${newerOption.name}\` option has been assigned a default value` :
                    `The default value of the \`${newerOption.name}\` option has been removed`
                ,
                data: {
                    previousData: olderOption.defaultValue,
                    nextData: newerOption.defaultValue,
                }
            });
        } else if (newerOption.defaultValue !== undefined && JSON.stringify(newerOption.defaultValue) !== JSON.stringify(olderOption.defaultValue)) {
            diffs.push({
                description: `The default value of the \`${newerOption.name}\` option has changed`,
                data: {
                    previousData: olderOption.defaultValue,
                    nextData: newerOption.defaultValue,
                },
            });
        }
        if ((newerOption.allowedTypes === undefined) !== (olderOption.allowedTypes === undefined)) {
            diffs.push({
                description: newerOption.allowedTypes !== undefined ?
                    `The \`${newerOption.name}\` option has been assigned a list of allowed types` :
                    `The list of allowed types of the \`${newerOption.name}\` option has been removed`
                ,
                data: {
                    previousData: olderOption.allowedTypes,
                    nextData: newerOption.allowedTypes,
                },
            });
        } else if (newerOption.allowedTypes !== undefined && JSON.stringify(newerOption.allowedTypes) !== JSON.stringify(olderOption.allowedTypes)) {
            diffs.push({
                description: `The list of allowed types of the \`${newerOption.name}\` option has changed`,
                data: {
                    previousData: olderOption.allowedTypes,
                    nextData: newerOption.allowedTypes,
                },
            });
        }
        if (newerOption.allowedValues !== undefined && olderOption.allowedValues !== undefined && JSON.stringify(sortArrayRecursive(newerOption.allowedValues)) !== JSON.stringify(sortArrayRecursive(olderOption.allowedValues))) {
            diffs.push({
                description: `The allowed values of the \`${newerOption.name}\` option changed`,
                data: {
                    previousData: olderOption.allowedValues,
                    nextData: newerOption.allowedValues,
                },
            });
        }
    });
    olderFixer.options.forEach((olderOption): void => {
        var newerOption = newerFixer.getOptionByName(olderOption.name, null);
        if (newerOption === null && olderOption.alias !== undefined) {
            newerOption = newerFixer.getOptionByName(olderOption.alias, null);
        }
        if (newerOption === null) {
            diffs.push({ description: `The \`${olderOption.name}\` option has been removed` });
        }
    });
    return diffs;
}

function compareFixerSets(newerFixerSet: FixerSet, olderFixerSet: FixerSet): Difference[] {
    const diffs: Difference[] = [];
    if (newerFixerSet.risky !== olderFixerSet.risky) {
        diffs.push({ description: newerFixerSet.risky ? 'The fixer set became risky' : 'The fixer set is no more risky' });
    }
    newerFixerSet.fixers.forEach((newerDefinition): void => {
        let olderDefinition: any = null;
        olderFixerSet.fixers.some((fixerDefinition): boolean => {
            if (fixerDefinition.fixer.name === newerDefinition.fixer.name) {
                olderDefinition = fixerDefinition;
                return true;
            }
            return false;
        });
        if (olderDefinition === null) {
            diffs.push({ description: `The fixer \`${newerDefinition.fixer.name}\` has been added to this set` });
            return;
        }
        if ((newerDefinition.configuration !== null) !== (olderDefinition.configuration !== null)) {
            diffs.push({
                description: newerDefinition.configuration !== null ?
                    `The fixer \`${newerDefinition.fixer.name}\` has been configured` :
                    `The configuration of the fixer \`${newerDefinition.fixer.name}\` has been removed`
                ,
                data: {
                    previousData: olderDefinition.configuration,
                    nextData: newerDefinition.configuration,
                }
            });
        } else if (newerDefinition.configuration !== null && JSON.stringify(newerDefinition.configuration) !== JSON.stringify(olderDefinition.configuration)) {
            diffs.push({
                description: `The configuration of the fixer \`${newerDefinition.fixer.name}\` has changed`,
                data: {
                    previousData: olderDefinition.configuration,
                    nextData: newerDefinition.configuration,
                },
            });
        }
    });
    olderFixerSet.fixers.forEach((olderDefinition): void => {
        let newerDefinition = null;
        newerFixerSet.fixers.some((fixerDefinition): boolean => {
            if (fixerDefinition.fixer.name === olderDefinition.fixer.name) {
                newerDefinition = fixerDefinition;
                return true;
            }
            return false;
        });
        if (newerDefinition === null) {
            diffs.push({ description: `The fixer \`${olderDefinition.fixer.name}\` has been removed from this set` });
        }
    });
    return diffs;
}

function sortArrayRecursive(value: any[]): any[] {
    let clone = (<any[]>[]).concat(value);
    clone.sort();
    for (let i = 0; i < clone.length; i++) {
        if (clone[i] instanceof Array) {
            clone[i] = sortArrayRecursive(clone[i]);
        }
    }
    return clone;
}