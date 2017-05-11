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
        .replace(/[_\W]+/g, ' ')
        .toLowerCase()
        .replace(/  +/g, ' ')
        .replace(/^ | $/g, '')
        .split(' ')
        .filter(function (value, index, array) {
            return value !== '' && array.indexOf(value) === index;
        })
    ;
}

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
       },
       search: function (string) {
           var seachableArray = getSearchableArray(string), result = [];
           list.forEach(function (fixer) {
               if (fixer.satisfySearch(seachableArray)) {
                   result.push(fixer);
               }
           });
           return result;
       }
   };
})();

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
            $node.find('.prismify-me>code').each(function() {
                Prism.highlightElement(this);
            });
            return $node;
        },
        dialog: function (id, data) {
            var $dialog = $(Template.build(id, data));
            $(window.document.body).append($dialog);
            $dialog.on('hidden.bs.modal', function () {
                $dialog.remove();
            });
            $dialog.modal();
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
    satisfySearch: function (seachableArray) {
        var ok = true, numWords = seachableArray.length, wordIndex;
        for (wordIndex = 0; ok === true && wordIndex < numWords; wordIndex++) {
            if (this.searchableString.indexOf(seachableArray[wordIndex]) < 0) {
                ok = false;
            }
        }
        return ok;
    },
    showDetails: function () {
        Template.dialog('fixer-details', this);
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
        }
    };
 })();

function FixerSet(name, fixerDefs) {
    this.name = name;
    this.fixers = [];
    this.risky = false;
    for (var fixerName in fixerDefs) {
        if (fixerDefs.hasOwnProperty(fixerName)) {
            var fixer = Fixers.getByName(fixerName);
            if (fixer === null) {
                throw 'Unable to find a fixer with name ' + fixerName + ' for set ' + name;
            }
            if (fixer.risky === true) {
                this.risky = true;
            }
            this.fixers.push({
                fixer: fixer,
                configuration: fixerDefs[fixerName]
            });
        }
    }
    this.fixers.sort(function (a, b) {
        return a.fixer.name < b.fixer.name ? -1 : (a.fixer.name > b.fixer.name ? 1 : 0);
    });
}

$.ajax({
    dataType: 'json',
    url: 'js/php-cs-fixer-data.min.json',
})
.fail(function (xhr, testStatus, errorThrown) {
    window.alert(errorThrown);
})
.done(function (data) {
    PHPCsFixerVersion = data.version;
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
    var $ul = $('#list');
    Fixers.getAll().forEach(function (fixer) {
        $ul.append($('<li />')
            .append($('<a href="#" />')
                .text(fixer.name)
                .click(function (e) {
                    e.preventDefault();
                    fixer.showDetails();
                })
            )
        );
    })
});

});