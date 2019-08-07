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
                    <template v-if="fixer.deprecated_switchTo.length">
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
                                Please use
                                <ul class="list-unstyled">
                                    <li
                                        v-for="deprecated_switchTo in fixer.deprecated_switchTo"
                                        v-bind:key="deprecated_switchTo.uniqueKey"
                                    >
                                        <fixer-link v-bind:fixer="deprecated_switchTo"></fixer-link>
                                    </li>
                                </ul>
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
                        <b-button
                            v-bind:variant="sideBySideIO ? 'success' : 'default'"
                            size="sm"
                            style="position: absolute; right:31px; margin-top: 10px"
                            v-on:click.prevent="sideBySideIO = !sideBySideIO"
                        >
                            <i class="fas fa-columns"></i>
                        </b-button>
                        <b-tabs
                            v-if="!sideBySideIO"
                            class="mt-3"
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
                            v-else
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
        </div>
    </div>
</template>

<script lang="ts">
import Fixer from '../Fixer';
import FixerLink from './FixerLink.vue';
import FixerSetLink from './FixerSetLink.vue';
import * as PersistentStorage from '../PersistentStorage';
import Prism from './Prism.vue';
import { textToHtml, toPhp } from '../Utils';
import Vue from 'vue';

export default Vue.extend({
    components: {
        FixerLink,
        FixerSetLink,
        Prism,
    },
    data: function() {
        return {
            tab: 'general',
            sideBySideIO: PersistentStorage.getBoolean('fixer-sidebyside-io'),
        };
    },
    props: {
        fixer: {
            type: Object as (() => Fixer),
            required: true,
        },
    },
    computed: {
        manyCodeSamples: function() {
            return (<Fixer>this.fixer).codeSamples.length > 5;
        },
        tabOptions: function() {
            const result = [{ value: 'general', text: 'General' }];
            for (let i = 0; i < (<Fixer>this.fixer).codeSamples.length; i++) {
                result.push({ value: `codesample-${i}`, text: `Example #${i + 1}` });
            }
            return result;
        },
    },
    methods: {
        textToHtml: function(value: string): string {
            return textToHtml(value, true);
        },
        toPhp: function(value: any): string {
            return toPhp(value, true);
        },
    },
    watch: {
        sideBySideIO: function(newValue: boolean): void {
            PersistentStorage.setBoolean('fixer-sidebyside-io', newValue);
        },
    },
});
</script>
