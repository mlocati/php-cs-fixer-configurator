<template>
    <table class="table table-sm table-bordered mt-3">
        <colgroup>
            <col
                width="1"
                v-if="configuration"
            />
            <col width="1" />
        </colgroup>
        <tbody>
            <table-view-fixer
                v-for="fixer in fixers"
                v-bind:key="fixer.uniqueKey"
                v-bind:configuration="configuration"
                v-bind:fixer="fixer"
            ></table-view-fixer>
        </tbody>
    </table>
</template>

<script lang="ts">
import Configuration from '../Configuration';
import TableViewFixer from './TableView.Fixer.vue';
import Version from '../Version';
import Vue from 'vue';

export default Vue.extend({
    props: {
        fixers: {
            type: Array,
            required: true,
        },
        configuration: {
            type: Object as (() => Configuration),
            required: false,
            default: null,
        },
    },
    components: {
        TableViewFixer,
    },
});
</script>
