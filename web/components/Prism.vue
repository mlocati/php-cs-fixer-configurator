<template>
    <pre
        class="prism"
        v-bind:class="showInvisibles ? 'show-invisibles' : ''"
    ><code ref="code"></code></pre>
</template>

<script lang="ts">
import * as Prism from 'prismjs';
require('prismjs/components/prism-diff.js');
require('prismjs/components/prism-json.js');
require('prismjs/components/prism-yaml.js');
require('prismjs/components/prism-markup.js');
require('prismjs/components/prism-markup-templating.js');
require('prismjs/components/prism-php.js');
require('prismjs/plugins/show-invisibles/prism-show-invisibles.js');
import Vue from 'vue';

export default Vue.extend({
    props: {
        language: {
            type: String,
            required: true,
        },
        code: {
            type: String,
            required: true,
        },
        showInvisibles: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    methods: {
        update: function() {
            this.$nextTick(() => {
                const code = <HTMLElement>this.$refs.code;
                code.className = 'language-' + this.language;
                code.textContent = this.code;
                Prism.highlightElement(<HTMLElement>this.$refs.code);
            });
        },
    },
    mounted: function() {
        this.update();
    },
    watch: {
        language: function() {
            this.update();
        },
        code: function() {
            this.update();
        },
    },
});
</script>
