// Compatibility facade: opaque records and existing host setup/inspection only.
export { prepareStrictScript } from "./script-execution-internal.js";
export type { ExecutableScript, ScriptGuestCallable, ScriptPreparation, ScriptNodeInspection,
    ScriptFunctionEnvironmentCompletion, ScriptBlockEnvironmentCompletion } from "./script-execution-internal.js";
