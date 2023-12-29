<template>
    <div>
        <b-alert
            v-if="fixerSet.description !== ''"
            show
            variant="info"
        >
            {{  fixerSet.description }}
        </b-alert>
        <b-alert
            v-if="fixerSet.deprecated_switchToNames !== null"
            show
            variant="warning"
        >
            <div>
                <b>
                    <i
                        class="fa fa-thumbs-down"
                        aria-hidden="true"
                    ></i>
                    Deprecated!
                </b>
            </div>
            <div v-if="fixerSet.deprecated_switchToNames.length === 0">
                No successor has been defined.
            </div>
            <template v-else>
                Please use
                <template
                    v-for="deprecated_switchTo in fixerSet.deprecated_switchTo"
                >
                    <fixer-set-link v-bind:fixerSet="deprecated_switchTo"></fixer-set-link>
                </template>
            </template>
        </b-alert>
        <b-alert
            v-if="fixerSet.risky"
            show
            variant="danger"
        >
            <i class="fas fa-exclamation-triangle"></i>
            This preset contains risky fixers!
        </b-alert>
        <p>This preset uses these fixers</p>
        <table class="table table-border">
            <thead>
                <tr>
                    <th>Fixer</th>
                    <th>Configuration</th>
                </tr>
            </thead>
            <tbody ref="tbody">
                <tr
                    v-for="fixer in fixerSet.fixers"
                    v-bind:key="fixer.fixer.uniqueKey"
                    v-bind:class="fixer.fixer=== highlightFixer ? 'table-success' : ''"
                >
                    <td>
                        <fixer-link v-bind:fixer="fixer.fixer"></fixer-link>
                    </td>
                    <td>
                        <i v-if="fixer.configuration === null">default</i>
                        <dl v-else>
                            <template v-for="(configurationValue, configurationKey) in fixer.configuration">
                                <dt v-bind:key="configurationKey + '@dt'">
                                    <b-badge>{{ configurationKey }}</b-badge>
                                </dt>
                                <dd
                                    v-bind:key="configurationKey + '@dd'"
                                    class="mt-n3"
                                >
                                    <prism
                                        language="php"
                                        v-bind:code="toPhp(configurationValue)"
                                    ></prism>
                                </dd>
                            </template>
                        </dl>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script lang="ts">
import FixerLink from './FixerLink.vue';
import FixerSetLink from './FixerSetLink.vue';
import Fixer from '../Fixer';
import FixerSet from '../FixerSet';
import Prism from './Prism.vue';
import { toPhp } from '../Utils';
import Vue from 'vue';

// Vue.config.productionTip = false;

export default Vue.extend({
    components: {
        FixerLink,
        FixerSetLink,
        Prism,
    },
    props: {
        fixerSet: {
            type: Object as (() => FixerSet),
            required: true,
        },
        highlightFixer: {
             type: Object as (() => Fixer),
             required: false,
        },
    },
    mounted: function() {
        this.$nextTick(() => {
            const highlightRow = (<any>this.$refs.tbody).querySelector('.table-success');
            if (highlightRow) {
                window.setTimeout(() => {
                    highlightRow.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                    });
                }, 100)
            }
        });
    },
    methods: {
        toPhp: function(value: any) {
            return toPhp(value, true);
        },
    },
});
</script>
