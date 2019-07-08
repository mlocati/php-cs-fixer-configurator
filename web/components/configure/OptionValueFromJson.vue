<template>
    <div>
        <div>
            <p v-if="allowedTypesDisplayNames.length === 0">Please specify a value in JSON format:</p>
            <p v-else-if="allowedTypesDisplayNames.length === 1">
                Please specify a value of type
                <code>{{ allowedTypesDisplayNames[0] }}</code> in JSON format:
            </p>
            <p v-else>
                Please specify the value in JSON format.
                <br />Allowed values are:
                <code>{{ allowedTypesDisplayNames.join(' ') }}</code>
            </p>
        </div>
        <b-textarea
            v-model.trim="newJson"
            class="code"
        ></b-textarea>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { ValueType } from '../../Utils';

export default Vue.extend({
    props: {
        allowedTypes: {
            type: Array,
            validator: (prop: Array<any>): boolean => {
                return prop.every((e: any): boolean => {
                    return typeof e === 'string';
                });
            },
            required: false,
            default: undefined,
        },
        defaultValue: {
            type: undefined,
            required: false,
            default: undefined,
        },
        json: {
            type: String,
            required: true,
        },
    },
    data: function() {
        return {
            newJson: '',
        };
    },
    beforeMount: function(): void {
        this.newJson = this.json || '';
    },
    computed: {
        allowedTypesDisplayNames: function(): string[] {
            if (!this.allowedTypes || this.allowedTypes.length === 0) {
                return [];
            }
            const result: string[] = [];
            this.allowedTypes.forEach((allowedType: string): void => {
                switch (allowedType) {
                    case 'array':
                        if (ValueType.get(this.defaultValue) === ValueType.OBJECT) {
                            result.push('object');
                        } else {
                            result.push(allowedType);
                        }
                        break;
                    default:
                        result.push(allowedType);
                        break;
                }
            });
            return result;
        },
    },
    watch: {
        newJson: function(newJson: string) {
            this.$emit('change', newJson);
        },
    },
});
</script>
