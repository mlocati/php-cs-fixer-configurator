<template>
    <b-form-radio-group
        v-model="selectedIndex"
        v-bind:options="options"
        stacked
        name="fixer-option-value-from-list"
    ></b-form-radio-group>
</template>

<script lang="ts">
import { toPhp, textToHtml } from '../../Utils';
import Vue from 'vue';

export default Vue.extend({
    props: {
        values: {
            type: undefined,
            required: true,
        },
        selectedValue: {
            type: undefined,
            required: false,
            default: undefined,
        },
    },
    data: function() {
        return {
            selectedIndex: <number>-1,
        };
    },
    mounted: function() {
        this.refreshSelectedIndex();
    },
    watch: {
        selectedValue: function(selectedValue: any) {
            this.refreshSelectedIndex();
        },
        selectedIndex: function(selectedIndex: number): void {
            if (selectedIndex < 0) {
                return;
            }
            const value = (<any[]>this.values)[selectedIndex];
            if (value !== this.selectedValue) {
                this.$emit('change', value);
            }
        },
    },
    computed: {
        options: function(): any[] {
            const options = <any[]>[];
            (<any[]>this.values).forEach((value: any, index: number): void => {
                options.push({
                    value: index,
                    html: '<code>' + textToHtml(toPhp(value), false) + '</code>',
                });
            });
            return options;
        },
    },
    methods: {
        refreshSelectedIndex(): void {
            let selectedIndex = -1;
            (<any[]>this.values).some((value: any, index: number): boolean => {
                if (value === this.selectedValue) {
                    selectedIndex = index;
                    return true;
                }
                return false;
            });
            this.selectedIndex = selectedIndex;
        },
    },
});
</script>
