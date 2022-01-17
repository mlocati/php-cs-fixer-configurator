<template>
    <div>
        <fieldset>
            <legend>Toolbar</legend>
            <dl class="row">
                <dt class="col-3">
                    <div style="width: 100%; height: 100%; z-index:1; position:absolute"></div>
                    <b-input-group size="sm">
                        <b-form-input placeholder="Search"></b-form-input>
                        <b-dropdown
                            text="Sets"
                            size="sm"
                        ></b-dropdown>
                    </b-input-group>
                </dt>
                <dd class="col-9">Show only the fixers corresponding to the search text or to the selected fixer sets</dd>
                <template v-if="configuring">
                    <dt class="col-3">
                        <div style="width: 100%; height: 100%; z-index:1; position:absolute"></div>
                        <b-input-group size="sm">
                            <span class="form-control configure-selected-fixer-sets"></span>
                            <b-dropdown
                                right
                                size="sm"
                            >
                                <template slot="button-content">
                                    <i class="fas fa-plus"></i>
                                </template>
                            </b-dropdown>
                        </b-input-group>
                    </dt>
                    <dd class="col-9">
                        Select the presets with
                        <b-button
                            size="sm"
                            variant="success"
                        >
                            <i class="fas fa-plus"></i>
                        </b-button>
                        <br />Substract the fixers defined in other presets with
                        <b-button
                            size="sm"
                            variant="danger"
                        >
                            <i class="fas fa-minus"></i>
                        </b-button>
                        <br />
                    </dd>
                </template>
                <template v-for="(viewData, viewKey) in views">
                    <dt
                        class="col-3"
                        v-bind:key="viewKey + 'dt'"
                    >
                        <i v-bind:class="viewData.icon"></i>
                    </dt>
                    <dd
                        class="col-9"
                        v-bind:key="viewKey + 'dd'"
                    >{{ viewData.helpText }}</dd>
                </template>
                <dt
                    class="col-3"
                    v-if="configuring"
                >
                    <i class="fas fa-file-import"></i>
                </dt>
                <dd
                    class="col-9"
                    v-if="configuring"
                >Show load / erase dialog</dd>
                <dt
                    class="col-3"
                    v-if="configuring"
                >
                    <i class="fas fa-file-export"></i>
                </dt>
                <dd
                    class="col-9"
                    v-if="configuring"
                >Show save / export dialog</dd>
                <dt
                    class="col-3"
                    v-if="configuring"
                >
                    <i class="fas fa-thumbtack"></i>
                </dt>
                <dd
                    class="col-9"
                    v-if="configuring"
                >Turn on/off remembering the current configuration</dd>
                <dt class="col-3">
                    <i class="fas fa-cog"></i>
                </dt>
                <dd class="col-9">Toggle configurator</dd>
            </dl>
        </fieldset>

        <fieldset v-if="configuring">
            <legend>Fixer selection</legend>
            <dl class="row">
                <dt class="col-3">
                    <div class="fixer-selection">&nbsp;</div>
                </dt>
                <dd class="col-9">Unselected fixers</dd>
            </dl>
            <dl class="row">
                <dt class="col-3">
                    <div class="fixer-selection fixer-selected-by-user">&nbsp;</div>
                </dt>
                <dd class="col-9">Selected fixers (manually)</dd>
            </dl>
            <dl class="row">
                <dt class="col-3">
                    <div class="fixer-selection fixer-selected-by-fixerset">&nbsp;</div>
                </dt>
                <dd class="col-9">Selected fixers (included in selected presets)</dd>
            </dl>
            <dl class="row">
                <dt class="col-3">
                    <div class="fixer-selection fixer-unselected-by-user">&nbsp;</div>
                </dt>
                <dd class="col-9">Fixers included in selected presets but explicitly excluded</dd>
            </dl>
        </fieldset>

        <fieldset v-if="configuring">
            <legend>Selected fixers configuration</legend>
            <dl class="row">
                <dt class="col-3">
                    <b-button
                        size="sm"
                        disabled
                    >
                        <i class="fas fa-cog"></i>
                    </b-button>
                </dt>
                <dd class="col-9">Not configurable fixers</dd>
                <dt class="col-3">
                    <b-button
                        size="sm"
                        variant="light"
                    >
                        <i class="fas fa-cog"></i>
                    </b-button>
                </dt>
                <dd class="col-9">Configurable fixers using default values</dd>
                <dt class="col-3">
                    <b-button
                        size="sm"
                        variant="primary"
                    >
                        <i class="fas fa-cog"></i>
                    </b-button>
                </dt>
                <dd class="col-9">Configurable fixers using custom values</dd>
            </dl>
        </fieldset>

        <b-alert
            variant="info"
            show
        >
            This tool uses some great open source tools.
            You can find their licenses <a href="https://github.com/mlocati/php-cs-fixer-configurator/tree/master/licenses" target="_blank" rel="noopener noreferrer">here</a>.
        </b-alert>

        <b-alert
            variant="success"
            show
        >
            <a
                href="https://github.com/sponsors/mlocati"
                rel="noopener noreferrer"
                target="_blank"
            >
                Say Thank you to the author of PHP-CS-Fixer Configurator
            </a>
        </b-alert>

    </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
    props: {
        configuring: {
            type: Boolean,
            required: true,
        },
        views: {
            type: Object,
            required: true,
        },
    },
});
</script>

<style scoped>
div.fixer-selection {
    width: 100%;
    border: 1px solid rgba(0, 0, 0, 0.125);
    border-radius: 0.25rem;
}
</style>
