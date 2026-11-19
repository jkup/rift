
import {assertScriptSelectionCurrent as check,inspectScriptSelection} from './script-plan.mjs';
import {c} from './fault.mjs';export {inspectScriptSelection};
export async function assertScriptSelectionCurrent(t){c.trace.push('context');if(c.context)throw Error('context fault');return check(t);}
