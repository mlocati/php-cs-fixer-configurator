<template>
    <div>
        <b-form-group
            label-cols-sm="4"
            label-cols-lg="3"
            label="Format"
            label-for="input-horizontal"
        >
            <b-form-select
                v-model="exporterHandle"
                v-bind:options="exporters"
                v-bind:autofocus="true"
                text-field="name"
                value-field="handle"
            ></b-form-select>
        </b-form-group>
        <b-form-group
            label-cols-sm="4"
            label-cols-lg="3"
            label="Indent"
            label-for="input-horizontal"
        >
            <b-form-select
                v-model="configuration.indent"
                v-bind:options="indents"
                v-bind:disabled="!exporter.supportConfiguringWhitespace"
                v-on:input="refreshOutput"
            ></b-form-select>
        </b-form-group>
        <b-form-group
            label-cols-sm="4"
            label-cols-lg="3"
            label="Line ending"
            label-for="input-horizontal"
        >
            <b-form-select
                v-model="configuration.lineEnding"
                v-bind:options="lineEndings"
                v-bind:disabled="!exporter.supportConfiguringWhitespace"
                v-on:input="refreshOutput"
            ></b-form-select>
        </b-form-group>
        <b-form-group
            label-cols-sm="4"
            label-cols-lg="3"
            label="Options"
        >
            <div class="mt-2">
                <b-form-checkbox v-model="expandFixerSets">Expand presets</b-form-checkbox>
                <b-form-checkbox
                    v-model="exportFixerDescriptions"
                    v-bind:disabled="!exporter.supportFixerDescriptions"
                >Export fixer descriptions</b-form-checkbox>
            </div>
        </b-form-group>

        <b-alert
            show
            v-if="outputError"
        >{{ outputError}}</b-alert>
        <template v-else>
            <b-button
                ref="copyButton"
                size="sm"
                class="copy-button"
                v-on:click.prevent="copyToClipboard()"
            >
                <i class="far fa-copy"></i> Copy
            </b-button>
            <prism
                v-bind:language="exporter.language"
                v-bind:code="output"
            ></prism>
        </template>
    </div>
</template>

<script lang="ts">
import Configuration from '../Configuration';
import { copyToClipboard } from '../Utils';
import ExporterInterface from '../Export/ExporterInterface';
import Exporters from '../Export/Exporters';
import * as PersistentStorage from '../PersistentStorage';
import Prism from './Prism.vue';
import Version from '../Version';
import Vue from 'vue';
import { version } from 'punycode';
import { setTimeout } from 'timers';

export default Vue.extend({
    components: {
        Prism,
    },
    props: {
        configuration: {
            type: Object as (() => Configuration),
            required: true,
        },
    },
    data: function() {
        const exporterHandles: string[] = [];
        Exporters.forEach((exporter): void => {
            exporterHandles.push(exporter.handle);
        });
        return {
            exporterHandle: PersistentStorage.getString('exporter', exporterHandles[0], exporterHandles),
            exporters: Exporters,
            indents: [{ value: '  ', text: '2 spaces' }, { value: '    ', text: '4 spaces' }, { value: '\t', text: 'tab' }],
            lineEndings: [{ value: '\n', text: '*nix (\\n)' }, { value: '\r\n', text: 'Windows (\\r\\n)' }, { value: '\r', text: 'Old Mac (\\r)' }],
            output: '',
            outputError: null,
            expandFixerSets: false,
            exportFixerDescriptions: false,
        };
    },
    mounted: function() {
        this.refreshOutput();
    },
    computed: {
        exporter: function(): ExporterInterface {
            let result: ExporterInterface | null = null;
            (<ExporterInterface[]>this.exporters).some((exporter: ExporterInterface) => {
                if (exporter.handle === this.exporterHandle) {
                    result = exporter;
                }
                return result !== null;
            });
            if (result === null) {
                throw new Error('No exporter selected');
            }
            return result;
        },
    },
    watch: {
        exporterHandle: function(exporterHandle) {
            PersistentStorage.setString('exporter', exporterHandle);
            this.refreshOutput();
        },
        expandFixerSets: function() {
            this.refreshOutput();
        },
        exportFixerDescriptions: function() {
            this.refreshOutput();
        },
    },
    methods: {
        copyToClipboard: function() {
            const copyButton = <HTMLElement>this.$refs.copyButton;
            let copied = copyToClipboard(this.output);
            if (!copyButton.className.match(/\bbtn-secondary\b/)) {
                return;
            }
            copyButton.className = copyButton.className.replace(/\bbtn-secondary\b/, copied ? 'btn-success' : 'btn-danger');
            setTimeout(() => (copyButton.className = copyButton.className.replace(/\bbtn-(success|danger)\b/, 'btn-secondary')), 500);
        },
        refreshOutput: function() {
            try {
                const serializedConfiguration = this.expandFixerSets ? this.configuration.flatten().serialize() : this.configuration.serialize();
                this.output = this.exporter.render(serializedConfiguration, {
                    version: this.configuration.version,
                    exportFixerDescriptions: this.exportFixerDescriptions,
                });
                this.outputError = null;
            } catch (e) {
                this.output = '';
                this.outputError = e.message || e.toString();
            }
        },
    },
});
</script>

<style scoped>
.copy-button {
    position: absolute;
    right: 16px;
}
</style>
