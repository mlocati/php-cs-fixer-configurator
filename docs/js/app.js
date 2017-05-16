/* jshint unused:vars, undef:true, browser:true, jquery:true */
/* global Handlebars, Prism */
$(function () {
'use strict';

Handlebars.registerHelper('toJSON', function (value) {
    var string;
    if (value instanceof Array) {
        var chunks = [];
        value.forEach(function (chunk) {
            chunks.push(JSON.stringify(chunk));
        });
        string = '[' + chunks.join(', ') + ']';
    } else {
        string = JSON.stringify(value);
    }
    return string;
});
Handlebars.registerHelper('add1', function (value) {
    return 1 + value;
});

/**
 * The version of PHP-CS-Fixer.
 *
 * @type {string}
 */
var PHPCsFixerVersion;

/**
 * The default white space definitions (indentation, new lines).
 *
 * @namespace
 * @property {string} indent
 * @property {string} lineEnding
 */
var DefaultWhitespaceConfig;

/**
 * Normalize a string, extracting normalized words contained in it.
 *
 * @param {string} string
 *
 * @returns {string[]}
 */
function getSearchableArray(string) {
    return string
        .replace(/[^\w\.]+/g, ' ')
        .toLowerCase()
        .replace(/  +/g, ' ')
        .replace(/^ | $/g, '')
        .split(' ')
        .filter(function (value, index, array) {
            return value !== '' && array.indexOf(value) === index;
        })
    ;
}

var Templater = (function () {
    var loadedTemplates = {};
    return {
        get: function (id, data) {
            if (!loadedTemplates.hasOwnProperty(id)) {
                loadedTemplates[id] = Handlebars.compile($('#template-' + id).html());
            }
            return loadedTemplates[id];
        },
        build: function (id, data) {
            var template = Templater.get(id),
                html = template(data),
                $node = $(html);
            $node.find('.prismify-me>code').each(function () {
                Prism.highlightElement(this);
            });
            $node.find('[data-pcf-show-fixer]').each(function () {
                var $a = $(this), fixerName = $a.data('pcf-show-fixer');
                $a.css('cursor', 'help').removeAttr('data-pcf-show-fixer');
                $a.click(function (e) {
                    e.preventDefault();
                    Fixers.getByName(fixerName).showDetails();
                });
            });
            $node.find('[data-pcf-show-fixerset]').each(function () {
                var $a = $(this), fixerSetName = $a.data('pcf-show-fixerset');
                $a.css('cursor', 'help').removeAttr('data-pcf-show-fixerset');
                $a.click(function (e) {
                    e.preventDefault();
                    FixerSets.getByName(fixerSetName).showDetails();
                });
            });
            $node.find('[data-toggle="tooltip"]').tooltip({
                animation: false
            });
            return $node;
        }
    };
})();

var ModalManager = (function () {
    var stack = [];
    $(window).on('keyup', function (e) {
        if ((e.keyCode || e.which) === 27) {
            if (stack.length > 0) {
                stack[stack.length - 1].modal('hide');
            }
        }
    });
    return {
        show: function (dialog) {
            var $dialog;
            if (dialog instanceof jQuery) {
                $dialog = dialog;
            } else {
                $dialog = $(dialog);
            }
            $(window.document.body).append($dialog);
            stack.push($dialog);
            if (stack.length > 1) {
                stack[stack.length - 2].modal('hide');
                $dialog.find('.modal-footer button[data-dismiss]').text('Back');
            }
            $dialog
                .on('hidden.bs.modal', function () {
                    if (stack[stack.length - 1] === $dialog) {
                        stack.pop();
                        $dialog.remove();
                        if (stack.length > 0) {
                            stack[stack.length - 1].modal('show');
                        }
                    }
                })
                .modal({
                    keyboard: false,
                    focus: true,
                    show: true
                })
            ;
        }
    };
})();

var Search = (function () {
    var lastSearchText = '', lastFixerSets = [], $search, $fixerSetItems, selectedFixerSets = [];
    function toggleFixerSet(name) {
        $fixerSetItems.filter('[data-fixerset="' + name + '"]').find('i.fa').toggleClass('fa-check-square-o fa-square-o');
        selectedFixerSets = [];
        $fixerSetItems.find('i.fa-check-square-o').each(function () {
            selectedFixerSets.push($(this).closest('a[data-fixerset]').data('fixerset'));
        });
        if (selectedFixerSets.length === $fixerSetItems.length) {
            selectedFixerSets = [];
        }
        performSearch();
    }
    function performSearch() {
        var searchText = $.trim($search.val()),
            filterSets = [].concat(selectedFixerSets);
        if (searchText === lastSearchText) {
            if (lastFixerSets.length === filterSets.length && lastFixerSets.join('\n') === filterSets.join('\n')) {
                return;
            }
        }
        lastSearchText = searchText;
        lastFixerSets = filterSets;
        var searchArray = getSearchableArray(searchText);
        Fixers.getAll().forEach(function (fixer) {
            var $card = $('#pcs-fixercard-' + fixer.name);
            if (fixer.satisfySearch(searchArray, filterSets) === true) {
                $card.removeClass('pcs-search-failed');
            } else {
                $card.addClass('pcs-search-failed');
            }
        });
    }
    return {
        initialize: function () {
            $search = $('#pcs-search');
            var $fixerSetMenu = $('#pcs-filter-sets');
            FixerSets.getAll().forEach(function (fixerSet) {
                $fixerSetMenu.append($('<a class="dropdown-item" href="#" />')
                    .attr('data-fixerset', fixerSet.name)
                    .text(' ' + fixerSet.name)
                    .prepend('<i class="fa fa-square-o" aria-hidden="true"></i>')
                );
            });
            $fixerSetItems = $fixerSetMenu.find('a[data-fixerset]');
            $search.on('keydown keyup keypress change blur mousedown mouseup', function () {
                performSearch();
            });
            $fixerSetItems.click(function (e) {
                e.preventDefault();
                e.stopPropagation();
                toggleFixerSet($(this).data('fixerset'));
            });
            delete Search.initialize;
        }
    };
})();

var Fixers = (function () {
    var list = [];
    function sort() {
        list.sort(function (a, b) {
            return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
        });
    }
    return {
        add: function (fixer) {
            list.push(fixer);
            sort();
        },
        getAll: function () {
            return [].concat(list);
        },
        getByName: function (name) {
            for (var i = 0, n = list.length; i < n; i++) {
                if (list[i].name === name) {
                    return list[i];
                }
            }
            return null;
        }
    };
})();

/**
 * @class
 * @constructor
 * @param {string} name
 * @param {object} def
 */
function Fixer(name, def) {
    this.name = name;
    this.risky = !!def.risky;
    this.summary = def.hasOwnProperty('summary') ? def.summary : '';
    this.description = def.hasOwnProperty('description') ? def.description : '';
    if (this.risky === true) {
        this.riskyDescription = def.hasOwnProperty('riskyDescription') ? def.riskyDescription : '';
    }
    var configurationOptions = [];
    if (def.hasOwnProperty('configuration')) {
        def.configuration.forEach(function (co) {
            configurationOptions.push(new Fixer.ConfigurationOption(co));
        });
    }
    configurationOptions.sort(function (a, b) {
        return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
    });
    this.configurationOptions = configurationOptions;
    var codeSamples = [];
    if (def.hasOwnProperty('codeSamples')) {
        def.codeSamples.forEach(function (cs) {
            codeSamples.push(new Fixer.CodeSample(cs));
        });
    }
    this.codeSamples = codeSamples;
    var strings = [this.name, this.summary, this.description];
    if (this.risky === true) {
        strings.push(this.riskyDescription);
    }
    this.searchableString = ' ' + getSearchableArray(strings.join(' ')).join(' ') + ' ';
}
Fixer.prototype = {
    satisfySearch: function (seachableArray, filterSets) {
        var ok = true;
        for (var wordIndex = 0; ok === true && wordIndex < seachableArray.length; wordIndex++) {
            if (this.searchableString.indexOf(seachableArray[wordIndex]) < 0) {
                ok = false;
            }
        }
        if (ok === true && filterSets.length > 0) {
            ok = false;
            if (this.sets.length === 0) {
                if (filterSets.indexOf('') >= 0) {
                    ok = true;
                }
            } else {
                for (var setIndex = 0; ok === false && setIndex < this.sets.length; setIndex++) {
                    if (filterSets.indexOf(this.sets[setIndex].name) >= 0) {
                        ok = true;
                    }
                }
            }
        }
        return ok;
    },
    showDetails: function () {
        ModalManager.show(Templater.build('fixer-details', this));
    },
    resolveSets: function () {
        var me = this;
        me.sets = [];
        FixerSets.getAll().forEach(function (fixerSet) {
            if (fixerSet.hasFixer(me)) {
                me.sets.push(fixerSet);
            }
        });
    },
    initializeView: function () {
        this.view = new FixerView(this);
    }
};

/**
 * @class
 * @constructor
 * @param {object} co
 */
Fixer.ConfigurationOption = function (co) {
    this.name = co.name;
    this.description = co.hasOwnProperty('description') ? co.description : '';
    this.hasDefaultValue = co.hasOwnProperty('defaultValue');
    if (this.hasDefaultValue) {
        this.defaultValue = co.defaultValue;
        if (this.defaultValue instanceof Array) {
            var defaultValueAsJson = [];
            this.defaultValue.forEach(function (value) {
                defaultValueAsJson.push(JSON.stringify(value));
            });
            this.defaultValueAsJson = '[' + defaultValueAsJson.join(', ') + ']';
        } else {
            this.defaultValueAsJson = JSON.stringify(this.defaultValue);
        }
    }
    this.allowedTypes = co.hasOwnProperty('allowedTypes') ? co.allowedTypes : [];
    this.allowedValues = co.hasOwnProperty('allowedValues') ? co.allowedValues : [];
    var allowedValuesAsJson = [];
    this.allowedValues.forEach(function (value) {
        allowedValuesAsJson.push(JSON.stringify(value));
    });
    this.allowedValuesAsJson = allowedValuesAsJson;
};

/**
 * @class
 * @constructor
 * @param {object} cs
 */
Fixer.CodeSample = function (cs) {
    this.fromCode = cs.from;
    this.toCode = cs.to;
    this.isConfigured = cs.hasOwnProperty('configuration');
    if (this.isConfigured) {
        this.configuration = cs.configuration;
    }
};

var FixerSets = (function () {
    var list = [];
    function sort() {
        list.sort(function (a, b) {
            return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
        });
    }
    return {
        add: function (fixerSet) {
            list.push(fixerSet);
            sort();
        },
        getAll: function () {
            return [].concat(list);
        },
        getByName: function (name) {
            for (var i = 0, n = list.length; i < n; i++) {
                if (list[i].name === name) {
                    return list[i];
                }
            }
            return null;
        }
    };
})();

/**
 * @class
 * @constructor
 * @param {string} name
 * @param {object[]} fixerDefs
 */
function FixerSet(name, fixerDefs) {
    this.name = name;
    this.fixers = [];
    this.risky = false;
    var searchableStrings = [];
    for (var fixerName in fixerDefs) {
        if (fixerDefs.hasOwnProperty(fixerName)) {
            var fixerData = {};
            fixerData.fixer = Fixers.getByName(fixerName);
            if (fixerData.fixer === null) {
                throw 'Unable to find a fixer with name ' + fixerName + ' for set ' + name;
            }
            searchableStrings.push(fixerData.fixer.searchableString);
            if (fixerData.fixer.risky === true) {
                this.risky = true;
            }
            fixerData.isConfigured = fixerDefs[fixerName] !== null;
            if (fixerData.isConfigured === true) {
                fixerData.configuration = fixerDefs[fixerName];
            }
            this.fixers.push(fixerData);
        }
    }
    this.searchableString = ' ' + getSearchableArray(searchableStrings.join(' ')).join(' ') + ' ';
    this.fixers.sort(function (a, b) {
        return a.fixer.name < b.fixer.name ? -1 : (a.fixer.name > b.fixer.name ? 1 : 0);
    });
}
FixerSet.prototype = {
    satisfySearch: function (seachableArray) {
        var ok = true, numWords = seachableArray.length, wordIndex;
        for (wordIndex = 0; ok === true && wordIndex < numWords; wordIndex++) {
            if (this.searchableString.indexOf(seachableArray[wordIndex]) < 0) {
                ok = false;
            }
        }
        return ok;
    },
    hasFixer: function (fixer) {
        for (var i = 0, n = this.fixers.length; i < n; i++) {
            if (this.fixers[i].fixer === fixer) {
                return true;
            }
        }
        return false;
    },
    showDetails: function () {
        ModalManager.show(Templater.build('fixerset-details', this));
    }
};

FixerSet.SelectedList = (function () {
    var selected = [],
        $selected = $('#pcs-selected-presets'),
        $unselected = $('#pcs-selected-presets-add');
    function refreshCards() {
        Fixers.getAll().forEach(function (fixer) {
            fixer.view.updateClasses();
        });
    }
    function updateView() {
        $selected.empty();
        $unselected.empty();
        selected.forEach(function (item, itemIndex) {
            $selected.append($('<span class="badge ' + (item[1] ? 'badge-success' : 'badge-danger') + '" />')
                .text(item[0].name + ' ')
                .append($('<a href="#" class="badge badge-warning"><i class="fa fa-times" aria-hidden="true"></i></a>')
                    .on('click', function (e) {
                        e.preventDefault();
                        selected.splice(itemIndex, 1);
                        while (selected.length > 0 && selected[0][1] === false) {
                            selected.splice(0, 1);
                        }
                        updateView();
                        refreshCards();
                    })
                )
            );
        });
        FixerSets.getAll().forEach(function (fixerSet) {
            var isSelected = false, somePlus = false;
            selected.forEach(function (item) {
                if (item[0] === fixerSet) {
                    isSelected = true;
                }
                if (item[1] === true) {
                    somePlus = true;
                }
            });
            if (isSelected) {
                return;
            }
            var $item;
            $unselected
                .append($item = $('<div class="dropdown-item" />')
                    .text(' ' + fixerSet.name)
                );
            if (somePlus) {
                $item
                    .prepend($('<a href="#" class="btn btn-sm btn-danger' + (somePlus ? '' : 'disabled') + '"><i class="fa fa-minus" aria-hidden="true"></i></a>')
                        .on('click', function (e) {
                            e.preventDefault();
                            setTimeout(
                                function () {
                                    selected.push([fixerSet, false]);
                                    updateView();
                                    refreshCards();
                                },
                                20
                            );
                        })
                    )
                    .prepend(' ')
                ;
            }
            $item
                .prepend($('<a href="#" class="btn btn-sm btn-success"><i class="fa fa-plus" aria-hidden="true"></i></a>')
                    .on('click', function (e) {
                        e.preventDefault();
                        setTimeout(
                            function () {
                                selected.push([fixerSet, true]);
                                updateView();
                                refreshCards();
                            },
                            20
                        );
                    })
                )
            ;
        });
    }
    return {
        initialize: function () {
            updateView();
            delete FixerSet.SelectedList.initialize;
        },
        containsFixer: function (fixer) {
            var result = false;
            selected.forEach(function (item) {
                if (item[0].hasFixer(fixer)) {
                    result = item[1];
                }
            });
            return result;
        },
        getSelected: function () {
            var result = [];
            selected.forEach(function (item) {
                result.push([item[0].name, item[1]]);
            });
            return result;
        }
    };
})();

/**
 * @class
 * @constructor
 * @param {Fixer} fixer
 */
function FixerView(fixer) {
    var me = this;
    me.fixer = fixer;
    me.selected = null;
    me.configuration = null;
    me.$card = $(Templater.build('fixer-card', fixer));
    me.$card.find('button, a').click(function (e) {
        e.stopPropagation();
    });
    me.$card.find('>.card').click(function () {
        me.toggleManualSelection();
    });
    if (me.fixer.configurationOptions.length > 0) {
        me.$card.find('.pcs-fixer-configure button').on('click', function () {
            me.configure();
        });
    }
    $('#pcs-cards').append(me.$card);
    me.updateClasses();
}
FixerView.prototype = {
    toggleManualSelection: function () {
        if (FixerSet.SelectedList.containsFixer(this.fixer)) {
            if (this.selected === true || this.selected === null) {
                this.selected = false;
            } else {
                this.selected = null;
            }
        } else {
            if (this.selected === true) {
                this.selected = null;
            } else {
                this.selected = this.selected ? null : true;
            }
        }
        this.updateClasses();
    },
    updateClasses: function () {
        this.$card.removeClass('pcs-fixerselection-no pcs-fixerselection-byfixerset-excluded pcs-fixerselection-byfixerset-included pcs-fixerselection-yes');
        if (FixerSet.SelectedList.containsFixer(this.fixer)) {
            if (this.selected === false) {
                this.$card.addClass('pcs-fixerselection-byfixerset-excluded');
            } else {
                this.$card.addClass('pcs-fixerselection-byfixerset-included');
            }
        } else if (this.selected === true) {
            this.$card.addClass('pcs-fixerselection-yes');
        } else {
            this.$card.addClass('pcs-fixerselection-no');
        }
    },
    configure: function () {
        window.alert('@todo');
    },
    /**
     * @returns {(null|boolean|object)}
     */
    getState: function () {
        if (FixerSet.SelectedList.containsFixer(this.fixer)) {
            if (this.selected === false) {
                return false;
            }
            if (this.configuration === null) {
                return null;
            }
        } else {
            if (this.selected !== true) {
                return null;
            }
            if (this.configuration === null) {
                var fixer = this.fixer;
                fixer.configurationOptions.forEach(function (configurationOption) {
                    if (!configurationOption.hasDefaultValue) {
                        throw 'The option "' + configurationOption.name + '" of the fixer "' + fixer.name + '" must be configured';
                    }
                });
            }
        }
        if (this.configuration === null) {
            return true;
        }
        return this.configuration;
    }
};

var State = (function () {
    return {
        get: function () {
            var result = FixerSet.SelectedList.getSelected();
            Fixers.getAll().forEach(function (fixer) {
                var state = fixer.view.getState();
                if (state !== null) {
                    result.push([fixer.name, state]);
                }
            });
            return result;
        }
    };
})();

var SavePanel = (function () {
    var $btnShow = $('#pcs-btn-save'),
        $panel = $('#pcs-save'),
        $saveFormat = $('#pcs-save-format'),
        $saveIndent = $('#pcs-save-indent'),
        $saveLineEnding = $('#pcs-save-line-ending'),
        $out = $('#pcs-save-output'),
        originalRight = $panel.css('right'),
        $backdrop = null,
        shown = false;
    function toggleVisibility() {
        if (shown) {
            hide();
        } else {
            show();
        }
    }
    function show() {
        if (shown !== false) {
            return;
        }
        shown = true;
        refreshOutput();
        $(document.body).css('overflow', 'hidden').append($backdrop = $('<div class="modal-backdrop show" />'));
        $panel.addClass('open');
        setTimeout(function () {
            $panel.css({'right': '0'});
            $backdrop.on('click', function () {
                hide();
            });
        }, 10);
    }
    function getSelectedExporter() {
        return $saveFormat.find('option:selected').data('pcs-exporter') || null;
    }
    function getSelectedWhitespace() {
        var result = {
            indent: JSON.parse('"' + $saveIndent.find('>option:selected').val() + '"'),
            lineEnding: JSON.parse('"' + $saveLineEnding.find('>option:selected').val() + '"')
        };
        if (result.indent === DefaultWhitespaceConfig.indent) {
            delete result.indent;
        }
        if (result.lineEnding === DefaultWhitespaceConfig.lineEnding) {
            delete result.lineEnding;
        }
        return result;
    }
    function refreshOutput() {
        $out.empty();
        try {
            var state = State.get(),
                whitespace = getSelectedWhitespace(),
                exporter = getSelectedExporter();
            if (exporter === null) {
                throw 'Select an export format';
            }
            var $code = $('<code />').text(exporter.render(state, whitespace)),
                $pre = $('<pre />').append($code),
                language = exporter.getLanguage ? exporter.getLanguage() : null;
            if (language) {
                $code.attr('class', 'language-' + language);
            }
            Prism.highlightElement($code[0]);
            $out.append($pre);
        } catch (x) {
            $out.append($('<div class="alert alert-danger" role="alert" />').text(x.message || x.toString()));
        }
    }
    function hide() {
        if (shown !== true) {
            return;
        }
        shown = false;
        $panel.css({'right': originalRight});
        setTimeout(function () {
            $panel.removeClass('open');
            $(document.body).css('overflow', '');
            $backdrop.remove();
            $backdrop = null;
        }, 300);
    }
    $btnShow.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleVisibility();
    });
    $panel.find('>.card-footer button').on('click', function () {
        hide();
    });
    $saveFormat.add($saveIndent).add($saveLineEnding).on('change', function() {
        if (shown === true) {
            refreshOutput();
        }
    });
    return {
        initialize: function () {
            $saveIndent.find('option[value="' + JSON.stringify(DefaultWhitespaceConfig.indent).replace(/^"|"$/g, '').replace(/\\/g, '\\\\') + '"]')
                .prop('selected', true)
                .css('font-weight', 'bold')
            ;
            $saveLineEnding.find('option[value="' + JSON.stringify(DefaultWhitespaceConfig.lineEnding).replace(/^"|"$/g, '').replace(/\\/g, '\\\\') + '"]')
                .prop('selected', true)
                .css('font-weight', 'bold')
            ;
        },
        show: show,
        hide: hide,
        registerExporter: function (exporter) {
            $saveFormat.append($('<option />')
                .text(exporter.getName ? exporter.getName() : exporter.toString())
                .data('pcs-exporter', exporter)
            );
            if ($saveFormat.find('>options').length === 1) {
                $saveFormat
                    .prop('selectedIndex', 0)
                    .trigger('change')
                ;
            }
        }
    };
})();

function PhpCsExporter() {
}
PhpCsExporter.prototype = {
    getName: function() {
        return '.php_cs / .php_cs.dist file';
    },
    getLanguage: function () {
        return 'php';
    },
    render: function (states, whitespace) {
        var lines = ['<?php', ''];
        lines.push('return PhpCsFixer\Config::create()');
        if (whitespace.hasOwnProperty('indent')) {
            lines.push('    ->setIndent(' + JSON.stringify(whitespace.indent) + ')');
        }
        if (whitespace.hasOwnProperty('lineEnding')) {
            lines.push('    ->setLineEnding(' + JSON.stringify(whitespace.lineEnding) + ')');
        }
        lines.push('    ->setRules([');
        states.forEach(function (state) {
            var line = '        \'' + state[0] + '\' => ';
            if (typeof state[1] === 'boolean') {
                lines.push(line + JSON.stringify(state[1]) + ',');
            } else {
                lines.push(line + '[');
                lines.push('],');
            }
        });
        lines.push('    ])');
        lines.push('    ->setFinder(PhpCsFixer\Finder::create()');
        lines.push('        ->exclude(\'vendor\')');
        lines.push('        ->in(__DIR__)');
        lines.push('    )');
        lines.push(';');
        lines.push('');
        return lines.join('\n');
    }
};

$.ajax({
    dataType: 'json',
    url: 'js/php-cs-fixer-data.min.json',
})
.fail(function (xhr, testStatus, errorThrown) {
    window.alert(errorThrown);
})
.done(function (data) {
    PHPCsFixerVersion = data.version;
    DefaultWhitespaceConfig = {
        indent: data.indent,
        lineEnding: data.lineEnding
    };
    $('#pcs-version').text(PHPCsFixerVersion);
    for (var fixerName in data.fixers) {
        if (data.fixers.hasOwnProperty(fixerName)) {
            Fixers.add(new Fixer(fixerName, data.fixers[fixerName]));
        }
    }
    for (var setName in data.sets) {
        if (data.sets.hasOwnProperty(setName)) {
            FixerSets.add(new FixerSet(setName, data.sets[setName]));
        }
    }
    Fixers.getAll().forEach(function (fixer) {
        fixer.resolveSets();
    });
    Search.initialize();
    FixerSet.SelectedList.initialize();
    Fixers.getAll().forEach(function (fixer) {
        fixer.initializeView();
    });
    SavePanel.initialize();
    SavePanel.registerExporter(new PhpCsExporter());
});

});