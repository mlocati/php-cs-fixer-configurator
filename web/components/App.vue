<template>
    <div>
        <header>
            <b-navbar
                toggleable="lg"
                type="dark"
                variant="dark"
            >
                <b-navbar-brand
                    href="https://github.com/mlocati/php-cs-fixer-configurator"
                    class="mr-1"
                >
                    <span class="d-none d-md-inline">PHP-CS-Fixer configuration v</span>
                    <span class="d-md-none">P.C.F. config v</span>
                </b-navbar-brand>
                <b-dropdown
                    size="sm"
                    variant="light"
                    v-bind:text="configuration.version.fullVersion"
                    v-bind:disabled="busy"
                >
                    <template v-if="versions.length === 0">
                        <b-dropdown-text>No versions defined</b-dropdown-text>
                    </template>
                    <template v-else-if="versions.length &lt;= 10">
                        <b-dropdown-item
                            v-for="v in versions"
                            v-bind:key="v.fullVersion"
                            v-bind:active="v === configuration.version"
                            v-on:click.prevent="switchToVersion(v)"
                        >{{ v.fullVersion }}</b-dropdown-item>
                    </template>
                    <template v-else>
                        <b-dropdown-form>
                            <b-form-group label="Version" label-for="pcfc-menu-version">
                                <select
                                    id="pcfc-menu-version"
                                    class="form-control"
                                    v-bind:disabled="busy"
                                    v-on:change="switchToVersion(getVersionByString($event.target.value))"
                                >
                                    <option
                                        v-for="v in versions"
                                        v-bind:key="v.fullVersion"
                                        v-bind:selected="v === configuration.version"
                                        v-bind:value="v.fullVersion"
                                    >{{ v.fullVersion }}</option>
                                </select>
                            </b-form-group>
                        </b-dropdown-form>
                    </template>
                    <template v-if="versions.length &gt; 1">
                        <b-dropdown-divider></b-dropdown-divider>
                        <b-dropdown-item
                            v-bind:disabled="busy"
                            v-b-modal.compare-versions
                        >Compare versions</b-dropdown-item>
                    </template>
                </b-dropdown>
                <b-navbar-nav class="ml-auto">
                    <b-input-group size="sm">
                        <b-form-input
                            placeholder="Search"
                            v-model.trim="searchText"
                            v-on:input="applyFilter"
                            v-bind:disabled="busy"
                        ></b-form-input>
                        <b-dropdown
                            text="Sets"
                            right
                            size="sm"
                            v-if="configuration.version.fixerSets.length !== 0"
                            v-bind:disabled="busy"
                        >
                            <b-dropdown-item>
                                <div v-on:click.prevent.stop="toggleSearchFixerSet(null)">
                                    <i
                                        class="far"
                                        v-bind:class="searchFixerSets.indexOf(null) === -1 ? 'fa-square' : 'fa-check-square'"
                                    ></i>
                                    In no presets
                                </div>
                            </b-dropdown-item>
                            <b-dropdown-divider></b-dropdown-divider>
                            <b-dropdown-item
                                v-for="fixerSet in configuration.version.fixerSets"
                                v-bind:key="fixerSet.uniqueKey"
                            >
                                <div v-on:click.prevent.stop="toggleSearchFixerSet(fixerSet)">
                                    <i
                                        class="far"
                                        v-bind:class="searchFixerSets.indexOf(fixerSet) === -1 ? 'fa-square' : 'fa-check-square'"
                                    ></i>
                                    {{ fixerSet.name }}
                                </div>
                            </b-dropdown-item>
                        </b-dropdown>
                    </b-input-group>
                    <b-input-group
                        v-if="configuring"
                        class="ml-sm-1"
                        size="sm"
                    >
                        <span class="form-control configure-selected-fixer-sets">
                            <b-badge
                                v-for="(fixerSet, fixerSetIndex) in configuration.fixerSets"
                                v-bind:key="fixerSet + '@' + fixerSetIndex + '@' + configuration.fullVersion"
                                v-bind:variant="fixerSet.charAt(0) === '-' ? 'danger' : 'success'"
                            >
                                {{ fixerSet.replace(/^-/, '') }}
                                <b-badge variant="warning">
                                    <a
                                        href="#"
                                        v-on:click.prevent="unsetFixerSet(fixerSet)"
                                        v-bind:disabled="busy"
                                    >
                                        <i class="fas fa-times"></i>
                                    </a>
                                </b-badge>
                            </b-badge>
                        </span>
                        <b-dropdown
                            right
                            size="sm"
                            v-bind:disabled="busy"
                        >
                            <template slot="button-content">
                                <i class="fas fa-plus"></i>
                            </template>
                            <b-dropdown-item
                                v-for="fixerSet in unselectedFixerSets"
                                v-bind:key="fixerSet.uniqueKey"
                            >
                                <div v-on:click.prevent.stop>
                                    <b-button
                                        variant="success"
                                        size="sm"
                                        v-on:click.prevent.stop="includeFixerSet(fixerSet)"
                                    >
                                        <i class="fas fa-plus"></i>
                                    </b-button>
                                    <b-button
                                        variant="danger"
                                        size="sm"
                                        v-if="configuration.fixerSets.length"
                                        v-on:click.prevent.stop="excludeFixerSet(fixerSet)"
                                    >
                                        <i class="fas fa-minus"></i>
                                    </b-button>
                                    {{ fixerSet.name }}
                                </div>
                            </b-dropdown-item>
                        </b-dropdown>
                    </b-input-group>
                    <b-button-group
                        class="ml-sm-1"
                        size="sm"
                    >
                        <b-button
                            v-for="(viewData, viewKey) in views"
                            v-bind:key="viewKey"
                            v-bind:disabled="busy"
                            v-on:click.prevent="view = viewKey"
                            v-bind:variant="view === viewKey ? 'success' : ''"
                            v-bind:title="viewData.helpText"
                        >
                            <i v-bind:class="viewData.icon"></i>
                        </b-button>
                        <b-button
                            v-if="configuring"
                            v-bind:disabled="busy"
                            v-b-modal.import-modal
                            title="Import"
                        >
                            <i class="fas fa-file-import"></i>
                        </b-button>
                        <b-button
                            v-if="configuring"
                            accesskey="e"
                            v-bind:disabled="busy"
                            v-b-modal.export-modal
                            title="Export"
                        >
                            <i class="fas fa-file-export"></i>
                        </b-button>
                        <b-button
                            v-if="configuring"
                            v-bind:disabled="busy"
                            v-bind:variant="rememberConfiguration ? 'success' : ''"
                            v-on:click="rememberConfiguration =! rememberConfiguration"
                            title="Remember configuration"
                        >
                            <i class="fas fa-thumbtack"></i>
                        </b-button>
                        <b-button
                            v-on:click.prevent="configuring = !configuring"
                            v-bind:disabled="busy"
                            v-bind:variant="configuring ? 'success' : ''"
                            v-bind:title="configuring ? 'Switch to View mode' : 'Switch to Configuration mode'"
                        >
                            <i class="fas fa-cog"></i>
                        </b-button>
                        <b-button
                            v-on:click.prevent="hideDeprecatedFixers = !hideDeprecatedFixers"
                            v-bind:variant="hideDeprecatedFixers ? '' : 'success'"
                            v-bind:title="hideDeprecatedFixers ? 'Show deprecated fixers' : 'Hide deprecated fixers'"
                        >
                            <i class="fas fa-thumbs-down"></i>
                        </b-button>
                        <b-button
                            v-b-modal.help-modal
                            title="Get some help"
                        >
                            <i class="fas fa-question-circle"></i>
                        </b-button>
                    </b-button-group>
                </b-navbar-nav>
            </b-navbar>
        </header>

        <main>
            <b-container
                v-bind:class="hideDeprecatedFixers ? 'hide-deprecated-fixers' : ''"
                fluid
            >
                <grid-view
                    v-if="view === 'GRID'"
                    v-bind:fixers="visibleFixers"
                    v-bind:configuration="configuring ? configuration : null"
                ></grid-view>
                <table-view
                    v-if="view === 'TABLE'"
                    v-bind:fixers="visibleFixers"
                    v-bind:configuration="configuring ? configuration : null"
                ></table-view>
            </b-container>
        </main>

        <b-modal
            id="help-modal"
            title="Help"
            size="lg"
            scrollable
            no-fade
            ok-only
            ok-title="Close"
        >
            <help
                v-bind:views="views"
                v-bind:configuring="configuring"
            ></help>
        </b-modal>

        <b-modal
            id="compare-versions"
            title="Compare versions"
            size="lg"
            scrollable
            no-fade
            ok-only
            ok-title="Close"
        >
            <compare-versions
                v-bind:versions="versions"
                v-bind:initial-version="configuration.version"
            ></compare-versions>
        </b-modal>
        <b-modal
            ref="importModal"
            id="import-modal"
            title="Import"
            size="lg"
            no-fade
            v-bind:ok-title="importButtonText"
            v-on:ok.prevent="doImport()"
        >
            <import ref="importer" v-on:importButtonTextChanged="importButtonText = $event"></import>
        </b-modal>

        <b-modal
            ref="exportModal"
            id="export-modal"
            title="Export"
            size="lg"
            no-fade
            scrollable
            ok-only
            ok-title="Close"
        >
            <export
                ref="importer"
                v-bind:configuration="configuration"
            ></export>
        </b-modal>

        <b-modal
            v-if="viewingFixerOrSetAndFixer"
            ref="viewingFixerOrSetModal"
            size="xl"
            no-fade
            scrollable
            v-bind:title-html="'&lt;code&gt;' + viewingFixerOrSetAndFixer.fixerOrSet.name + '&lt;/code&gt; ' + viewingFixerOrSetAndFixer.fixerOrSet.type"
            ok-only
            v-bind:ok-title="viewingFixerOrSetAndFixerPrevious.length === 0 ? 'Close' : 'Back'"
            v-on:hide="viewPreviousFixerOrSet"
        >
            <view-fixer
                v-if="viewingFixerOrSetAndFixer.fixerOrSet.type === 'fixer'"
                v-bind:fixer="viewingFixerOrSetAndFixer.fixerOrSet"
            ></view-fixer>
            <view-fixer-set
                v-else-if="viewingFixerOrSetAndFixer.fixerOrSet.type === 'fixer set'"
                v-bind:fixer-set="viewingFixerOrSetAndFixer.fixerOrSet"
                v-bind:highlight-fixer="viewingFixerOrSetAndFixer.highlightFixer"
            ></view-fixer-set>
        </b-modal>

        <b-modal
            v-if="configuringFixer"
            ref="configureFixerModal"
            size="xl"
            v-bind:title-html="'Configure &lt;code&gt;' + configuringFixer.name + '&lt;/code&gt;'"
            v-on:hidden="configuringFixer = null"
            ok-title="Apply"
            v-on:ok.prevent="applyFixerConfiguration()"
        >
            <configure-fixer
                ref="fixer-configurator"
                v-bind:configuration="configuration"
                v-bind:fixer="configuringFixer"
            ></configure-fixer>
        </b-modal>
    </div>
</template>


<script lang="ts">
import CompareVersions from './CompareVersions.vue';
import Configuration, { SerializedConfigurationInterface } from '../Configuration';
import ConfigureFixer from './ConfigureFixer.vue';
import EventBus from '../EventBus';
import Fixer from '../Fixer';
import FixerOrSetInterface from '../FixerOrSetInterface';
import FixerSet from '../FixerSet';
import FixerOrSetAndFixerInterface from '../FixerOrSetAndFixerInterface';
import { getSearchableArray } from '../Utils';
import GridView from './GridView.vue';
import Export from './Export.vue';
import Help from './Help.vue';
import Import from './Import.vue';
import * as LocationHash from '../LocationHash';
import * as PersistentStorage from '../PersistentStorage';
import TableView from './TableView.vue';
import Version from '../Version';
import ViewFixer from './ViewFixer.vue';
import ViewFixerSet from './ViewFixerSet.vue';
import Vue from 'vue';
import { createGzip } from 'zlib';
import { debuglog } from 'util';
import { BModal } from 'bootstrap-vue';

export default Vue.extend({
    components: {
        CompareVersions,
        ConfigureFixer,
        Import,
        Export,
        GridView,
        Help,
        TableView,
        ViewFixer,
        ViewFixerSet,
    },
    props: {
        versions: {
            type: Array as (() => Version[]),
            required: true,
        },
        initialVersion: {
            type: Object as (() => Version),
            required: true,
        },
        initialSerializedConfiguration: {
            type: Object as (() => SerializedConfigurationInterface),
            required: false,
            default: undefined,
        },
        initialLocationHash: {
            type: Object as (() => LocationHash.HashData),
            required: false,
            default: undefined,
        },
    },
    data: function() {
        return {
            searchText: <string>'',
            searchFixerSets: <(FixerSet | null)[]>[],
            busy: <boolean>false,
            configuring: <boolean>false,
            configuration: <Configuration>(<any>undefined),
            hideDeprecatedFixers: PersistentStorage.getBoolean('hideDeprecatedFixers'),
            visibleFixers: <Fixer[]>[],
            views: {
                GRID: {
                    icon: 'fas fa-th',
                    helpText: 'Switch to grid view',
                },
                TABLE: {
                    icon: 'fas fa-bars',
                    helpText: 'Switch to list view',
                },
            },
            view: PersistentStorage.getString('view', 'GRID', ['GRID', 'TABLE']),
            viewingFixerOrSetAndFixer: <FixerOrSetAndFixerInterface | null>null,
            viewingFixerOrSetAndFixerPrevious: <FixerOrSetAndFixerInterface[]>[],
            configuringFixer: <Fixer | null>null,
            rememberConfiguration: PersistentStorage.getBoolean('remember-configuration', true),
            importButtonText: '...',
        };
    },
    beforeMount: function() {
        if (this.initialSerializedConfiguration) {
            this.configuration = Configuration.fromSerializedConfiguration(this.initialVersion, this.initialSerializedConfiguration);
        } else {
            this.configuration = new Configuration(this.initialVersion);
        }
        EventBus.$on('fixer-clicked', (fixer: Fixer) => {
            this.viewFixerOrSet({fixerOrSet: fixer});
        });
        EventBus.$on('fixerset-clicked', (data: FixerOrSetAndFixerInterface) => {
            this.viewFixerOrSet(data);
        });
        EventBus.$on('fixer-configure', (fixer: Fixer) => {
            this.configureFixer(fixer);
        });
        EventBus.$on('configuration-changed', (fixer: Fixer) => {
            this.persistConfiguration();
        });
        let fixerOrSet: FixerOrSetInterface | null = null;
        this.visibleFixers = this.configuration.version.fixers;
        if (this.initialLocationHash) {
            this.configuring = this.initialLocationHash.configuring;

            if (this.initialLocationHash.fixerOrSetName.length !== 0) {
                if (this.initialLocationHash.fixerOrSetName.charAt(0) === '@') {
                    fixerOrSet = this.configuration.version.getFixerSetByName(this.initialLocationHash.fixerOrSetName);
                    if (fixerOrSet === null) {
                        console.warn(`Unable to find a fixer set named "${this.initialLocationHash.fixerOrSetName}" for version ${this.configuration.version.majorMinorVersion}`);
                    }
                } else {
                    fixerOrSet = this.configuration.version.getFixerByName(this.initialLocationHash.fixerOrSetName);
                    if (fixerOrSet === null) {
                        console.warn(`Unable to find a fixer named "${this.initialLocationHash.fixerOrSetName}" for version ${this.configuration.version.majorMinorVersion}`);
                    }
                }
            }
        }
        if (fixerOrSet === null) {
            this.refreshLocationHash();
        } else {
            this.viewFixerOrSet({fixerOrSet});
        }
    },
    mounted() {
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if (
                e.target instanceof HTMLInputElement
                || e.target instanceof HTMLTextAreaElement
                || e.target instanceof HTMLSelectElement
            ) {
                return;
            }
            if (
                this.viewingFixerOrSetAndFixer === null
                || this.viewingFixerOrSetAndFixer.fixerOrSet.type !== 'fixer'
                || this.viewingFixerOrSetAndFixer === null
            ) {
                return;
            }
            let delta;
            switch (e.code) {
                case 'ArrowLeft':
                    delta = -1;
                    break;
                case 'ArrowRight':
                    delta = 1;
                    break;
                default:
                    return;
            }
            const oldIndex = this.visibleFixers.indexOf(<Fixer>this.viewingFixerOrSetAndFixer.fixerOrSet);
            if (oldIndex < 0) {
                return;
            }
            const newIndex = oldIndex + delta;
            if (newIndex < 0 || newIndex >= this.visibleFixers.length) {
                return;
            }
            this.viewingFixerOrSetAndFixer = null;
            this.viewFixerOrSet({fixerOrSet: this.visibleFixers[newIndex]});
        });
    },
    computed: {
        unselectedFixerSets: function(): FixerSet[] {
            const selectedFixerSetNames: string[] = this.configuration.fixerSets.map((fixerSetName: string): string => {
                return fixerSetName.charAt(0) === '-' ? fixerSetName.substr(1) : fixerSetName;
            });
            return this.configuration.version.fixerSets.filter((fixerSet: FixerSet): boolean => {
                return selectedFixerSetNames.indexOf(fixerSet.name) < 0;
            });
        },
    },
    methods: {
        getVersionByString: function(versionText: string): Version|null {
            for (const v of this.versions) {
                if (v.fullVersion === versionText) {
                    return v;
                }
            }
            return null;
        },
        switchToVersion: function(version: Version) {
            var my = this;
            if (my.busy || version === this.configuration.version) {
                return;
            }
            if (version.loaded) {
                my.switchToLoadedVersion(version);
                return;
            }
            my.busy = true;
            version
                .load()
                .then(() => {
                    my.switchToLoadedVersion(version);
                    my.busy = false;
                })
                .catch(error => {
                    my.busy = false;
                    window.alert(error);
                });
        },
        switchToLoadedVersion: function(version: Version) {
            const warnings: string[] = this.configuration.setVersion(version);
            if (warnings.length !== 0) {
                console.warn('Warnings detected while switching to the new version', warnings);
            }
            this.versionChanged();
        },
        toggleSearchFixerSet: function(fixerSet: FixerSet | null) {
            let index = this.searchFixerSets.indexOf(fixerSet);
            if (index < 0) {
                this.searchFixerSets.push(fixerSet);
            } else {
                this.searchFixerSets.splice(index, 1);
            }
            this.applyFilter();
        },
        applyFilter: function() {
            let searchKeywords = getSearchableArray(this.searchText);
            this.visibleFixers.splice(0, this.visibleFixers.length);
            this.configuration.version.fixers.forEach((fixer: Fixer): void => {
                if (fixer.satisfySearch(searchKeywords, this.searchFixerSets)) {
                    this.visibleFixers.push(fixer);
                }
            });
        },
        includeFixerSet: function(fixerSet: FixerSet): void {
            this.configuration.includeFixerSet(fixerSet);
            this.persistConfiguration();
        },
        excludeFixerSet: function(fixerSet: FixerSet): void {
            this.configuration.excludeFixerSet(fixerSet);
            this.persistConfiguration();
        },
        unsetFixerSet: function(fixerSetName: string): void {
            const actualFixerSetName = fixerSetName.charAt(0) === '-' ? fixerSetName.substr(1) : fixerSetName;
            const fixerSet = this.configuration.version.getFixerSetByName(actualFixerSetName);
            this.configuration.unsetFixerSet(<FixerSet>fixerSet);
            this.persistConfiguration();
        },
        doImport: function() {
            var configuration: SerializedConfigurationInterface | null;
            try {
                configuration = (<any>this.$refs.importer).doImport();
            } catch (e) {
                window.alert(e);
                return;
            }
            this.applyConfiguration(configuration, true).then(() => {
                this.$nextTick(() => {
                    (<BModal>this.$refs.importModal).hide();
                });
            });
        },
        applyConfiguration: function(configuration: SerializedConfigurationInterface | null, askSwitchVersion: boolean = false): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                if (!askSwitchVersion || configuration === null || configuration.version === undefined) {
                    this.applyConfigurationWithVersion(configuration, this.configuration.version);
                    resolve();
                    return;
                }
                let versionFromConfiguration: Version | undefined;
                this.versions.some((v: Version) => {
                    if (configuration.version === v.majorMinorVersion || (<string>configuration.version).indexOf(v.majorMinorVersion + '.') === 0) {
                        versionFromConfiguration = v;
                    }
                    return versionFromConfiguration !== undefined;
                });
                if (versionFromConfiguration === undefined) {
                    console.warn(`The data for PHP-CS-Fixer v${configuration.version} is not defined`);
                    this.applyConfigurationWithVersion(configuration, this.configuration.version);
                    resolve();
                    return;
                }
                if (versionFromConfiguration === this.configuration.version || !window.confirm(`The configuration is for version ${versionFromConfiguration.majorMinorVersion} instead of ${this.configuration.version.majorMinorVersion}\nDo you want to switch to it?`)) {
                    this.applyConfigurationWithVersion(configuration, this.configuration.version);
                    resolve();
                    return;
                }
                this.busy = true;
                (<Version>versionFromConfiguration).load().then(() => {
                    this.busy = false;
                    this.applyConfigurationWithVersion(configuration, <Version>versionFromConfiguration);
                    resolve();
                });
            });
        },
        applyConfigurationWithVersion: function(configuration: SerializedConfigurationInterface | null, version: Version) {
            if (configuration === null) {
                this.configuration.clear();
                if (version === this.configuration.version) {
                    return;
                }
                this.configuration.setVersion(version);
            } else {
                const warnings: string[] = [];
                this.configuration = Configuration.fromSerializedConfiguration(version, configuration, warnings);
                if (warnings.length !== 0) {
                    console.warn('Warnings loading the configuration:', warnings);
                }
            }
            this.versionChanged();
        },
        viewFixerOrSet: function(data: FixerOrSetAndFixerInterface) {
            if (this.viewingFixerOrSetAndFixer !== null) {
                this.viewingFixerOrSetAndFixerPrevious.push(this.viewingFixerOrSetAndFixer);
            }
            this.viewingFixerOrSetAndFixer = data;
            this.$nextTick(() => {
                (<BModal>this.$refs.viewingFixerOrSetModal).show();
            });
        },
        viewPreviousFixerOrSet: function(e: Event) {
            this.viewingFixerOrSetAndFixer = this.viewingFixerOrSetAndFixerPrevious.pop() || null;
            if (this.viewingFixerOrSetAndFixer === null) {
                return;
            }
            e.preventDefault();
        },
        refreshLocationHash: function() {
            LocationHash.toWindowLocation(LocationHash.HashData.create(this.configuration.version, this.configuring, this.viewingFixerOrSetAndFixer ? this.viewingFixerOrSetAndFixer.fixerOrSet : null));
        },
        configureFixer: function(fixer: Fixer) {
            this.configuringFixer = fixer;
            this.$nextTick(() => {
                (<BModal>this.$refs.configureFixerModal).show();
            });
        },
        applyFixerConfiguration: function() {
            let configuration: object | null;
            try {
                configuration = (<any>this.$refs['fixer-configurator']).buildConfiguration();
            } catch (e) {
                this.$nextTick((): void => {
                    window.alert(e);
                });
                return;
            }
            if (configuration === null) {
                this.configuration.includeFixer(<Fixer>this.configuringFixer);
            } else {
                this.configuration.includeFixerWithConfiguration(<Fixer>this.configuringFixer, configuration);
            }
            (<BModal>this.$refs.configureFixerModal).hide();
            this.configuringFixer = null;
            EventBus.$emit('configuration-changed');
        },
        versionChanged: function() {
            let searchFixerSetsNames = [];
            while (this.searchFixerSets.length > 0) {
                let fixerSet = this.searchFixerSets.pop();
                searchFixerSetsNames.push(fixerSet === null ? '' : (<FixerSet>fixerSet).name);
            }
            searchFixerSetsNames.forEach(fixerSetName => {
                if (fixerSetName.length === 0) {
                    this.searchFixerSets.push(null);
                } else {
                    let fixerSet = this.configuration.version.getFixerSetByName(fixerSetName);
                    if (fixerSet !== null) {
                        this.searchFixerSets.push(fixerSet);
                    }
                }
            });
            this.refreshLocationHash();
            this.applyFilter();
            this.persistConfiguration();
        },
        persistConfiguration: function(): void {
            if (this.rememberConfiguration) {
                PersistentStorage.setObject('configuration', this.configuration.serialize());
            }
        },
    },
    watch: {
        view: function(view: string): void {
            PersistentStorage.setString('view', view);
        },
        hideDeprecatedFixers: function(hideDeprecatedFixers: boolean): void {
            PersistentStorage.setBoolean('hideDeprecatedFixers', hideDeprecatedFixers);
        },
        viewingFixerOrSetAndFixer: function() {
            this.refreshLocationHash();
        },
        configuring: function() {
            this.refreshLocationHash();
        },
        rememberConfiguration: function(rememberConfiguration: boolean): void {
            PersistentStorage.setBoolean('remember-configuration', rememberConfiguration);
            if (rememberConfiguration) {
                this.persistConfiguration();
            } else {
                PersistentStorage.remove('configuration');
            }
        },
    },
});
</script>
