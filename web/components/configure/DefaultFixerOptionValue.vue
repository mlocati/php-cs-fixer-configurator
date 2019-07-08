<template>
    <div>
        <b-alert
            show
            variant="danger"
            v-if="defaultValue.value === undefined"
        >
            This option does not have any configuration option: you
            <strong>MUST</strong> specify one.
        </b-alert>
        <div v-else>
            <div v-if="defaultValue.fixerSet === null">If not manually configured, this option will use the following default value:</div>
            <div v-else>
                If not manually configured, this option will use the following value defined by
                <fixer-set-link v-bind:fixer-set="defaultValue.fixerSet"></fixer-set-link>
            </div>
            <prism
                language="php"
                v-bind:code="toPhp(defaultValue.value)"
            ></prism>
        </div>
    </div>
</template>

<script lang="ts">
import Configuration, { FixerStateFlag } from '../../Configuration';
import Fixer from '../../Fixer';
import FixerSet from '../../FixerSet';
import FixerSetLink from '../FixerSetLink.vue';
import Prism from './../Prism.vue';
import { toPhp } from '../../Utils';
import Vue from 'vue';

interface OptionConfiguration {
    fixerSet: FixerSet | null;
    value: any | undefined;
}
export default Vue.extend({
    components: {
        FixerSetLink,
        Prism,
    },
    props: {
        configuration: {
            type: Object as (() => Configuration),
            required: true,
        },
        fixer: {
            type: Object as (() => Fixer),
            required: true,
        },
        optionName: {
            type: String,
            required: true,
        },
    },
    computed: {
        defaultValue: function(): OptionConfiguration {
            const state = this.configuration.getFixerState(this.fixer, true);
            if ((state.state & FixerStateFlag.INCLUDED) === FixerStateFlag.INCLUDED) {
                if (state.configuration !== null && state.configuration.hasOwnProperty(this.optionName)) {
                    return {
                        fixerSet: state.fixerSet,
                        value: (<any>state.configuration)[this.optionName],
                    };
                }
            }
            const result = {
                fixerSet: null,
                value: undefined,
            };
            const option = this.fixer.getOptionByName(this.optionName);
            if (option !== null) {
                result.value = option.defaultValue;
            }
            return result;
        },
    },
    methods: {
        toPhp: function(value: any): string {
            return toPhp(value, true);
        },
    },
});
</script>
