<template>
  <div>
    <b-form-group v-if="nullable">
      <b-form-radio
        v-model="nullSelected"
        name="fixer-option-value-from-multi-nullable"
        value="Y"
        ><code>NULL</code></b-form-radio
      >
      <b-form-radio
        v-model="nullSelected"
        name="fixer-option-value-from-multi-nullable"
        value="N"
        >List of values</b-form-radio
      >
    </b-form-group>
    <b-form-group
      label="Choose one or more options"
      v-if="!nullable || nullSelected === 'N'"
    >
      <b-form-checkbox-group v-model="selectedOptions">
        <b-form-checkbox
          v-for="o in allowedValues"
          v-bind:key="o"
          v-bind:value="o"
        >
          <code>{{ o }}</code>
        </b-form-checkbox>
      </b-form-checkbox-group>
    </b-form-group>
  </div>
</template>

<script lang="ts">
import { toPhp, textToHtml } from "../../Utils";
import Vue from "vue";

export default Vue.extend({
  props: {
    allowedValues: {
      type: Array,
      required: true,
    },
    nullable: {
      type: Boolean,
      required: true,
    },
    selectedValue: {
      type: undefined,
      required: true,
    },
  },
  data: function () {
    return {
      nullSelected: "Y",
      selectedOptions: <any[]>[],
      mounted: false,
    };
  },
  mounted: function () {
    this.rebuildData();
    this.mounted = true;
  },
  beforeDestroy: function () {
    this.mounted = false;
  },
  watch: {
    allowedValues: function (): void {
      this.rebuildData();
    },
    nullable: function (): void {
      this.rebuildData();
    },
    selectedValue: function (): void {
      this.rebuildData();
    },
    nullSelected: function (): void {
      this.emitNewValue();
    },
    selectedOptions: function (): void {
      this.emitNewValue();
    },
  },
  methods: {
    rebuildData(): void {
      for (let index = this.selectedOptions.length - 1; index >= 0; index--) {
        if (this.allowedValues.indexOf(this.selectedOptions[index]) < 0) {
          this.selectedOptions.splice(index, 1);
        }
      }
      if (this.selectedValue instanceof Array) {
        this.nullSelected = "N";
      } else {
        this.nullSelected = "Y";
        this.selectedOptions.splice(0, this.selectedOptions.length);
      }
    },
    emitNewValue(): void {
      if (!this.mounted) {
        return;
      }
      let selectedValue = this.sortArray(
        this.nullSelected === "N" ? this.selectedOptions : null
      );
      if (
        JSON.stringify(selectedValue) !==
        JSON.stringify(this.sortArray(this.selectedValue))
      ) {
        this.$emit("change", selectedValue);
      }
    },
    sortArray(value: any): any[] | null {
      if (value instanceof Array) {
        let result = [].concat(<any>value);
        result.sort();
        return result;
      }
      return null;
    },
  },
});
</script>
