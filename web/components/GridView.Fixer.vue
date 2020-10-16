<template>
    <b-card
        class="mt-3"
        v-on:click.prevent="toggleConfiguration"
    >
        <b-card-title>
            <i
                v-if="fixer.risky"
                class="fas fa-exclamation-triangle"
                v-b-tooltip.html
                v-bind:title="fixer.riskyDescriptionHtml"
            ></i>
            <i
                v-if="fixer.deprecated_switchTo.length !== 0"
                class="fas fa-thumbs-down"
                v-b-tooltip
                v-bind:title="'Deprecated: switch to ' + fixer.deprecated_switchToNames.join(', ')"
            ></i>
            <fixer-link v-bind:fixer="fixer">{{ fixer.name }}</fixer-link>
        </b-card-title>
        <b-card-text
            v-if="fixer.summaryHtml"
            v-html="fixer.summaryHtml"
        ></b-card-text>
        <b-card-text
            v-else
            v-html="fixer.descriptionHtml"
        ></b-card-text>
        <div
            class="container-fluid"
            v-if="configuration !== null || fixer.fixerSets.length !== 0"
        >
            <div class="row">
                <div class="col-1 p-0">
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
                                variant="light"
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
                </div>
                <div
                    class="text-right col p-0"
                    v-if="fixer.fixerSets.length !== 0"
                >
                    <fixer-set-link
                        v-for="fixerSet in fixer.fixerSets"
                        v-bind:key="fixerSet.uniqueKey"
                        v-bind:fixer-set="fixerSet"
                        v-bind:highlight-fixer="fixer"
                        link-class="ml-1"
                    ></fixer-set-link>
                </div>
            </div>
        </div>
    </b-card>
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

<style scoped>
.card-title i {
    float: right;
    font-size: medium;
    margin-top: 0.5rem;
}
</style>
