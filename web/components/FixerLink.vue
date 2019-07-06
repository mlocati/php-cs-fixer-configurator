<template>
    <a
        href="#"
        v-bind:class="linkClass"
        v-on:click.prevent.stop="view"
    >
        <slot>
            <b-badge variant="info">
                <slot name="badge-contents">{{ fixer.name}}</slot>
            </b-badge>
        </slot>
    </a>
</template>

<script lang="ts">
import EventBus from '../EventBus';
import Fixer from '../Fixer';
import Vue from 'vue';

export default Vue.extend({
    props: {
        fixer: {
            type: Object as (() => Fixer),
            required: true,
        },
        linkClass: {
            type: String,
            required: false,
        },
    },
    methods: {
        view: function() {
            EventBus.$emit('fixer-clicked', this.fixer);
        },
    },
});
</script>

<style scoped>
a {
    cursor: help;
}
</style>
