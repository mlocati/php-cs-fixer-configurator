<template>
    <div>
        <span v-html="descriptionHtml" />
        <a v-if="difference.data !== undefined" href="#" v-on:click.prevent="displayData = !displayData">{{ displayData ? 'Hide details' : 'Show details' }}</a>
        <div v-if="difference.data !== undefined" class="diff-details" v-bind:class="diffDetailsClass">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Older version</th>
                        <th>Newer version</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><prism language="json" v-bind:code="previousData" /></td>
                        <td><prism language="json" v-bind:code="nextData" /></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script lang="ts">
import { Difference } from '../VersionComparison';
import Prism from './Prism.vue';
import { textToHtml } from '../Utils';
import Vue from 'vue';

export default Vue.extend({
    components: {
        Prism,
    },
    data: function () {
        return {
            displayData: false,
        };
    },
    props: {
        difference: {
            type: Object as () => Difference,
            required: true,
        },
    },
    methods: {
        toJSON: function (value: any): string {
            return JSON.stringify(value, null, 4) || '';
        },
    },
    computed: {
        descriptionHtml: function (): string {
            return textToHtml(this.difference.description, true);
        },
        previousData: function (): string {
            return this.difference.data === undefined ? '' : this.toJSON(this.difference.data.previousData);
        },
        nextData: function (): string {
            return this.difference.data === undefined ? '' : this.toJSON(this.difference.data.nextData);
        },
        diffDetailsClass: function (): string {
            return this.displayData ? 'diff-details-active' : '';
        },
    },
});
</script>

<style scoped>
div.diff-details {
    transform-origin: top;
    transform: scaleY(0);
    transition: transform 0.10s ease;
    max-height: 0;
}
div.diff-details-active {
    transform: none;
    max-height: none;
}
</style>
