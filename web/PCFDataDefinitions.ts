/**
 * Represents the whole data of a PHP-CS-Fixer version.
 */
export interface PCFData {
    /**
     * The PHP-CS-Fixer version
     */
    version: string,
    /**
     * The default string to be used to indent.
     * Allowed values are:
     * - 2 spaces
     * - 4 spaces
     * - TAB
     */
    indent: string,

    /**
     * The default line ending terminator.
     * Allowed values are:
     * - *nix/Mac line endings (\n)
     * - Windows line endings (\r\n)
     */
    lineEnding: string,
    /**
     * The list of available fixers.
     */
    fixers: { [name: string]: PFCFixer },
    /**
     * The list of available fixer sets.
     */
    sets: { [name: string]: { [fixerName: string]: object | null } },
}

/**
 * Represent a single fixer implemented by PHP-CS-Fixer.
 */
export interface PFCFixer {
    /**
     * The short fixer description.
     * Not empty if present.
     */
    summary?: string,
    /**
     * A longer fixer description.
     * Not empty if present.
     */
    description?: string,
    /**
     * Is this fixer risky?
     * Always true if present.
     */
    risky?: boolean,
    /**
     * A description why the fixer is risky.
     * Not empty if present.
     */
    riskyDescription?: string,
    /**
     * If this fixer is deprecated, list of the names of the fixers that should be used instead.
     * Not empty if present.
     */
    deprecated_switchTo?: string[],
    /**
     * The list of options accepted by this configurator.
     * Not empty if present.
     */
    configuration?: PFCFixerOption[],
    /**
     * A list of sample usages of this fixer.
     * Not empty if present.
     */
    codeSamples?: PFCFixerCodeSample[],
}

/**
 * Represent an option of a PHP-CS-Fixer fixer.
 */
export interface PFCFixerOption {
    /**
     * The option name.
     */
    name: string,
    /**
     * An alias of the option name.
     * Not empty if present.
     */
    alias?: string,
    /**
     * A description of this option.
     * Not empty if present.
     */
    description?: string,
    /**
     * The default option value if none is received.
     */
    defaultValue?: any,
    /**
     * The names of the PHP types allowed for the option value
     * Not empty if present.
     */
    allowedTypes?: string[],
    /**
     * A list of acceptable option values.
     * Not empty if present.
     */
    allowedValues?: any[],
}

/**
 * Represent a sample usage of a fixer.
 */
export interface PFCFixerCodeSample {
    /**
     * The input PHP code before applying the fixer.
     */
    from: string,
    /**
     * The output PHP code after applying the fixer.
     */
    to: string,
    /**
     * The fixer configuration used to convert the input to the output.
     * Not empty if present.
     */
    configuration?: { [optionName: string]: any },
}
