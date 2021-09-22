<template>
    <div>
        <p>Enter here your code representing the whole configuration state in the format specified by the following format</p>
        <b-form-group
            label-cols-sm="4"
            label-cols-lg="3"
            label="Format"
            label-for="input-horizontal"
        >
            <b-form-select
                v-model="importerHandle"
                v-bind:options="importers"
                text-field="name"
                value-field="handle"
            ></b-form-select>
        </b-form-group>
        <b-textarea
            rows="8"
            v-model.trim="importText"
            v-bind:placeholder="importer.pastePlaceholder"
            v-bind:autofocus="true"
            class="code"
        ></b-textarea>
        <p class="text-muted">By leaving the text empty (or by entering the representation of an empty object), the state will be reset.</p>
    </div>
</template>

<script lang="ts">
import ImporterInterface from '../Import/ImporterInterface';
import Importers from '../Import/Importers';
import Vue from 'vue';
import { SerializedConfigurationInterface } from '../Configuration';

export default Vue.extend({
    data: function() {
        return {
            importerHandle: Importers[0].handle,
            importers: Importers,
            importText: '',
        };
    },
    computed: {
        importer: function(): ImporterInterface {
            let result: ImporterInterface | null = null;
            this.importers.some((importer: ImporterInterface) => {
                if (importer.handle === this.importerHandle) {
                    result = importer;
                }
                return result !== null;
            });
            if (result === null) {
                throw new Error('No importer selected');
            }
            return result;
        },
    },
    mounted: function(): void {
        this.impotTextChanged();
    },
    watch: {
        importText: function() {
            this.impotTextChanged();
        },
    },
    methods: {
        impotTextChanged: function(): void {
            this.$emit('importButtonTextChanged', this.importText === '' ? 'Clear configuration' : 'Import');
        },
        doImport: function(): SerializedConfigurationInterface | null {
            if (this.importText === '') {
                return null;
            }
            return this.importer.parse(this.importText);
        },
    },
});
</script>
