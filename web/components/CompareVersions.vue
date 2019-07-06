<template>
    <div>
        <b-container>
            <b-row>
                <b-col>
                    <b-input-group prepend="Compare">
                        <b-form-select
                            v-model="newerVersionIndex"
                            v-bind:options="newerVersionOptions"
                            v-on:change="refreshComparison"
                        ></b-form-select>
                    </b-input-group>
                </b-col>
                <b-col>
                    <b-input-group prepend="With">
                        <b-form-select
                            v-model="olderVersionIndex"
                            v-bind:options="olderVersionOptions"
                            v-on:change="refreshComparison"
                        ></b-form-select>
                    </b-input-group>
                </b-col>
            </b-row>
        </b-container>
        <div
            v-if="changes === null"
            class="text-center"
        >
            <br />Loading version data...
            <br />
            <br />
            <i class="fas fa-circle-notch fa-spin"></i>
        </div>
        <template v-else>
            <b-alert
                v-if="changes.empty"
                show
                variant="info"
                class="mt-1"
            >No changes detected</b-alert>
            <div
                v-else
                role="tablist"
            >
                <b-card
                    no-body
                    class="mt-1"
                    v-if="changes.addedFixers.length !== 0"
                >
                    <b-card-header
                        header-tag="header"
                        class="p-1"
                        role="tab"
                    >
                        <b-button
                            block
                            href="#"
                            v-b-toggle.pcf-compareversions-added-fixers
                            variant="info"
                        >Added fixers ({{ changes.addedFixers.length}})</b-button>
                    </b-card-header>
                    <b-collapse
                        id="pcf-compareversions-added-fixers"
                        accordion="pcf-compareversions"
                        role="tabpanel"
                    >
                        <b-card-body>
                            <table class="table table-striped">
                                <tbody>
                                    <tr
                                        v-for="fixer in changes.addedFixers"
                                        v-bind:key="fixer.uniqueKey"
                                    >
                                        <td>
                                            <fixer-link v-bind:fixer="fixer">{{ fixer.name }}</fixer-link>
                                            <div
                                                v-if="fixer.summaryHtml"
                                                v-html="fixer.summaryHtml"
                                            ></div>
                                            <div
                                                v-else-if="fixer.descriptionHtml"
                                                v-html="fixer.descriptionHtml"
                                            ></div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </b-card-body>
                    </b-collapse>
                </b-card>
                <b-card
                    no-body
                    class="mt-1"
                    v-if="changes.removedFixers.length !== 0"
                >
                    <b-card-header
                        header-tag="header"
                        class="p-1"
                        role="tab"
                    >
                        <b-button
                            block
                            href="#"
                            v-b-toggle.pcf-compareversions-removed-fixers
                            variant="info"
                        >Removed fixers ({{ changes.removedFixers.length}})</b-button>
                    </b-card-header>
                    <b-collapse
                        id="pcf-compareversions-removed-fixers"
                        accordion="pcf-compareversions"
                        role="tabpanel"
                    >
                        <b-card-body>
                            <table class="table table-striped">
                                <tbody>
                                    <tr
                                        v-for="fixer in changes.removedFixers"
                                        v-bind:key="fixer.uniqueKey"
                                    >
                                        <td>
                                            <fixer-link v-bind:fixer="fixer">{{ fixer.name }}</fixer-link>
                                            <div
                                                v-if="fixer.summaryHtml"
                                                v-html="fixer.summaryHtml"
                                            ></div>
                                            <div
                                                v-else-if="fixer.descriptionHtml"
                                                v-html="fixer.descriptionHtml"
                                            ></div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </b-card-body>
                    </b-collapse>
                </b-card>
                <b-card
                    no-body
                    class="mt-1"
                    v-if="changes.changedFixers.length !== 0"
                >
                    <b-card-header
                        header-tag="header"
                        class="p-1"
                        role="tab"
                    >
                        <b-button
                            block
                            href="#"
                            v-b-toggle.pcf-compareversions-changed-fixers
                            variant="info"
                        >Changed fixers ({{ changes.changedFixers.length}})</b-button>
                    </b-card-header>
                    <b-collapse
                        id="pcf-compareversions-changed-fixers"
                        accordion="pcf-compareversions"
                        role="tabpanel"
                    >
                        <b-card-body>
                            <table class="table table-striped">
                                <tbody>
                                    <tr
                                        v-for="changes in changes.changedFixers"
                                        v-bind:key="changes.newerFixer.uniqueKey + ' vs ' + changes.olderFixer.uniqueKey"
                                    >
                                        <td>
                                            <b>{{ changes.newerFixer.name }}</b>
                                            <fixer-link v-bind:fixer="changes.newerFixer">
                                                <template v-slot:badge-contents>v.{{ changes.newerFixer.version.mayorMinorVersion }}</template>
                                            </fixer-link>&nbsp;vs
                                            <fixer-link v-bind:fixer="changes.olderFixer">
                                                <template v-slot:badge-contents>v.{{ changes.olderFixer.version.mayorMinorVersion }}</template>
                                            </fixer-link>
                                            <ul>
                                                <li
                                                    v-for="(difference, differenceIndex) in changes.differences"
                                                    v-bind:key="differenceIndex"
                                                    v-html="textToHtml(difference)"
                                                ></li>
                                            </ul>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </b-card-body>
                    </b-collapse>
                </b-card>
                <b-card
                    no-body
                    class="mt-1"
                    v-if="changes.addedFixerSets.length !== 0"
                >
                    <b-card-header
                        header-tag="header"
                        class="p-1"
                        role="tab"
                    >
                        <b-button
                            block
                            href="#"
                            v-b-toggle.pcf-compareversions-added-fixersets
                            variant="info"
                        >Added fixer sets ({{ changes.addedFixerSets.length}})</b-button>
                    </b-card-header>
                    <b-collapse
                        id="pcf-compareversions-added-fixersets"
                        accordion="pcf-compareversions"
                        role="tabpanel"
                    >
                        <b-card-body>
                            <table class="table table-striped">
                                <tbody>
                                    <tr
                                        v-for="fixerSet in changes.addedFixerSets"
                                        v-bind:key="fixerSet.uniqueKey"
                                    >
                                        <td>
                                            <fixer-set-link v-bind:fixer-set="fixerSet">{{ fixerSet.name }}</fixer-set-link>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </b-card-body>
                    </b-collapse>
                </b-card>
                <b-card
                    no-body
                    class="mt-1"
                    v-if="changes.removedFixerSets.length !== 0"
                >
                    <b-card-header
                        header-tag="header"
                        class="p-1"
                        role="tab"
                    >
                        <b-button
                            block
                            href="#"
                            v-b-toggle.pcf-compareversions-removed-fixersets
                            variant="info"
                        >Removed fixer sets ({{ changes.removedFixerSets.length}})</b-button>
                    </b-card-header>
                    <b-collapse
                        id="pcf-compareversions-removed-fixersets"
                        accordion="pcf-compareversions"
                        role="tabpanel"
                    >
                        <b-card-body>
                            <table class="table table-striped">
                                <tbody>
                                    <tr
                                        v-for="fixerSet in changes.removedFixerSets"
                                        v-bind:key="fixerSet.uniqueKey"
                                    >
                                        <td>
                                            <fixer-set-link v-bind:fixer-set="fixerSet">{{ fixerSet.name }}</fixer-set-link>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </b-card-body>
                    </b-collapse>
                </b-card>
                <b-card
                    no-body
                    class="mt-1"
                    v-if="changes.changedFixerSets.length !== 0"
                >
                    <b-card-header
                        header-tag="header"
                        class="p-1"
                        role="tab"
                    >
                        <b-button
                            block
                            href="#"
                            v-b-toggle.pcf-compareversions-changed-fixersets
                            variant="info"
                        >Changed fixer sets ({{ changes.changedFixerSets.length}})</b-button>
                    </b-card-header>
                    <b-collapse
                        id="pcf-compareversions-changed-fixersets"
                        accordion="pcf-compareversions"
                        role="tabpanel"
                    >
                        <b-card-body>
                            <table class="table table-striped">
                                <tbody>
                                    <tr
                                        v-for="changes in changes.changedFixerSets"
                                        v-bind:key="changes.newerFixerSet.uniqueKey + ' vs ' + changes.olderFixerSet.uniqueKey"
                                    >
                                        <td>
                                            <b>{{ changes.newerFixerSet.name }}</b>
                                            <fixer-set-link v-bind:fixer-set="changes.newerFixerSet">
                                                <template v-slot:badge-contents>v.{{ changes.newerFixerSet.version.mayorMinorVersion }}</template>
                                            </fixer-set-link>&nbsp;vs
                                            <fixer-set-link v-bind:fixer-set="changes.olderFixerSet">
                                                <template v-slot:badge-contents>v.{{ changes.olderFixerSet.version.mayorMinorVersion }}</template>
                                            </fixer-set-link>
                                            <ul>
                                                <li
                                                    v-for="(difference, differenceIndex) in changes.differences"
                                                    v-bind:key="differenceIndex"
                                                    v-html="textToHtml(difference)"
                                                ></li>
                                            </ul>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </b-card-body>
                    </b-collapse>
                </b-card>
            </div>
        </template>
    </div>
</template>

<script lang="ts">
import FixerLink from './FixerLink.vue';
import FixerSetLink from './FixerSetLink.vue';
import { textToHtml } from '../Utils';
import Version from '../Version';
import { VersionChanges, compareVersions } from '../VersionComparison';
import Vue from 'vue';

export default Vue.extend({
    components: {
        FixerLink,
        FixerSetLink,
    },
    props: {
        versions: {
            type: Array,
            validator: (prop: Array<any>): boolean => {
                if (prop.length < 2) {
                    return false;
                }
                return prop.every((e: any): boolean => {
                    return e instanceof Version;
                });
            },
            required: true,
        },
        initialVersion: {
            type: Object as (() => Version),
            required: false,
            default: undefined,
        },
    },
    data: function() {
        return {
            newerVersionIndex: <number>(<any>undefined),
            olderVersionIndex: <number>(<any>undefined),
            newerVersionOptions: <any>[],
            changes: <VersionChanges | null>null,
        };
    },
    beforeMount: function() {
        this.newerVersionIndex = this.initialVersion ? Math.min(Math.max(this.versions.indexOf(this.initialVersion), 0), this.versions.length - 1) : 0;
        this.olderVersionIndex = this.newerVersionIndex + 1;
        let newerVersionOptions: Array<any> = [];
        for (let index = 0; index < this.versions.length; index++) {
            newerVersionOptions.push({ value: index, text: this.versions[index].fullVersion, disabled: index === this.versions.length - 1 });
        }
        this.newerVersionOptions = newerVersionOptions;
        this.refreshComparison();
    },
    computed: {
        olderVersionOptions: function(): Array<any> {
            let olderVersionOptions: Array<any> = [];
            for (let index = 0; index < this.versions.length; index++) {
                olderVersionOptions.push({ value: index, text: this.versions[index].fullVersion, disabled: index <= this.newerVersionIndex });
            }
            return olderVersionOptions;
        },
        newerVersion: function(): Version {
            return this.versions[this.newerVersionIndex];
        },
        olderVersion: function(): Version {
            return this.versions[this.olderVersionIndex];
        },
    },
    watch: {
        newerVersionIndex: function(newerVersionIndex) {
            if (this.olderVersionIndex <= newerVersionIndex) {
                this.olderVersionIndex = newerVersionIndex + 1;
            }
        },
    },
    methods: {
        textToHtml: function(text: string): string {
            return textToHtml(text, true);
        },
        refreshComparison: function() {
            this.changes = null;
            compareVersions(this.newerVersion, this.olderVersion).then(changes => {
                if (changes.newerVersion === this.newerVersion && changes.olderVersion === this.olderVersion) {
                    this.changes = changes;
                }
            });
        },
    },
});
</script>

<style scoped>
.card-body {
    padding: 0;
}
.card-body table {
    margin-bottom: 0;
}
.card-body ul {
    margin-bottom: 0;
}
</style>
