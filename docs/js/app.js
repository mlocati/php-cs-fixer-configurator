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

var PHPCsFixerVersion;

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

var Template = (function () {
    var loadedTemplates = {};
    return {
        get: function (id, data) {
            if (!loadedTemplates.hasOwnProperty(id)) {
                loadedTemplates[id] = Handlebars.compile($('#template-' + id).html());
            }
            return loadedTemplates[id];
        },
        build: function (id, data) {
            var template = Template.get(id),
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
            $node.find('[data-toggle="tooltip"]').tooltip();
            return $node;
        }
    };
})();

var ModalManager = (function () {
    var stack = [];
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
                    keyboard: true,
                    focus: true,
                    show: true
                })
            ;
        }
    };
})();

var Search = (function () {
    var lastSearchText = '', lastFixerSets = [], $search;
    function performSearch() {
        var searchText = $.trim($search.val()),
            filterSets = FixerSetFilter.getSelectedFixerSets();
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
            $search.on('keydown keyup keypress change blur mousedown mouseup', function () {
                performSearch();
            });
            delete Search.initialize;
        },
        perform: function () {
            performSearch();
        }
    };
})();

var FixerSetFilter = (function () {
    var $menuItems, selected;
    function updateSelected() {
        selected = [];
        $menuItems.find('i.fa-check-square-o').each(function () {
            selected.push($(this).closest('a[data-fixerset]').data('fixerset'));
        });
        if (selected.length === $menuItems.length) {
            selected = [];
        }
    }
    function toggleFixerSet(name) {
        $menuItems.filter('[data-fixerset="' + name + '"]').find('i.fa').toggleClass('fa-check-square-o fa-square-o');
        updateSelected();
        Search.perform();
    }
    return {
        initialize: function () {
            var $menu = $('#pcs-filter-sets');
            FixerSets.getAll().forEach(function (fixerSet) {
                $menu.append($('<a class="dropdown-item" href="#" />')
                    .attr('data-fixerset', fixerSet.name)
                    .text(' ' + fixerSet.name)
                    .prepend('<i class="fa fa-square-o" aria-hidden="true"></i>')
                );
            });
            $menuItems = $menu.find('a[data-fixerset]');
            $menuItems.click(function (e) {
                e.preventDefault();
                e.stopPropagation();
                toggleFixerSet($(this).data('fixerset'));
            });
            updateSelected();
            delete FixerSetFilter.initialize;
        },
        getSelectedFixerSets: function () {
            return selected;
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
        ModalManager.show(Template.build('fixer-details', this));
    },
    resolveSets: function () {
        var me = this;
        me.sets = [];
        FixerSets.getAll().forEach(function (fixerSet) {
            if (fixerSet.hasFixer(me)) {
                me.sets.push(fixerSet);
            }
        });
    }
};

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
        ModalManager.show(Template.build('fixerset-details', this));
    }
};

FixerSet.SelectedList = (function () {
    var selected = [];
    return {
        get: function () {
            return [].concat(selected);
        },
        containsFixer: function (fixer) {
            for (var i = 0; i < selected.length; i++) {
                if (FixerSets.getByName(selected[i]).hasFixer(fixer)) {
                    return true;
                }
            }
            return false;
        }
    };
})();

function FixerView(fixer) {
    var me = this;
    me.fixer = fixer;
    me.selected = null;
    me.configuration = null;
    me.$card = $(Template.build('fixer-card', fixer));
    me.$card.find('button, a').click(function (e) {
        e.stopPropagation();
    });
    me.$card.find('>.card').click(function () {
        me.toggleManualSelection();
    });
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
    FixerSetFilter.initialize();
    Fixers.getAll().forEach(function (fixer) {
        new FixerView(fixer);
    });
});

});