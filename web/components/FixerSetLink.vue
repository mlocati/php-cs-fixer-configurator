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
    },
    methods: {
        view: function() {
            EventBus.$emit('fixerset-clicked', this.fixerSet);
        },
    },
});
</script>

<style scoped>
a {
    cursor: help;
}
</style>
