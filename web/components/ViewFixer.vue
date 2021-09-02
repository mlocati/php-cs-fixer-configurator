<template>
    <div>
        <template v-if="fixer.codeSamples.length">
            <b-select
                v-bind:class="manyCodeSamples ? '' : 'd-lg-none .d-xl-block'"
                v-model="tab"
                v-bind:options="tabOptions"
            ></b-select>
            <b-tabs
                v-if="!manyCodeSamples"
                class="d-none d-lg-block"
            >
                <template slot="tabs">
                    <b-nav-item
                        v-for="tabOption in tabOptions"
                        v-bind:key="tabOption.value"
                        href="#"
                        v-on:click.prevent="tab = tabOption.value"
                        v-bind:active="tab === tabOption.value"
                    >{{ tabOption.text }}</b-nav-item>
                </template>
            </b-tabs>
        </template>
        <div class="tab-content container-fluid mt-3">
            <div
                class="tab-pane"
                v-bind:class="tab === 'general' ? 'active' : ''"
            >
                <dl class="row">
                    <template v-if="fixer.risky">
                        <dt class="col-sm-3">Risky</dt>
                        <dd class="col-sm-9">
                            <b-alert
                                show
                                variant="danger"
                            >
                                <i class="fas fa-exclamation-triangle"></i>
                                <span
                                    v-if="fixer.riskyDescriptionHtml"
                                    v-html="fixer.riskyDescriptionHtml"
                                ></span>
                                <template v-else>This fixer is marked as risky!</template>
                            </b-alert>
                        </dd>
                    </template>
                    <template v-if="fixer.deprecated_switchTo !== null">
                        <dt class="col-sm-3">Deprecated</dt>
                        <dd class="col-sm-9">
                            <b-alert
                                show
                                variant="warning"
                            >
                                <i
                                    class="fa fa-thumbs-down"
                                    aria-hidden="true"
                                ></i>
                                <template v-if="fixer.deprecated_switchTo.length === 0">
                                    No successor has been defined.
                                </template>
                                <template v-else>
                                    Please use
                                    <ul class="list-unstyled">
                                        <li
                                            v-for="deprecated_switchTo in fixer.deprecated_switchTo"
                                            v-bind:key="deprecated_switchTo.uniqueKey"
                                        >
                                            <fixer-link v-bind:fixer="deprecated_switchTo"></fixer-link>
                                        </li>
                                    </ul>
                                </template>
                            </b-alert>
                        </dd>
                    </template>
                    <template v-if="fixer.summaryHtml">
                        <dt class="col-sm-3">Summary</dt>
                        <dd
                            class="col-sm-9"
                            v-html="fixer.summaryHtml"
                        ></dd>
                    </template>
                    <template v-if="fixer.descriptionHtml">
                        <dt class="col-sm-3">Description</dt>
                        <dd
                            class="col-sm-9"
                            v-html="fixer.descriptionHtml"
                        ></dd>
                    </template>
                    <template v-if="fixer.fixerSets.length">
                        <dt class="col-sm-3">Used in presets</dt>
                        <dd class="col-sm-9">
                            <fixer-set-link
                                v-for="fixerSet in fixer.fixerSets"
                                v-bind:key="fixerSet.uniqueKey"
                                v-bind:fixer-set="fixerSet"
                                v-bind:highlight-fixer="fixer"
                            ></fixer-set-link>
                        </dd>
                    </template>
                    <template v-if="fixer.supersedes.length">
                        <dt class="col-sm-3">Supersedes</dt>
                        <dd class="col-sm-9">
                            <ul class="list-unstyled">
                                <li
                                    v-for="superseded in fixer.supersedes"
                                    v-bind:key="superseded.uniqueKey"
                                >
                                    <fixer-link v-bind:fixer="superseded"></fixer-link>
                                </li>
                            </ul>
                        </dd>
                    </template>
                    <template v-if="fixer.options.length === 0">
                        <dt class="col-sm-3">Configuration</dt>
                        <dd class="col-sm-9">This fixer is not configurable</dd>
                    </template>
                </dl>
                <div
                    v-for="(option, optionIndex) in fixer.options"
                    v-bind:key="optionIndex"
                    class="row"
                >
                    <b-card class="w-100 mb-2">
                        <template slot="header">
                            <code>{{ option.name }}</code> option
                        </template>
                        <b-card-text v-if="option.description">
                            <div v-html="textToHtml(option.description)"></div>
                        </b-card-text>
                        <dl class="row">
                            <template v-if="option.alias">
                                <dt class="col-sm-3">Alias</dt>
                                <dd class="col-sm-9">
                                    <code>{{ option.alias }}</code>
                                </dd>
                            </template>
                            <template v-if="option.hasOwnProperty('allowedTypes')">
                                <dt class="col-sm-3">Allowed types</dt>
                                <dd class="col-sm-9">
                                    <ul class="list-unstyled">
                                        <li
                                            v-for="(allowedType, allowedTypeIndex) in option.allowedTypes"
                                            v-bind:key="allowedTypeIndex"
                                        >
                                            <code>{{ allowedType }}</code>
                                        </li>
                                    </ul>
                                </dd>
                            </template>
                            <template v-if="option.hasOwnProperty('allowedValues')">
                                <dt class="col-sm-3">Allowed values</dt>
                                <dd class="col-sm-9">
                                    <prism
                                        language="php"
                                        v-bind:code="toPhp(option.allowedValues)"
                                    ></prism>
                                </dd>
                            </template>
                            <template v-if="option.hasOwnProperty('defaultValue')">
                                <dt class="col-sm-3">Default value</dt>
                                <dd class="col-sm-9">
                                    <prism
                                        language="php"
                                        v-bind:code="toPhp(option.defaultValue)"
                                    ></prism>
                                </dd>
                            </template>
                        </dl>
                    </b-card>
                </div>
            </div>
            <template v-for="(codeSample, codeSampleIndex) in fixer.codeSamples">
                <div
                    v-bind:key="codeSampleIndex"
                    class="tab-pane"
                    v-bind:class="tab === 'codesample-' + codeSampleIndex ? 'active' : ''"
                >
                    <template v-if="fixer.options.length">
                        <b-card
                            header="Configuration"
                            class="w-100"
                        >
                            <ul
                                class="mb-0 list-unstyled"
                                v-if="codeSample.hasOwnProperty('configuration')"
                            >
                                <li
                                    v-for="(optionValue, optionKey) in codeSample.configuration"
                                    v-bind:key="optionKey"
                                >
                                    <b-badge>{{ optionKey }}</b-badge>
                                    <prism
                                        language="php"
                                        v-bind:code="toPhp(optionValue)"
                                        class="mt-n2"
                                    ></prism>
                                </li>
                            </ul>
                            <i v-else>Default configuration</i>
                        </b-card>
                    </template>
                    <div class="d-none d-xl-block">
                        <span style="position: absolute; right:31px; margin-top: 10px">
                            <b-button
                                v-bind:variant="examplesView === EXAMPLES_VIEW.tabs ? 'success' : 'default'"
                                size="sm"
                                v-on:click.prevent="examplesView = EXAMPLES_VIEW.tabs"
                                title="Tab view"
                            >
                                <i class="far fa-square"></i>
                            </b-button>
                            <b-button
                                v-bind:variant="examplesView === EXAMPLES_VIEW.sideBySide ? 'success' : 'default'"
                                size="sm"
                                v-on:click.prevent="examplesView = EXAMPLES_VIEW.sideBySide"
                                title="Side-by-side view"
                            >
                                <i class="fas fa-columns"></i>
                            </b-button>
                            <b-button
                                v-bind:variant="examplesView === EXAMPLES_VIEW.diff ? 'success' : 'default'"
                                size="sm"
                                v-on:click.prevent="examplesView = EXAMPLES_VIEW.diff"
                                title="Diff view"
                            >
                                <i class="fas fa-grip-lines"></i>
                            </b-button>
                        </span>
                        <div class="mt-3">
                            <b-tabs
                                v-if="examplesView === EXAMPLES_VIEW.tabs"
                                content-class="mt-3"
                                no-fade
                            >
                                <b-tab
                                    title="Input"
                                    active
                                >
                                    <prism
                                        language="php"
                                        v-bind:code="codeSample.from"
                                        show-invisibles
                                    ></prism>
                                </b-tab>
                                <b-tab title="Output">
                                    <prism
                                        language="php"
                                        v-bind:code="codeSample.to"
                                        show-invisibles
                                    ></prism>
                                </b-tab>
                            </b-tabs>
                            <table
                                v-else-if="examplesView === EXAMPLES_VIEW.sideBySide"
                                class="table"
                            >
                                <thead>
                                    <tr>
                                        <th>Input</th>
                                        <th>Output</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <prism
                                                language="php"
                                                v-bind:code="codeSample.from"
                                                show-invisibles
                                            ></prism>
                                        </td>
                                        <td>
                                            <prism
                                                language="php"
                                                v-bind:code="codeSample.to"
                                                show-invisibles
                                            ></prism>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <prism
                                v-else
                                language="diff"
                                v-bind:code="getCodeSampleDiff(codeSample)"
                                show-invisibles
                            ></prism>
                        </div>
                        <div>
                        </div>
                    </div>
                    <b-tabs
                        class="mt-3 d-xl-none"
                        content-class="mt-3"
                        no-fade
                    >
                        <b-tab
                            title="Input"
                            active
                        >
                            <prism
                                language="php"
                                v-bind:code="codeSample.from"
                                show-invisibles
                            ></prism>
                        </b-tab>
                        <b-tab title="Output">
                            <prism
                                language="php"
                                v-bind:code="codeSample.to"
                                show-invisibles
                            ></prism>
                        </b-tab>
                    </b-tabs>
                </div>
            </template>
            <div
                class="tab-pane"
                v-bind:class="tab === 'history' ? 'active' : ''"
            >
                <div v-if="history === null">
                    Loading version data... <i class="fas fa-circle-notch fa-spin"></i>
                </div>
                <div v-else-if="history.length === 0">
                    No changes detected across versions.
                </div>
                <div v-else>
                    <div v-for="(historyEntry, historyEntryIndex) in history" v-bind:key="fixer.name + '@' + historyEntry.version.majorMinorVersion + '@' + historyEntryIndex">
                        <h6>
                            Changes in version {{ historyEntry.version.majorMinorVersion }}
                            <fixer-link v-if="historyEntry.previousVersionFixer" v-bind:fixer="historyEntry.previousVersionFixer" v-bind:disabled="historyEntry.previousVersionFixer === fixer">
                                <template v-slot:badge-contents>view v.{{ historyEntry.previousVersionFixer.version.majorMinorVersion }}</template>
                            </fixer-link>
                            <fixer-link v-if="historyEntry.newerVersionFixer" v-bind:fixer="historyEntry.newerVersionFixer" v-bind:disabled="historyEntry.newerVersionFixer === fixer">
                                <template v-slot:badge-contents>view v.{{ historyEntry.newerVersionFixer.version.majorMinorVersion }}</template>
                            </fixer-link>
                        </h6>
                        <ul>
                            <li
                                v-for="(difference, differenceIndex) in historyEntry.differences"
                                v-bind:key="differenceIndex"
                            >
                                <view-difference v-bind:difference="difference" />
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { createTwoFilesPatch } from 'diff';
import Fixer from '../Fixer';
import FixerLink from './FixerLink.vue';
import FixerSetLink from './FixerSetLink.vue';
import { getFixerHistory, FixerHistoryEntry } from '../VersionComparison';
import { PFCFixerCodeSample } from '../PCFDataDefinitions';
import * as PersistentStorage from '../PersistentStorage';
import Prism from './Prism.vue';
import { textToHtml, toPhp } from '../Utils';
import ViewDifference from './ViewDifference.vue';
import Vue from 'vue';

interface HistoryData
{
    fixer: Fixer,
    loadedHistory: FixerHistoryEntry[]|null,
}
export default Vue.extend({
    components: {
        FixerLink,
        FixerSetLink,
        Prism,
        ViewDifference,
    },
    data: function() {
        const EXAMPLES_VIEW = {
            tabs: 'tabs',
            sideBySide: 'sideBySide',
            diff: 'diff',
        }
        return {
            tab: 'general',
            EXAMPLES_VIEW: EXAMPLES_VIEW,
            examplesView: PersistentStorage.getString('fixer-examples-view', EXAMPLES_VIEW.sideBySide, Object.keys(EXAMPLES_VIEW)),
            loadingHistoryForFixer: <Fixer|null>null,
            loadedHistory: <FixerHistoryEntry[]|null>null,
        };
    },
    props: {
        fixer: {
            type: Object as (() => Fixer),
            required: true,
        },
    },
    mounted: function(): void {
        this.checkCurrentTab();
    },
    computed: {
        manyCodeSamples: function() {
            return (<Fixer>this.fixer).codeSamples.length > 4;
        },
        tabOptions: function() {
            const result = [{ value: 'general', text: 'General' }];
            for (let i = 0; i < (<Fixer>this.fixer).codeSamples.length; i++) {
                result.push({ value: `codesample-${i}`, text: `Example #${i + 1}` });
            }
            result.push({ value: `history`, text: `History` });
            return result;
        },
        history: function() : FixerHistoryEntry[]|null {
            return this.loadingHistoryForFixer === this.fixer ? this.loadedHistory : null;
        },
    },
    methods: {
        textToHtml: function(value: string): string {
            return textToHtml(value, true);
        },
        getCodeSampleDiff: function (codeSample: PFCFixerCodeSample): string
        {
            var code = createTwoFilesPatch('original.php', 'fixed.php', codeSample.from, codeSample.to, undefined, undefined, { context: 9999});
            return code.replace(/^===+\n--- original\.php\n\+\+\+ fixed\.php\n@@ [^\n]+\n/, '');
        },
        toPhp: function(value: any): string {
            return toPhp(value, true);
        },
        checkCurrentTab: function(): void {
            switch (this.tab) {
                case 'history':
                    if (this.loadingHistoryForFixer !== this.fixer) {
                        this.loadingHistoryForFixer = this.fixer;
                        this.loadedHistory = null;
                        getFixerHistory(this.fixer.name).then((changes) => {
                            this.loadedHistory = changes;
                        });
                    }
                    break;
            }
        },
    },
    watch: {
        examplesView: function(newValue: string): void {
            PersistentStorage.setString('fixer-examples-view', newValue);
        },
        fixer: function(): void {
            this.checkCurrentTab();
        },
        tab: function(): void {
            this.checkCurrentTab();
        },
    },
});
</script>
<style scoped>

</style>