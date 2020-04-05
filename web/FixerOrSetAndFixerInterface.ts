import Fixer from "./Fixer";
import FixerOrSetInterface from "./FixerOrSetInterface";

/**
 * Represents the data sent with the fixerset-clicked event.
 */
interface FixerOrSetAndFixerInterface {
    readonly fixerOrSet: FixerOrSetInterface;
    readonly highlightFixer?: Fixer|null;
}

export default FixerOrSetAndFixerInterface;
