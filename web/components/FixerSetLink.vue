<template>
    <a
        href="#"
        v-bind:class="linkClass"
        v-on:click.prevent.stop="view"
    >
        <slot>
            <b-badge variant="info">
                <slot name="badge-contents">{{ fixerSet.name}}</slot>
            </b-badge>
        </slot>
    </a>
</template>

<script lang="ts">
import EventBus from '../EventBus';
import Fixer from '../FixerSet';
import FixerSet from '../FixerSet';
import Vue from 'vue';

export default Vue.extend({
    props: {
        fixerSet: {
            type: Object as (() => FixerSet),
            required: true,
        },
        linkClass: {
            type: String,
            required: false,
        },
        highlightFixer: {
             type: Object as (() => Fixer),
             required: false,
        }
    },
    methods: {
        view: function() {
            EventBus.$emit('fixerset-clicked', {
                fixerOrSet: this.fixerSet,
                highlightFixer: this.highlightFixer || null,
            });
        },
    },
});
</script>

<style scoped>
a {
    cursor: help;
}
</style>
