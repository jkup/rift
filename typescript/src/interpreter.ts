import type { Rejection } from "./outcomes.js";
import { parse } from "./parser.js";
import { Evaluator } from "./evaluator.js";
import { UNDEFINED, type Completion } from "./runtime.js";
import { Realm } from "./realm.js";
import type { Diagnostic } from "./syntax.js";
export type RunResult = { phase: "parse"; diagnostic: Diagnostic; rejection: Rejection } | { phase: "runtime"; completion: Completion };
export function run(source: string, realm: Realm): RunResult {
    const parsed = parse(source);
    if (parsed.error !== null) {
        if (parsed.rejection === null) throw new Error("missing parse rejection");
        return { phase: "parse", diagnostic: parsed.error, rejection: parsed.rejection };
    }
    return { phase: "runtime", completion: new Evaluator(realm).block(parsed.body, realm.global, UNDEFINED) };
}
