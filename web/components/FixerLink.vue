<template>
    <a
        href="#"
        v-bind:class="finalLinkClass"
        v-on:click.prevent.stop="view"
    >
        <slot>
            <b-badge v-bind:variant="defaultBadgeVariant">
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
        disabled: {
            type: Boolean,
            required: false,
            default: false,
        }
    },
    methods: {
        view: function() {
            if (!this.disabled) {
                EventBus.$emit('fixer-clicked', this.fixer);
            }
        },
    },
    computed: {
        finalLinkClass: function() : string {
            const chunks: string[] = [this.disabled ? 'disabled' : 'enabled'];
            if (typeof this.linkClass === 'string' && this.linkClass.length > 0) {
                chunks.push(this.linkClass);
            }
            return chunks.join(' ');
        },
        defaultBadgeVariant: function() : string {
            return this.disabled ? 'secondary' : 'info';
        }
    }
});
</script>

<style scoped>
a.enabled {
    cursor: help;
}
a.disabled {
    cursor: default;
}
</style>
