const LS_EXISTS: boolean = typeof localStorage === 'object' && localStorage.getItem !== undefined && localStorage.setItem !== undefined && localStorage.removeItem !== undefined;
const LS_PREFIX: string = 'PCFCONF_';

export function remove(key: string): void {
    if (!LS_EXISTS) {
        return;
    }
    localStorage.removeItem(LS_PREFIX + key);
}

export function setString(key: string, value: string): void {
    if (!LS_EXISTS) {
        return;
    }
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
}

export function getString(key: string, defaultValue: string = '', allowedValues: string[] | undefined = undefined): string {
    if (!LS_EXISTS) {
        return defaultValue;
    }
    const json = localStorage.getItem(LS_PREFIX + key);
    if (json === null) {
        return defaultValue;
    }
    let value;
    try {
        value = JSON.parse(json);
    } catch {
        return defaultValue;
    }
    if (typeof value !== 'string') {
        return defaultValue;
    }
    if (allowedValues !== undefined && allowedValues.indexOf(value) < 0) {
        return defaultValue;
    }
    return value;
}

export function setBoolean(key: string, value: boolean): void {
    if (!LS_EXISTS) {
        return;
    }
    localStorage.setItem(LS_PREFIX + key, value ? 'y' : 'n');
}

export function getBoolean(key: string, defaultValue: boolean = false): boolean {
    if (!LS_EXISTS) {
        return defaultValue;
    }
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw === 'y') {
        return true;
    }
    if (raw === 'n') {
        return false;
    }
    return defaultValue;
}

export function setObject(key: string, value: object): void {
    if (!LS_EXISTS) {
        return;
    }
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
}

export function getObject(key: string, defaultValue: object | undefined = undefined): object | undefined {
    if (!LS_EXISTS) {
        return defaultValue;
    }
    const json = localStorage.getItem(LS_PREFIX + key);
    if (json === null) {
        return defaultValue;
    }
    let value;
    try {
        value = JSON.parse(json);
    } catch {
        return defaultValue;
    }
    if (typeof value !== 'object') {
        return defaultValue;
    }
    return value;
}
