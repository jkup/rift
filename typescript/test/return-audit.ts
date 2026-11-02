import { readFileSync } from "node:fs";
import { auditScriptReturns, parse } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { observe } from "../src/observation.js";
import type { Binding } from "../src/runtime.js";

// Internal test executable, never an observation protocol or executable AST API.
const source = readFileSync(process.argv[2], "utf8");
let outputs = 0;
const realm = new Realm((_line) => { outputs++; });
const binding: Binding = { value: { kind: "number", value: 17 }, mutable: true, initialized: true };
realm.global.bindings.set("auditSentinel", binding);
const size = realm.global.bindings.size;
const coverage = auditScriptReturns(source);
if (outputs !== 0 || realm.global.bindings.size !== size || realm.global.bindings.get("auditSentinel") !== binding || binding.value.kind !== "number" || binding.value.value !== 17) throw new Error("audit effects");
const publicResult = parse(source);
if (publicResult.rejection !== null && publicResult.rejection.kind === "syntax-error") {
    if (publicResult.rejection.ruleCode !== "return-outside-function" || coverage.kind !== "complete" || coverage.candidates.length === 0) throw new Error("invalid certification");
    if (publicResult.error?.loc.line !== coverage.candidates[0].loc.line || publicResult.error.loc.column !== coverage.candidates[0].loc.column) throw new Error("certification location");
}
if (publicResult.error !== null) {
    for (const mode of ["parser-observation", "body-observation"] as const) {
        const observed = observe(source, realm, mode, "test/return-certification.js", { steps: 0, calls: 0 });
        if (observed.bodyEvaluated || observed.diagnostic?.message !== publicResult.error.message || observed.location?.line !== publicResult.error.loc.line || observed.location.column !== publicResult.error.loc.column || observed.observation.kind !== publicResult.rejection?.kind) throw new Error("certification observation");
        if (outputs !== 0 || realm.global.bindings.size !== size || realm.global.bindings.get("auditSentinel") !== binding || binding.value.kind !== "number" || binding.value.value !== 17) throw new Error("observation effects");
    }
}
if (coverage.kind === "complete") {
    if (coverage.sourceUnits !== source.length || coverage.consumedUnits !== source.length) throw new Error("audit EOF");
    console.log("complete " + coverage.sourceUnits + " " + coverage.consumedUnits + " " + coverage.candidates.length);
    let previous = -1;
    for (const candidate of coverage.candidates) {
        if (candidate.ruleCode !== "return-outside-function" || candidate.start <= previous || source.slice(candidate.start, candidate.end) !== "return") throw new Error("audit candidate");
        previous = candidate.start;
        console.log(candidate.start + " " + candidate.end + " " + candidate.loc.line + " " + candidate.loc.column);
    }
} else {
    const r = coverage.rejection;
    if (r.kind === "resource-limit") console.log("blocked " + r.guardCode + " " + r.count + " " + r.limit);
    else console.log("blocked " + r.capabilityCode);
    console.log(coverage.loc.line + " " + coverage.loc.column);
}
