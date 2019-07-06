let textToHtmlDiv: HTMLDivElement = document.createElement('div');

export const ValueType = {
    UNDEFINED: 1,
    BOOLEAN: 2,
    INTEGER: 3,
    DECIMAL: 4,
    STRING: 5,
    OBJECT: 7,
    NULL: 7,
    ARRAY: 8,
    get: function (value: any | undefined): number {
        const type: string = typeof value;
        switch (type) {
            case 'undefined':
                return ValueType.UNDEFINED;
            case 'object':
                if (value === null) {
                    return ValueType.NULL;
                }
                if (value instanceof Array) {
                    return ValueType.ARRAY;
                }
                return ValueType.OBJECT;
            case 'boolean':
                return ValueType.BOOLEAN;
            case 'number':
                if (!isFinite(value)) {
                    throw new Error('Infinite numbers are not supported');
                }
                return Number.isInteger(value) ? ValueType.INTEGER : ValueType.DECIMAL;
            case 'string':
                return ValueType.STRING;
        }
        throw new Error(`Unsupported value type: ${type}`);
    }
}

export function textToHtml(text: string, backTicksToCode: boolean): string {
    if (text === null || text === undefined) {
        return '';
    }
    text = text.toString();
    let textLines: string[] = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n'),
        htmlLines: string[] = [];
    textLines.forEach(function (line, index) {
        textToHtmlDiv.textContent = line;
        htmlLines.push(textToHtmlDiv.innerHTML);
    });
    let html: string = htmlLines.join('\n');
    if (backTicksToCode) {
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    }
    return html;
}

export function getSearchableArray(text: string): string[] {
    return text
        .replace(/[^\w\.]+/g, ' ')
        .toLowerCase()
        .replace(/  +/g, ' ')
        .replace(/^ | $/g, '')
        .split(' ')
        .filter(function (value: string, index: number, array: string[]) {
            return value !== '' && array.indexOf(value) === index;
        })
        ;
}

const SPECIAL_PHP_CHAR_MAP: { [charCode: number]: string } = {
    0x09: '\\t', // \t
    0x0a: '\\n', // \a
    0x0b: '\\v', // \b
    0x0c: '\\f', // \c
    0x0d: '\\r', // \d
    0x1b: '\\e', // \e
    0x22: '\\"', // "
    0x5c: '\\"', // \
    0x24: '\\$', // $

};

function valueToPhp(value: any, pretty: boolean, indentLevel: number): string {
    const INDENT1: string = '    ';
    if (value === null) {
        return 'null';
    }
    switch (typeof value) {
        case 'undefined':
            return 'null';
        case 'boolean':
            return JSON.stringify(value);
        case 'number':
            return Number.isNaN(value) || !Number.isFinite(value) ? 'null' : JSON.stringify(value);
        case 'string':
            if (/[\x00-\x1f]/.test(value)) {
                let out = '';
                for (let charIndex = 0; charIndex < value.length; charIndex++) {
                    let char = value.charAt(charIndex),
                        charCode = char.charCodeAt(0);
                    if (SPECIAL_PHP_CHAR_MAP.hasOwnProperty(charCode)) {
                        out += SPECIAL_PHP_CHAR_MAP[charCode];
                    } else {
                        if (charCode < 0x10) {
                            out += '\\x0' + charCode.toString(16);
                        } else if (charCode < 0x20) {
                            out += '\\x' + charCode.toString(16);
                        } else {
                            out += char;
                        }
                    }
                }
                return `"${out}"`;
            }
            return "'" + value.replace(/\\/g, '\\\\').replace("'", "\\'") + "'";
    }
    if (value instanceof Array) {
        const values: string[] = [];
        value.forEach((chunk: any) => {
            values.push(valueToPhp(chunk, pretty, indentLevel + 1));
        });
        if (pretty && value.length > 1) {
            return '[\n' + INDENT1.repeat(indentLevel + 1) + values.join(',\n' + INDENT1.repeat(indentLevel + 1)) + ',\n' + INDENT1.repeat(indentLevel) + ']';
        }
        return '[' + values.join(',') + ']';
    }
    if (typeof value === 'object') {
        const values: string[] = [];
        const KEYVALUE_SEPARATOR = pretty ? ' => ' : '=>';
        Object.keys(value).forEach((key: string) => {
            values.push(valueToPhp(key, pretty, indentLevel + 1) + KEYVALUE_SEPARATOR + valueToPhp(value[key], pretty, indentLevel + 1));
        });
        if (pretty && value.length > 0) {
            return '[\n' + INDENT1.repeat(indentLevel + 1) + values.join(',\n' + INDENT1.repeat(indentLevel + 1)) + ',\n' + INDENT1.repeat(indentLevel) + ']';
        }
        return '[' + values.join(',') + ']';
    }
    throw new Error('Unhandled object type: ' + (typeof value));
}

export function toPhp(value: any, pretty: boolean = false, indentLevel: number = 0): string {
    return valueToPhp(value, pretty, indentLevel);
}

export function copyToClipboard(text: string): boolean {
    let textDiv: HTMLDivElement = document.createElement('div');
    document.body.appendChild(textDiv);
    textDiv.style.whiteSpace = 'pre';
    textDiv.textContent = text;
    let copied = false;
    try {
        if (window.getSelection && document.createRange) {
            let range = document.createRange();
            range.selectNodeContents(textDiv);
            let selection = <Selection>window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            copied = document.execCommand('copy') === true;
            selection.empty();
        } else if ((<any>document.body).createTextRange) {
            let textRange = (<any>document.body).createTextRange();
            textRange.moveToElementText(textDiv);
            textRange.select();
            copied = textRange.execCommand('copy') === true;
            if (window.getSelection) {
                (<any>window).getSelection().removeAllRanges();
            } else if ((<any>document).selection && (<any>document).selection.empty) {
                (<any>document).selection.empty();
            }
        }
    } catch {
    } finally {
        document.body.removeChild(textDiv);
    }
    return copied;
}
