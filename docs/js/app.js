/* jshint unused:vars, undef:true, browser:true, jquery:true */
/* global Handlebars, Prism, jsyaml */
$(function () {
'use strict';

Handlebars.registerHelper('toJSON', function (value) {
    return JSON.stringify(value, null, 4);
});
Handlebars.registerHelper('toPHP', function (value) {
    return toPHP(value);
});
Handlebars.registerHelper('add1', function (value) {
    return 1 + value;
});
Handlebars.registerHelper('debug', function (value) {
    window.console.debug('Context', this, 'Value', value);
});

/**
 * @class
 * @constructor
 *
 * @param {Error|ErrorList|string|null} error - The initial error to be added to the list
 */
function ErrorList(error) {
    this.name = 'ErrorList';
    this.message = '';
    this.stack = (new Error()).stack;
    this.list = [];
    this.has = false;
    if (error) {
        this.add(error);
    }
}
ErrorList.prototype = Object.create(Error.prototype);
ErrorList.prototype.add = function (error) {
    if (error instanceof ErrorList) {
        var me = this;
        error.list.forEach(function (error) {
            me.add(error);
        });
        return;
    }
    var message = '';
    if (error !== null || error !== undefined) {
        if (error.hasOwnProperty('message') && error.message) {
            message = $.trim(error.message.toString());
        }
        if (message === '') {
            message = $.trim(error.toString());
        }
    }
    if (message === '') {
        message = '<Unspecified Error>';
    }
    this.message += (this.message === '' ? '' : '\n') + message;
    this.list.push(error instanceof Error ? error : new Error(message));
    this.has = true;
};

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

var Configurator = (function () {
    var enabled = false,
        $toggle = $('#pcs-btn-configure');
    $toggle.on('click', function () {
        Configurator.enabled = !Configurator.enabled;
    });
    return Object.defineProperties({}, {
        enabled: {
            get: function () {
                return enabled;
            },
            set: function (value) {
                value = !!value;
                if (enabled === value) {
                    return;
                }
                enabled = value;
                if (enabled) {
                    $('.pcf-onlyconfiguring-hidden').removeClass('pcf-onlyconfiguring-hidden').addClass('pcf-onlyconfiguring-visible');
                } else {
                    $('.pcf-onlyconfiguring-visible').removeClass('pcf-onlyconfiguring-visible').addClass('pcf-onlyconfiguring-hidden');
                }
                Fixers.getAll().forEach(function (fixer) {
                    fixer.view.updateClasses();
                });
                $toggle.removeClass('btn-default btn-success').addClass(enabled ? 'btn-success' : 'btn-default');
            }
        }
    });
})();

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

/**
 * Convert a Javascript variable to PHP.
 *
 * @param v
 *
 * @returns {string}
 */
function toPHP(v) {
    if (v === undefined || v === null) {
        return 'null';
    }
    switch (typeof v) {
        case 'boolean':
            return JSON.stringify(v);
        case 'number':
            if (Number.isNaN(v) || Number.isFinite(v) === false) {
                return 'null';
            }
            return JSON.stringify(v);
        case 'string':
            if (/[\x00-\x1f]/.test(v)) {
                var out = '', map = {};
                map[0x09] = '\\t';
                map[0x0a] = '\\n';
                map[0x0b] = '\\v';
                map[0x0c] = '\\f';
                map[0x0d] = '\\r';
                map[0x1b] = '\\e';
                map['"'.charCodeAt(0)] = '\\"';
                map['\\'.charCodeAt(0)] = '\\\\';
                map['$'.charCodeAt(0)] = '\\$';
                for (var char, charCode, charIndex = 0; charIndex < v.length; charIndex++) {
                    char = v.charAt(charIndex);
                    charCode = char.charCodeAt(0);
                    if (charCode in map) {
                        out += map[charCode];
                    } else if (charCode < 0x10) {
                        out += '\\x0' + charCode.toString(16);
                    } else if (charCode < 0x20) {
                        out += '\\x' + charCode.toString(16);
                    } else {
                        out += char;
                    }
                }
                return '"' + out + '"';
            }
            return "'" + v.replace(/\\/g, '\\\\').replace("'", "\\'") + "'";
    }
    var chunks;
    if (v instanceof Array) {
        chunks = [];
        v.forEach(function (chunk) {
            chunks.push(toPHP(chunk));
        });
        return '[' + chunks.join(', ') + ']';
    }
    if ($.isPlainObject(v)) {
        chunks = [];
        for (var key in v) {
            if (v.hasOwnProperty(key)) {
                chunks.push(toPHP(key) + ' => ' + toPHP(v[key]));
            }
        }
        return '[' + chunks.join(', ') + ']';
    }
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
                $a.on('click', function (e) {
                    e.preventDefault();
                    Fixers.getByName(fixerName).showDetails();
                });
            });
            $node.find('[data-pcf-show-fixerset]').each(function () {
                var $a = $(this), fixerSetName = $a.data('pcf-show-fixerset');
                $a.css('cursor', 'help').removeAttr('data-pcf-show-fixerset');
                $a.on('click', function (e) {
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
            return $dialog;
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
            $fixerSetItems.on('click', function (e) {
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
        if (a.hasDefaultValue !== b.hasDefaultValue) {
            return a.hasDefaultValue ? 1 : -1;
        } else {
            return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
        }
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
        this.view = new Fixer.View(this);
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
    }
    this.allowedTypes = co.hasOwnProperty('allowedTypes') ? co.allowedTypes : [];
    this.allowedValues = co.hasOwnProperty('allowedValues') ? co.allowedValues : [];
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
                throw new Error('Unable to find a fixer named ' + JSON.stringify(fixerName) + ' for set ' + name);
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
                    .on('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    })
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
                result.push([item[0], item[1]]);
            });
            return result;
        },
        reset: function() {
            selected = [];
            updateView();
            refreshCards();
        },
        add: function (fixerSetName, substract) {
            var fixerSet = FixerSets.getByName(fixerSetName);
            if (fixerSet === null) {
                throw new Error('Unable to find a preset named ' + JSON.stringify(fixerSetName));
            }
            selected.forEach(function (item) {
                if (item[0] === fixerSet) {
                    throw new Error('The preset ' + fixerSetName + ' is already selected');
                }
            });
            var positive = !substract;
            if (positive === false && selected.length === 0) {
                return false;
            }
            selected.push([fixerSet, positive]);
            updateView();
            refreshCards();
            return true;
        },
        updateVisibility: function () {
            updateView();
            refreshCards();
        }
    };
})();

/**
 * @class
 * @constructor
 * @param {Fixer} fixer
 */
Fixer.View = function (fixer) {
    var me = this;
    me.fixer = fixer;
    me.selected = null;
    me.$card = $(Templater.build('fixer-card', fixer));
    me.$card.find('button, a').on('click', function (e) {
        e.stopPropagation();
    });
    me.$card.find('>.card').on('click', function () {
        if (Configurator.enabled) {
            me.toggleManualSelection();
        }
    });
    if (me.fixer.configurationOptions.length > 0) {
        me.$card.find('.pcs-fixer-configure button').on('click', function () {
            me.configure();
        });
    }
    me.setConfiguration(null);
    $('#pcs-cards').append(me.$card);
    me.updateClasses();
};
Fixer.View.prototype = {
    reset: function() {
        this.selected = null;
        this.setConfiguration(null);
        this.updateClasses();
    },
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
        var newClass = 'pcs-fixerselection-no';
        if (Configurator.enabled) {
            if (FixerSet.SelectedList.containsFixer(this.fixer)) {
                if (this.selected === false) {
                    newClass = 'pcs-fixerselection-byfixerset-excluded';
                } else {
                    newClass = 'pcs-fixerselection-byfixerset-included';
                }
            } else if (this.selected === true) {
                newClass = 'pcs-fixerselection-yes';
            }
        }
        this.$card.addClass(newClass);
    },
    configure: function () {
        new Fixer.View.Configurator(this);
    },
    setConfiguration: function (configuration, allowWarnings) {
        var me = this;
        var errors = new ErrorList();
        if (configuration === null || $.isPlainObject(configuration) && $.isEmptyObject(configuration)) {
            me.configuration = null;
        } else {
            if (me.fixer.configurationOptions.length === 0) {
                throw new Error('The fixer "' + me.fixer.name + '" is not configurable');
            }
            if ($.isPlainObject(configuration) === false) {
                throw new Error('The configuration for the fixer "' + me.fixer.name + '" must be an object');
            }
            configuration = $.extend(true, {}, configuration);
            var fatalError = false;
            me.fixer.configurationOptions.forEach(function (configurationOption) {
                if (configuration.hasOwnProperty(configurationOption.name)) {
                    // Check value
                } else if(configurationOption.hasDefaultValue === false) {
                    errors.add(new Error('The configuration option "' + configurationOption.name + '" for the fixer "' + me.fixer.name + '" must be specified'));
                    fatalError = true;
                }
            });
            $.each(configuration, function (configurationField) {
                var found = false;
                me.fixer.configurationOptions.forEach(function (configurationOption) {
                    if (configurationField === configurationOption.name) {
                        found = true;
                    }
                });
                if (found === false) {
                    errors.push(new Error('The fixer "' + me.fixer.name + '" does not defines the option "' + configurationField + '"'));
                    delete configuration[configurationField];
                }
            });
            if (errors.has === false || (allowWarnings && fatalError === false)) {
                me.configuration = configuration;
            }
        }
        if (me.fixer.configurationOptions.length > 0) {
            var $btn = me.$card.find('.pcs-fixer-configure button').removeClass('btn-info btn-primary');
            if (me.configuration === null) {
                $btn.addClass('btn-info');
            } else {
                $btn.addClass('btn-primary');
            }
        }
        if (errors.has) {
            throw errors;
        }
    },
    /**
     * @returns {(null|boolean|object)} - Returns null if the fixer is not selected, false if excluded from selected presets, true if added with the default options, an object if it's added with custom options
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
                        throw new Error('The option "' + configurationOption.name + '" of the fixer "' + fixer.name + '" must be configured');
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

/**
 * @class
 * @constructor
 * @param {Fixer.View} fixerView
 */
Fixer.View.Configurator = function (fixerView) {
    var me = this;
    me.fixerView = fixerView;
    me.inFixerSets = FixerSet.SelectedList.containsFixer(fixerView.fixer);
    me.options = [];
    me.fixerView.fixer.configurationOptions.forEach(function (option, index) {
        me.options.push(new Fixer.View.Configurator.Option(me, option));
    });
    me.$dialog = ModalManager.show(Templater.build('fixer-card-configure', me));
    me.$select = me.$dialog.find('select.cgs-configuringoption');
    me.$panels = me.$dialog.find('div.cgs-configuringoption');
    me.$select.on('change', function () {
        me.showOption(this.selectedIndex);
    });
    try {
        me.options.forEach(function (option, index) {
            option.initialize($(me.$panels[index]));
        });
    } catch (e) {
        me.$dialog.modal('hide');
        window.alert(e.message || e.toString());
    }
    me.showOption(0);
    me.$dialog.find('.modal-footer .btn-primary').on('click', function () {
        var configuration;
        try {
            configuration = me.getConfiguration();
        } catch (e) {
            setTimeout(
                function () {
                    window.alert(e.message || e.toString());
                },
                10
            );
            return;
        }
        me.fixerView.setConfiguration(configuration);
        me.$dialog.modal('hide');
    });
};
Fixer.View.Configurator.prototype = {
    showOption: function (index) {
        if (this.$select.prop('selectedIndex') !== index) {
            this.$select.prop('selectedIndex', index).trigger('change');
        } else {
            this.$panels.hide();
            $(this.$panels[index]).show();
        }
    },
    getConfiguration: function () {
        var me = this, configuration = null;
        me.options.forEach(function (option, index) {
            var value;
            try {
                value = option.getValue();
            } catch (e) {
                me.showOption(index);
                throw e;
            }
            if (value !== undefined) {
                if (configuration === null) {
                    configuration = {};
                }
                configuration[option.option.name] = value;
            }
        });
        return configuration;
    }
};

/**
 * @class
 * @constructor
 * @param {Fixer.View.Configurator} configurator
 * @param {Fixer.ConfigurationOption} option
 */
Fixer.View.Configurator.Option = function (configurator, option) {
    this.configurator = configurator;
    this.option = option;
};
Fixer.View.Configurator.Option.prototype = {
    initialize: function ($container) {
        var me = this;
        me.$container = $container;
        me.$configure = $container.find('input[type="radio"][name="cgs-configuringoption-configure"]');
        me.$configure.on('change', function () {
            var custom = me.hasCustomConfig();
            me.$container
                .find('div.cgs-configuringoption-value')
                    .hide()
                    .filter('.cgs-configuringoption-value-' + (custom ? 'custom' : 'default'))
                        .show()
            ;
        });
        me.$custom = me.$container.find('.cgs-configuringoption-value-custom');
        var isConfigured = me.configurator.fixerView.configuration !== null && me.configurator.fixerView.configuration.hasOwnProperty(me.option.name);
        me.$configure.filter('[value="' + (isConfigured ? 'custom' : 'default') + '"]').trigger('click');
        var typeSupported = false;
        if (me.option.allowedValues.length > 0) {
            me.initialize_AllowedValues(me.option.allowedValues);
            typeSupported = true;
        } else {
            var allowedTypes = [].concat(me.option.allowedTypes),
                nullIndex = allowedTypes.length > 1 ? allowedTypes.indexOf('null') : -1,
                nullable = nullIndex >= 0;
            if (nullable === true) {
                allowedTypes.splice(nullIndex, 1);
            }
            if (allowedTypes.length === 1) {
                me['initializeType_' + me.option.allowedTypes[0]](nullable);
                typeSupported = true;
            }
        }
        if (typeSupported === false) {
            throw new Error('Unsupported definition for option ' + me.option.name);
        }
    },
    hasCustomConfig: function () {
        return this.$container.find('input[name="cgs-configuringoption-configure"][value="custom"]').is(':checked');
    },
    getInitialValue: function () {
        return this.configurator.fixerView.configuration !== null && this.configurator.fixerView.configuration.hasOwnProperty(this.option.name) ?
            this.configurator.fixerView.configuration[this.option.name] :
            undefined
        ;
    },
    initialize_AllowedValues: function (allowedValues) {
        var me = this, $form, initialValue = this.getInitialValue();
        me.$custom.append($form = $('<form />'));
        allowedValues.forEach(function (value) {
            $form.append($('<div class="form-check" />')
                .append($('<label class="form-check-label" />')
                    .append($('<input class="form-check-input" type="radio" name="value"' + (value === initialValue ? ' checked="checked"' : '') + ' />')
                        .data('pcf-value', value)
                    )
                    .append(' ')
                    .append($('<code />')
                        .text(toPHP(value))
                    )
                )
            );
        });
        me.getCustomValue = function () {
            var $checked = $form.find('input:checked');
            if ($checked.length === 0) {
                throw new Error('Please select one of the allowed values');
            }
            return $checked.data('pcf-value');
        };
    },
    initializeType_bool: function (nullable) {
        var allowedValues = [];
        if (nullable === true) {
            allowedValues.push(null);
        }
        allowedValues.push(false);
        allowedValues.push(true);
        this.initialize_AllowedValues(allowedValues);
    },
    initializeType_array: function (nullable) {
        var me = this, type = null, typeName = 'Please specify an array or an object in JSON format';
        if (me.option.hasDefaultValue) {
            if (me.option.defaultValue instanceof Array) {
                type = 'array';
                typeName = 'Please specify an array in JSON format';
            } else if ($.isPlainObject(me.option.defaultValue)) {
                type = 'object';
                typeName = 'Please specify an object in JSON format';
            }
        }
        if (nullable === true) {
            typeName += ' (or an empty string for NULL)';
        }
        me.$custom.html([
            '<div class="form-group">',
                '<label>' + typeName + ':</label>',
                '<textarea class="form-control code" rows="5"></textarea>',
            '</div>',
        ''].join(''));
        var initialValue = me.getInitialValue();
        if (initialValue) {
            me.$custom.find('textarea').val(JSON.stringify(initialValue, null, 4));
        }
        me.getCustomValue = function () {
            var json = $.trim(me.$custom.find('textarea').val());
            if (json === '') {
                if (nullable === true) {
                    return null;
                } else {
                    throw new Error('Please enter the JSON code');
                }
            }
            var value;
            try {
                value = JSON.parse(json);
            } catch (e) {
                throw new Error('The JSON is invalid');
            }
            switch (type) {
                case 'array':
                    if ((value instanceof Array) === false) {
                        throw new Error('Please enter the JSON representation of an array');
                    }
                    break;
                case 'object':
                    if ($.isPlainObject(value) === false) {
                        throw new Error('Please enter the JSON representation of an object');
                    }
                    break;
                default:
                    if ((value instanceof Array) === false && $.isPlainObject(value) === false) {
                        throw new Error('Please enter the JSON representation of an array or of an object');
                    }
                    break;
            }
            return value;
        };
    },
    initializeType_string: function () {
        var me = this;
        me.$custom.html([
            '<div class="form-group">',
                '<label>Please enter the value of the option:</label>',
                '<textarea class="form-control code" rows="5"></textarea>',
            '</div>',
        ''].join(''));
        var initialValue = me.getInitialValue();
        if (initialValue !== undefined) {
            me.$custom.find('textarea').val(initialValue);
        }
        me.getCustomValue = function () {
            return me.$custom.find('textarea').val();
        };
    },
    getValue: function () {
        return this.hasCustomConfig() ? this.getCustomValue() : undefined;
    }
};

var State = (function () {
    return {
        reset: function() {
            FixerSet.SelectedList.reset();
            Fixers.getAll().forEach(function (fixer) {
                fixer.view.reset();
            });
            Saver.resetOptions();
        },
        get: function (full) {
            var state = {};
            var whitespace = Saver.whitespace;
            if ($.isEmptyObject(whitespace) === false) {
                state.whitespace = whitespace;
            }
            FixerSet.SelectedList.getSelected().forEach(function (item) {
                if (item[1] === true && item[0].risky === true) {
                    state.risky = true;
                }
                if (state.fixerSets === undefined) {
                    state.fixerSets = [];
                }
                state.fixerSets.push((item[1] ? '' : '-') + item[0].name);
            });
            Fixers.getAll().forEach(function (fixer) {
                var fixerState = fixer.view.getState();
                if (fixerState !== null) {
                    if (fixerState !== false && fixer.risky === true) {
                        state.risky = true;
                    }
                    if (state.fixers === undefined) {
                        state.fixers = {};
                    }
                    state.fixers[fixer.name] = fixerState;
                }
            });
            if (full === true) {
                var importer = Loader.currentImporter;
                if (importer !== null) {
                    state._importer = importer.getName();
                }
                var exporter = Saver.currentExporter;
                if (exporter !== null) {
                    state._exporter = exporter.getName();
                }
            }
            return state;
        },
        set: function (state) {
            state = $.extend(true, {}, state);
            var errors = new ErrorList();
            State.reset();
            if ($.isPlainObject(state.whitespace)) {
                try {
                    Saver.whitespace = state.whitespace;
                } catch (x) {
                    errors.add(x);
                }
                delete state.whitespace;
            }
            if (state.fixerSets instanceof Array) {
                state.fixerSets.forEach(function (fixerSetName) {
                    var negated = typeof fixerSetName === 'string' && fixerSetName.length > 1 && fixerSetName.charAt(0) === '-';
                    if (negated) {
                        fixerSetName = fixerSetName.substr(1);
                    }
                    try {
                        FixerSet.SelectedList.add(fixerSetName, negated);
                    } catch (x) {
                        errors.add(x);
                    }
                });
                delete state.fixerSets;
            }
            if ($.isPlainObject(state.fixers)) {
                $.each(state.fixers, function (fixerName, fixerConfiguration) {
                    try {
                        var fixer = Fixers.getByName(fixerName);
                        if (fixer === null) {
                            throw new Error('Unable to find a fixer named ' + JSON.stringify(fixerName));
                        }
                        var addConfigured = false;
                        if (FixerSet.SelectedList.containsFixer(fixer)) {
                            if (fixerConfiguration === false) {
                                fixer.view.toggleManualSelection();
                            } else if (fixerConfiguration !== true) {
                                addConfigured = true;
                            }
                        } else {
                            if (fixerConfiguration !== false) {
                                fixer.view.toggleManualSelection();
                                if (fixerConfiguration !== true) {
                                    addConfigured = true;
                                }
                            }
                        }
                        if (addConfigured === true) {
                            fixer.view.setConfiguration(fixerConfiguration, true);
                        }
                    } catch (x) {
                        errors.add(x);
                    }
                });
                delete state.fixers;
            }
            delete state.risky;
            if (typeof state._importer === 'string') {
                Loader.currentImporter = state._importer;
                delete state._importer;
            }
            if (typeof state._exporter === 'string') {
                Saver.currentExporter = state._exporter;
                delete state._exporter;
            }
            $.each(state, function (unrecognized) {
                errors.add(new Error('Unrecognized property: ' + unrecognized));
            });
            if (errors.has) {
                throw errors;
            }
        }
    };
})();

var Loader = (function () {
    var $loadFormat = $('#pcs-load-format'),
        $input = $('#pcs-modal-load textarea');

    function load() {
        var serialized = $.trim($input.val()), state;
        if (serialized === '') {
            state = {};
        } else {
            var importer = Loader.currentImporter;
            if (importer === null) {
                window.alert('Please select an import format');
            }
            try {
                state = importer.parse(serialized);
            } catch (e) {
                window.alert(e.message || e.toString());
                return;
            }
        }
        try {
            State.set(state);
        } catch (errors) {
            setTimeout(
                function () {
                    window.alert(errors.message);
                },
                10
            );
            return;
        }
        $('#pcs-modal-load').modal('hide');
    }

    $('#pcs-modal-load')
        .on('shown.bs.modal', function () {
            if ($(window).height() > 600) {
                $input.focus();
            }
        })
        .find('.btn-primary').on('click', function () {
            load();
        })
    ;

    return Object.defineProperties(
        {
            initialize: function (importers) {
                if (importers) {
                    importers.forEach(function (importer) {
                        Loader.registerImporter(importer);
                    });
                }
                delete Loader.initialize;
            },
            registerImporter: function (importer, selected) {
                $loadFormat.append($('<option />')
                    .text(importer.getName())
                    .data('pcs-importer', importer)
                );
                var numImporters = $loadFormat.find('>option').length;
                if (numImporters === 1 || selected) {
                    $loadFormat
                        .prop('selectedIndex', numImporters - 1)
                        .trigger('change')
                    ;
                }
            }
        },
        {
            currentImporter: {
                get: function () {
                    return $loadFormat.find('>option:selected').data('pcs-importer') || null;
                },
                set: function (value) {
                    $loadFormat.find('>option').each(function (index) {
                        var importer = $(this).data('pcs-importer');
                        if (importer === value || importer.getName() === value) {
                            $loadFormat
                                .prop('selectedIndex', index)
                                .trigger('change')
                            ;
                            return false;
                        }
                    });
                }
            }
        }
    );
})();
function JsonImporter() {
}
JsonImporter.prototype = {
    getName: function () {
        return 'JSON';
    },
    parse: function (serialized) {
        var state;
        try {
            state = JSON.parse(serialized);
        } catch (e) {
            throw new Error('The JSON is invalid');
        }
        if ($.isPlainObject(state) !== true) {
            throw new Error('The JSON code does not represent an object');
        }
        return state;
    }
};
function YamlImporter() {
}
YamlImporter.prototype = {
    getName: function () {
        return 'YAML';
    },
    parse: function (serialized) {
        var state;
        try {
            state = jsyaml.safeLoad(serialized);
        } catch (e) {
            throw new Error('The YAML is invalid');
        }
        if ($.isPlainObject(state) !== true) {
            throw new Error('The YAML code does not represent an object');
        }
        return state;
    }
};

var Saver = (function () {
    var $saveFormat = $('#pcs-save-format'),
        $saveIndent = $('#pcs-save-indent'),
        $saveLineEnding = $('#pcs-save-line-ending'),
        $out = $('#pcs-save-output'),
        $outCopy = $('#pcs-save-output-copy'),
        $persist = $('#pcs-save-persist'),
        shown = false;

    function refreshOutput() {
        $out.empty();
        try {
            var exporter = Saver.currentExporter;
            if (exporter === null) {
                throw new Error('Select an export format');
            }
            if ('supportsIndent' in exporter && exporter.supportsIndent() === false) {
                $saveIndent.attr('disabled', 'disabled');
            } else {
                $saveIndent.removeAttr('disabled');
            }
            if ('supportsLineEnding' in exporter && exporter.supportsLineEnding() === false) {
                $saveLineEnding.attr('disabled', 'disabled');
            } else {
                $saveLineEnding.removeAttr('disabled');
            }
            var state = State.get(),
                $code = $('<code />')
                    .attr('class', 'language-' + exporter.getLanguage())
                    .text(exporter.render(state)),
                $pre = $('<pre />').append($code);
            Prism.highlightElement($code[0]);
            $out.append($pre);
            $outCopy.removeAttr('disabled');
        } catch (x) {
            $out.append($('<div class="alert alert-danger" role="alert" />').text(x.message || x.toString()));
            $outCopy.attr('disabled', 'disabled');
        }
    }
    $('#pcs-modal-save')
        .on('show.bs.modal', function (e) {
            shown = true;
            refreshOutput();
        })
        .on('shown.bs.modal', function () {
            if ($(window).height() > 600) {
                $saveFormat.focus();
            }
        })
        .on('hidden.bs.modal', function (e) {
            shown = false;
        })
    ;
    $saveFormat.add($saveIndent).add($saveLineEnding).on('change', function () {
        if (shown === true) {
            refreshOutput();
        }
    });
    $outCopy.on('click', function (e) {
        var copied = !false;
        $outCopy.removeClass('btn-danger btn-success').addClass('btn-info');
        try {
            if (window.getSelection && document.createRange) {
                var range = document.createRange();
                range.selectNodeContents($out[0]);
                var selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                if (document.execCommand('copy') === true) {
                    copied = true;
                }
                selection.empty();
            } else if (document.body.createTextRange) {
                var textRange = document.body.createTextRange();
                textRange.moveToElementText($out[0]);
                textRange.select();
                if (textRange.execCommand('copy') === true) {
                    copied = true;
                }
                if (window.getSelection) {
                    window.getSelection().removeAllRanges();
                } else if (document.selection) {
                    document.selection.empty();
                }
            }
        } catch (exception) {
        }
        if (copied) {
            $outCopy.removeClass('btn-info btn-danger').addClass('btn-success');
        } else {
            $outCopy.removeClass('btn-info btn-success').addClass('btn-danger');
        }
        setTimeout(function () {
            $outCopy.removeClass('btn-danger btn-success').addClass('btn-info');
        }, 500);
    });
    return Object.defineProperties(
        {
            initialize: function (exporters) {
                Saver.resetOptions();
                if (exporters) {
                    exporters.forEach(function (exporter) {
                        Saver.registerExporter(exporter);
                    });
                }
                delete Saver.initialize;
            },
            registerExporter: function (exporter, selected) {
                $saveFormat.append($('<option />')
                    .text(exporter.getName())
                    .data('pcs-exporter', exporter)
                );
                var numExporters = $saveFormat.find('>option').length;
                if (numExporters === 1 || selected) {
                    $saveFormat
                        .prop('selectedIndex', numExporters - 1)
                        .trigger('change')
                    ;
                }
            },
            resetOptions: function() {
                Saver.whitespace = DefaultWhitespaceConfig;
            },
        },
        {
            whitespace: {
                get: function () {
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
                },
                set: function (value) {
                    if (!$.isPlainObject(value)) {
                        throw new Error('Whitespace configuration is not an object');
                    }
                    var errors = new ErrorList();
                    value = $.extend({}, DefaultWhitespaceConfig, value || {});
                    var $option;
                    $option = $saveIndent.find('option[value="' + JSON.stringify(value.indent).replace(/^"|"$/g, '').replace(/\\/g, '\\\\') + '"]');
                    if ($option.length === 1) {
                        $option.prop('selected', true);
                    } else {
                        errors.add(new Error('Invalid indent value: ' + JSON.stringify(value.indent)));
                    }
                    delete value.indent;
                    $option = $saveLineEnding.find('option[value="' + JSON.stringify(value.lineEnding).replace(/^"|"$/g, '').replace(/\\/g, '\\\\') + '"]');
                    if ($option.length === 1) {
                        $option.prop('selected', true);
                    } else {
                        errors.add(new Error('Invalid line ending value: ' + JSON.stringify(value.lineEnding)));
                    }
                    delete value.lineEnding;
                    $.each(value, function (unrecognized) {
                        errors.add(new Error('Unrecognized whitespace property: ' + unrecognized));
                    });
                    if (errors.has === true) {
                        throw errors;
                    }
                }
            },
            currentExporter: {
                get: function () {
                    return $saveFormat.find('>option:selected').data('pcs-exporter') || null;
                },
                set: function (value) {
                    $saveFormat.find('>option').each(function (index) {
                        var exporter = $(this).data('pcs-exporter');
                        if (exporter === value || exporter.getName() === value) {
                            $saveFormat
                                .prop('selectedIndex', index)
                                .trigger('change')
                            ;
                            return false;
                        }
                    });
                }
            },
            persist: {
                get: function () {
                    return $persist.is(':checked');
                },
                set: function (value) {
                    $persist.prop('checked', !!value);
                }
            }
        }
    );

})();

function PhpCsExporter() {
}
PhpCsExporter.prototype = {
    getName: function () {
        return '.php_cs / .php_cs.dist file';
    },
    getLanguage: function () {
        return 'php';
    },
    render: function (state) {
        var lines = ['<?php', ''];
        lines.push('return PhpCsFixer\\Config::create()');
        if (state.risky === true) {
            lines.push('    ->setRiskyAllowed(true)');
        }
        if ('whitespace' in state) {
            if (state.whitespace.hasOwnProperty('indent')) {
                lines.push('    ->setIndent(' + toPHP(state.whitespace.indent) + ')');
            }
            if (state.whitespace.hasOwnProperty('lineEnding')) {
                lines.push('    ->setLineEnding(' + toPHP(state.whitespace.lineEnding) + ')');
            }
        }
        lines.push('    ->setRules([');
        if ('fixerSets' in state) {
            state.fixerSets.forEach(function (fixerSetName) {
                if (fixerSetName.charAt(0) === '-') {
                    lines.push('        ' + toPHP(fixerSetName.substr(1)) + ' => ' + toPHP(false) + ',');
                } else {
                    lines.push('        ' + toPHP(fixerSetName) + ' => ' + toPHP(true) + ',');
                }
            });
        }
        if ('fixers' in state) {
            $.each(state.fixers, function (fixerName, fixerState) {
                lines.push('        ' + toPHP(fixerName) + ' => ' + toPHP(fixerState) + ',');
            });
        }
        lines.push('    ])');
        lines.push('    ->setFinder(PhpCsFixer\\Finder::create()');
        lines.push('        ->exclude(\'vendor\')');
        lines.push('        ->in(__DIR__)');
        lines.push('    )');
        lines.push(';');
        lines.push('');
        return lines.join('\n');
    }
};

function JsonExporter() {
}
JsonExporter.prototype = {
    getName: function () {
        return 'JSON';
    },
    getLanguage: function () {
        return 'json';
    },
    render: function (state) {
        return JSON.stringify(state, null, 4);
    }
};

function YamlExporter() {
}
YamlExporter.prototype = {
    getName: function () {
        return 'YAML';
    },
    getLanguage: function () {
        return 'yaml';
    },
    render: function (state) {
        return jsyaml.safeDump(state);
    }
};

function StyleCILikeExporter() {
}
StyleCILikeExporter.prototype = {
    getName: function () {
        return 'StyleCI-like';
    },
    getLanguage: function () {
        return 'yaml';
    },
    supportsIndent: function () {
        return false;
    },
    supportsLineEnding: function () {
        return false;
    },
    render: function (state) {
        var data = {};
        var preset = null;
        if ('fixerSets' in state) {
            if (state.fixerSets.length > 0) {
                if (state.fixerSets.length > 1) {
                    throw new Error('StyleCI supports up to 1 preset');
                }
                preset = state.fixerSets[0];
            }
        }
        data.preset = (preset === null ? 'none' : preset.substr(1));
        if (state.risky === true) {
            data.risky = state.risky;
        }
        if ('fixers' in state) {
            $.each(state.fixers, function (fixerName, fixerState) {
                if (fixerState === true) {
                    if (data.enabled === undefined) {
                        data.enabled = [];
                    }
                    data.enabled.push(fixerName);
                } else if(fixerState !== false) {
                    throw new Error('StyleCI does not support configured fixers');
                }
            });
        }
        return jsyaml.safeDump(data);
    }
};

var Persister = (function () {
    var KEY = 'php-cs-fixer-configuration.persist.v1';
    $(window).on('beforeunload', function () {
        try {
            if (Saver.persist) {
                window.localStorage.setItem(KEY, JSON.stringify(State.get(true)));
            } else {
                window.localStorage.removeItem(KEY);
            }
        } catch (e) {
        }
    });
    return {
        initialize: function () {
            try {
                var json = window.localStorage.getItem(KEY);
                if (json) {
                    var state = JSON.parse(json);
                    if ($.isPlainObject(state)) {
                        Saver.persist = true;
                        State.set(state);
                    }
                }
            } catch (e) {
            }
            delete Persister.initialize;
        }
    };
})();

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
    Loader.initialize([
        new JsonImporter(),
        new YamlImporter()
    ]);
    Saver.initialize([
        new PhpCsExporter(),
        new JsonExporter(),
        new YamlExporter(),
        new StyleCILikeExporter()
    ]);
    Persister.initialize();
    if (window.location.hash === '#configurator') {
        Configurator.enabled = true;
    }
});

});