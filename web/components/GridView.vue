<template>
    <div class="container-fluid">
        <div class="row">
            <div
                v-for="fixer in fixers"
                v-bind:key="fixer.uniqueKey"
                class="col-sm-6 col-lg-4 col-xl-3"
                v-bind:class="fixer.getCssClass(configuration)"
            >
                <grid-view-fixer
                    v-bind:configuration="configuration"
                    v-bind:fixer="fixer"
                ></grid-view-fixer>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Configuration from '../Configuration';
import GridViewFixer from './GridView.Fixer.vue';
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
        GridViewFixer,
    },
});
</script>
