import type { Guard, RuntimeCapability, SyntaxCapability } from "./outcomes.js";

// Data only. Sites identify parent-registered source occurrences and Realms;
// they never carry guest objects, ASTs, or authority to execute a Script.
export type ScriptSite = { unitId: string; realmId: string; location: { line: number; column: number } };
export type ScriptOperation = { stage: "harness" | "test"; phase: "parse" | "instantiation" | "body"; unitId: string; realmId: string };
export type ScriptOriginalThrow = { valueKind: "undefined" | "null" | "boolean" | "number" | "bigint" | "string" | "symbol" | "object"; origin: "guest" | "engine-diagnostic"; site: ScriptSite };
export type ScriptConstructor =
    | { outcome: "available"; name: string; realmId: string; secondary: null }
    | { outcome: "absent" | "non-callable" | "foreign-profile" | "unregistered-realm"; name: null; realmId: null; secondary: null }
    | { outcome: "non-string-name"; name: null; realmId: string; secondary: null }
    | { outcome: "abrupt"; name: null; realmId: null; secondary: ScriptOriginalThrow };
export type ScriptResult =
    | { kind: "normal" }
    | { kind: "throw"; phase: "runtime"; original: ScriptOriginalThrow; constructor: ScriptConstructor; diagnostic?: string }
    | { kind: "syntax-error"; phase: "parse"; constructorName: "SyntaxError"; ruleCode: "strict-legacy-number" | "strict-reserved-identifier" | "async-function-statement" | "return-outside-function" | "duplicate-block-lexical-function" | "duplicate-strict-parameter" | "assignment-target" | "lexical-declaration-statement" | "numeric-separator" | "regexp-literal" | "private-name"; diagnostic?: string }
    | { kind: "unsupported-syntax"; capabilityCode: SyntaxCapability | "script.uncertified-conflict"; diagnostic?: string }
    | { kind: "unsupported-operation"; phase: "runtime"; capabilityCode: RuntimeCapability; diagnostic?: string }
    | { kind: "unsupported-profile"; reasonCode: "strict" | "realm"; diagnostic?: string }
    | { kind: "resource-limit"; guardCode: Guard; count: number; limit: number; diagnostic?: string };
export type ChildV2 = {
    driverVersion: 2; nonce: string; requestSha256: string; mode: "script-observation" | "conformance";
    operation: ScriptOperation; source: ScriptSite | null; testBodyEvaluated: boolean;
    harnessValidated: boolean; preflightId: string | null; completedUnits: string[];
    inspection: { original: ScriptOriginalThrow; operation: ScriptOperation } | null;
    result: ScriptResult;
};
