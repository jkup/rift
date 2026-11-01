// Reduced SC1090 from the initial exact-throw assertion. Not engine code.
import type { NumberCompletion } from "../../../src/conversion.js";
import type { ValueCompletion } from "../../../src/runtime.js";
function compare(left: NumberCompletion, right: ValueCompletion): boolean {
    return left === right;
}
console.log(compare({ type: "normal", value: 1 }, { type: "normal", value: { kind: "number", value: 1 } }));
