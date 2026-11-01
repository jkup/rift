import { parse } from "./parser.js";
import { Evaluator } from "./evaluator.js";
import { UNDEFINED, type Completion } from "./runtime.js";
import { Realm } from "./realm.js";
import type { Diagnostic } from "./syntax.js";
export type RunResult = { phase: "parse"; diagnostic: Diagnostic } | { phase: "runtime"; completion: Completion };
export function run(source: string, realm: Realm): RunResult {
    const parsed = parse(source);
    if (parsed.error !== null) return { phase: "parse", diagnostic: parsed.error };
    return { phase: "runtime", completion: new Evaluator().block(parsed.body, realm.global, UNDEFINED) };
}
