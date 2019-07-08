<template>
    <tr
        v-bind:class="fixerCssClass"
        v-on:click.prevent="toggleConfiguration"
    >
        <td v-if="configuration">
            <b-button
                v-if="configurationButtonState === 0"
                size="sm"
                class="invisible"
            >
                <i class="fas fa-cog"></i>
            </b-button>
            <template v-else>
                <span
                    v-if="fixer.options.length === 0"
                    v-b-tooltip
                    title="This fixer is not configurable"
                >
                    <b-button
                        size="sm"
                        disabled
                    >
                        <i class="fas fa-cog"></i>
                    </b-button>
                </span>
                <b-button
                    v-else
                    size="sm"
                    v-bind:variant="configurationButtonState === 1 ? 'light' : 'primary'"
                    v-on:click.prevent.stop="configureFixer"
                >
                    <i class="fas fa-cog"></i>
                </b-button>
            </template>
        </td>
        <td>
            <fixer-link v-bind:fixer="fixer">{{ fixer.name }}</fixer-link>
            <i
                v-if="fixer.deprecated_switchTo.length !== 0"
                class="fas fa-thumbs-down"
                v-b-tooltip
                v-bind:title="'Deprecated: switch to ' + fixer.deprecated_switchToNames.join(', ')"
            ></i>
            <i
                v-if="fixer.risky"
                class="fas fa-exclamation-triangle"
                v-b-tooltip.html
                v-bind:title="fixer.riskyDescriptionHtml"
            ></i>
        </td>
        <td class="d-none d-sm-table-cell">
            <span
                v-if="fixer.summaryHtml"
                v-html="fixer.summaryHtml"
            ></span>
        </td>
        <td class="d-none d-md-table-cell">
            <fixer-set-link
                v-for="fixerSet in fixer.fixerSets"
                v-bind:key="fixerSet.uniqueKey"
                v-bind:fixer-set="fixerSet"
                link-class="ml-1"
            ></fixer-set-link>
        </td>
    </tr>
</template>

<script lang="ts">
import Configuration, { FixerState } from '../Configuration';
import EventBus from '../EventBus';
import Fixer from '../Fixer';
import FixerLink from './FixerLink.vue';
import FixerSetLink from './FixerSetLink.vue';
import Vue from 'vue';

export default Vue.extend({
    components: {
        FixerLink,
        FixerSetLink,
    },
    props: {
        fixer: {
            type: Object as (() => Fixer),
            required: true,
        },
        configuration: {
            type: Object as (() => Configuration),
            required: false,
            default: null,
        },
    },
    computed: {
        fixerCssClass: function(): string {
            if (!this.configuration) {
                return '';
            }
            const state = this.configuration.getFixerState(this.fixer);
            switch (state.state) {
                case FixerState.UNSELECTED:
                    return '';
                case FixerState.BYFIXERSET_INCLUDED:
                    return 'fixer-selected-by-fixerset';
                case FixerState.BYFIXERSET_EXCLUDED:
                    return '';
                case FixerState.MANUALLY_INCLUDED:
                    return state.configuration === null ? 'fixer-selected-by-user' : 'fixer-selected-by-user-configured';
                case FixerState.MANUALLY_EXCLUDED:
                    return 'fixer-unselected-by-user';
                default:
                    throw new Error('Unrecognized fixer state');
            }
        },
        configurationButtonState: function(): number {
            if (!this.configuration) {
                return 0;
            }
            const state = this.configuration.getFixerState(this.fixer);
            switch (state.state) {
                case FixerState.UNSELECTED:
                case FixerState.BYFIXERSET_EXCLUDED:
                case FixerState.MANUALLY_EXCLUDED:
                    return 0;
                case FixerState.BYFIXERSET_INCLUDED:
                    return 1;
                case FixerState.MANUALLY_INCLUDED:
                    return state.configuration === null ? 1 : 2;
                default:
                    throw new Error('Unrecognized fixer state');
            }
        },
    },
    methods: {
        toggleConfiguration: function(): void {
            if (!this.configuration) {
                return;
            }
            const state = this.configuration.getFixerState(this.fixer);
            switch (state.state) {
                case FixerState.UNSELECTED:
                    this.configuration.includeFixer(this.fixer);
                    break;
                case FixerState.BYFIXERSET_INCLUDED:
                    this.configuration.excludeFixer(this.fixer);
                    break;
                case FixerState.BYFIXERSET_EXCLUDED:
                    this.configuration.includeFixer(this.fixer);
                    break;
                case FixerState.MANUALLY_INCLUDED:
                    this.configuration.unsetFixer(this.fixer);
                    break;
                case FixerState.MANUALLY_EXCLUDED:
                    this.configuration.unsetFixer(this.fixer);
                    break;
                default:
                    throw new Error('Unrecognized fixer state');
            }
            EventBus.$emit('configuration-changed');
        },
        configureFixer: function(): void {
            EventBus.$emit('fixer-configure', this.fixer);
        },
    },
});
</script>
