import {inspectScriptSelection as inspect} from "file:///C:/Users/jonku/code/rift/typescript/docs/validation/ts-035e2c/validation-uQ9FOd/replay/tools/test262/script-plan.mjs";
export {assertScriptSelectionCurrent} from "file:///C:/Users/jonku/code/rift/typescript/docs/validation/ts-035e2c/validation-uQ9FOd/replay/tools/test262/script-plan.mjs";
import {control as c} from './control.mjs';
export function inspectScriptSelection(t){const actual=inspect(t);return structuredClone(c.owner.values.get(t)??actual);}
