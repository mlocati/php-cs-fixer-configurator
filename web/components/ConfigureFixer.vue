<template>
    <div>
        <b-input-group
            prepend="Option"
            class="mb-3"
        >
            <b-form-select
                v-model="optionIndex"
                v-bind:options="options"
            ></b-form-select>
            <b-input-group-append v-if="options.length !== 1">
                <b-button
                    v-bind:disabled="!canGoToPreviousOption"
                    v-on:click.prevent="optionIndex--"
                >
                    <i class="fas fa-arrow-circle-left"></i>
                </b-button>
                <b-button
                    v-bind:disabled="!canGoToNextOption"
                    v-on:click.prevent="optionIndex++"
                >
                    <i class="fas fa-arrow-circle-right"></i>
                </b-button>
            </b-input-group-append>
        </b-input-group>

        <b-alert
            show
            variant="info"
            v-if="option.description"
        >
            <div v-html="textToHtml(option.description)"></div>
        </b-alert>

        <b-button-group>
            <b-button
                v-bind:variant="optionWithCustomValue ? 'secondary' : 'primary'"
                v-on:click.prevent="useDefaultValue"
            >Use default value</b-button>
            <b-button
                v-bind:variant="optionWithCustomValue ? 'primary' : 'secondary'"
                v-on:click.prevent="useCustomValue"
            >Define custom value</b-button>
        </b-button-group>

        <default-fixer-option-value
            v-if="!optionWithCustomValue"
            v-bind:configuration="configuration"
            v-bind:fixer="fixer"
            v-bind:optionName="option.name"
        ></default-fixer-option-value>

        <div v-else>
            <option-value-from-list-multi
                v-if="optionAllowedValuesMulti !== null"
                v-bind:allowed-values="optionAllowedValuesMulti.values"
                v-bind:nullable="optionAllowedValuesMulti.nullable"
                v-bind:selected-value="customOptionValue"
                v-on:change="setCustomOptionValue"
            />
            <option-value-from-list
                v-else-if="optionAllowedValues !== null"
                v-bind:values="optionAllowedValues"
                v-bind:selected-value="customOptionValue"
                v-on:change="setCustomOptionValue"
            ></option-value-from-list>
            <option-value-from-json
                v-else
                v-bind:allowed-types="option.allowedTypes"
                v-bind:default-value="option.defaultValue"
                v-bind:json="customOptionValueInJson"
                v-on:change="setCustomOptionValueInJson"
            ></option-value-from-json>
        </div>
    </div>
</template>

<script lang="ts">
import Configuration, { FixerState } from '../Configuration';
import DefaultFixerOptionValue from './configure/DefaultFixerOptionValue.vue';
import OptionValueFromJson from './configure/OptionValueFromJson.vue';
import OptionValueFromList from './configure/OptionValueFromList.vue';
import OptionValueFromListMulti from './configure/OptionValueFromListMulti.vue';
import Fixer from '../Fixer';
import { PFCFixerOption } from '../PCFDataDefinitions';
import Prism from './Prism.vue';
import { textToHtml } from '../Utils';
import Vue from 'vue';

export default Vue.extend({
    components: {
        DefaultFixerOptionValue,
        OptionValueFromJson,
        OptionValueFromList,
        OptionValueFromListMulti,
        Prism,
    },
    props: {
        configuration: {
            type: Object as (() => Configuration),
            required: true,
            default: null,
        },
        fixer: {
            type: Object as (() => Fixer),
            required: true,
        },
    },
    data: function() {
        return {
            optionIndex: <number>0,
            options: <Object[]>[],
            newConfigurationCustomFor: <string[]>[],
            newConfiguration: <{ [optionName: string]: any }>{},
            newConfigurationInJson: <{ [optionName: string]: any }>{},
        };
    },
    mounted: function() {
        let options: Object[] = [];
        this.fixer.options.forEach((option): void => {
            options.push({ value: options.length, text: option.name });
        });
        this.options = options;
        const newConfiguration = <{ [optionName: string]: any }>{};
        const currentState = this.configuration.getFixerState(this.fixer);
        let currentConfiguration: any = {};
        switch (currentState.state) {
            case FixerState.MANUALLY_INCLUDED:
                currentConfiguration = currentState.configuration;
                if (currentConfiguration === null || typeof currentConfiguration !== 'object') {
                    currentConfiguration = {};
                }
                this.configuration.getFixerState(this.fixer).configuration;
                break;
        }
        this.newConfigurationCustomFor.splice(0, this.newConfigurationCustomFor.length);
        this.fixer.options.forEach((option): void => {
            let currentOptionValue;
            if (currentConfiguration.hasOwnProperty(option.name)) {
                currentOptionValue = currentConfiguration[option.name];
            } else if (option.alias !== undefined && currentConfiguration.hasOwnProperty(option.alias)) {
                currentOptionValue = currentConfiguration[option.alias];
            } else {
                currentOptionValue = undefined;
            }
            newConfiguration[option.name] = currentOptionValue;
            if (currentOptionValue !== undefined) {
                this.newConfigurationCustomFor.push(option.name);
            }
        });
        this.newConfiguration = newConfiguration;
    },
    computed: {
        option: function(): PFCFixerOption {
            return this.fixer.options[this.optionIndex];
        },
        optionWithCustomValue: function(): boolean {
            return this.newConfigurationCustomFor.indexOf(this.option.name) >= 0;
        },
        canGoToPreviousOption: function(): boolean {
            return this.optionIndex > 0;
        },
        canGoToNextOption: function(): boolean {
            return this.optionIndex + 1 < this.options.length;
        },
        optionAllowedValuesMulti: function(): Object | null {
            var oav = this.optionAllowedValues;
            if (oav === null) {
                return null;
            }
            if (oav[0] instanceof Array && (oav.length === 1 || oav[1] === null)) {
                return {
                    values: oav[0],
                    nullable: oav.length === 2,
                }
            }
            return null;
        },
        optionAllowedValues: function(): Array<any> | null {
            const option = this.option;
            if (option.allowedValues !== undefined) {
                return option.allowedValues;
            }
            if (option.allowedTypes !== undefined) {
                if (option.allowedTypes.join(' ').match(/^(null )?bool( null)?$/)) {
                    return option.allowedTypes.length === 1 ? [false, true] : [false, true, null];
                }
            }
            return null;
        },
        customOptionValue: {
            get: function(): any | undefined {
                return this.newConfiguration[this.option.name];
            },
            set: function(value: any): void {
                this.newConfiguration[this.option.name] = value;
            },
        },
        customOptionValueInJson: {
            get: function(): string {
                if (!this.newConfigurationInJson.hasOwnProperty(this.option.name)) {
                    this.newConfigurationInJson[this.option.name] = this.newConfiguration[this.option.name] === undefined ? '' : JSON.stringify(this.newConfiguration[this.option.name]);
                }
                return this.newConfigurationInJson[this.option.name];
            },
            set: function(value: string): void {
                this.newConfigurationInJson[this.option.name] = value;
            },
        },
    },
    methods: {
        setCustomOptionValue: function(value: any): void {
            this.customOptionValue = value;
        },
        setCustomOptionValueInJson: function(value: string): void {
            this.customOptionValueInJson = value;
        },
        textToHtml: function(value: string): string {
            return textToHtml(value, true);
        },
        useDefaultValue: function(): void {
            const index = this.newConfigurationCustomFor.indexOf(this.option.name);
            if (index >= 0) {
                this.newConfigurationCustomFor.splice(index, 1);
            }
        },
        useCustomValue: function(): void {
            const index = this.newConfigurationCustomFor.indexOf(this.option.name);
            if (index < 0) {
                this.newConfigurationCustomFor.push(this.option.name);
                this.newConfigurationCustomFor.sort();
            }
        },
        buildConfiguration: function(): object | null {
            let result: any = {};
            this.newConfigurationCustomFor.forEach((optionName: string): void => {
                let value: any = undefined;
                if (this.newConfigurationInJson.hasOwnProperty(optionName)) {
                    const json = this.newConfigurationInJson[optionName];
                    if (json !== '') {
                        let error: string | null = null;
                        try {
                            value = JSON.parse(json);
                        } catch {
                            error = 'The value is not a valid JSON string';
                        }
                        if (error === null) {
                            const warnings: string[] = [];
                            let check = this.fixer.validateOptionValue(optionName, value, warnings);
                            if (check === null) {
                                error = warnings.join('\n');
                            } else {
                                [optionName, value] = check;
                            }
                        }
                        if (error !== null) {
                            this.optionIndex = this.fixer.getOptionIndexByName(optionName);
                            throw new Error(error);
                        }
                    }
                } else {
                    value = this.newConfiguration[optionName];
                }
                if (value !== undefined) {
                    result[optionName] = value;
                }
            });
            return Object.keys(result).length === 0 ? null : result;
        },
    },
});
</script>
