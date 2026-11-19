import { Realm, type Output } from "./realm.js";

/** Create the guest world used by the CLI and current Script execution API. */
export function createScriptRealm(output: Output, timeZone = "UTC"): Realm {
    return new Realm(output, "script", timeZone);
}

export { prepareBoundedScript, prepareStrictScript } from "./script-record.js";
export type { ExecutableScript, ScriptPreparation } from "./script-record.js";
export { createScriptSession, evaluateScript, drainScriptJobs } from "./script-execution.js";
export type {
    ScriptSession,
    ScriptLimits,
    ScriptEvaluation,
    ScriptJobDrain,
    ScriptJobFailure,
} from "./script-execution.js";
export type { ScriptSourceUnit } from "./script-metadata.js";
