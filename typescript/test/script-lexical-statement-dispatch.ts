import { normal, type OperationContext, type ValueCompletion } from "../src/runtime.js";
import type { ScriptEvaluation } from "../src/script-execution.js";
import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import { parseBoundedScriptPreparation } from "../src/parser.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { observeScripts, type ObservationUnit } from "../src/script-observation.js";
import { scriptObservationJSONRecord } from "../src/script-observation-json.js";
import type { ChildV2 } from "../src/script-observation-types.js";
// Match the existing observation drivers' typed decimal argument boundary.
function decimal(text: string): number {
    if (text.length === 0) throw new Error("empty limit");
    for (let n = 0; n < text.length; n++) if (text.charCodeAt(n) < 48 || text.charCodeAt(n) > 57) throw new Error("nondecimal limit");
    const value = Number(text);
    if (!Number.isSafeInteger(value)) throw new Error("unsafe limit");
    return value;
}
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
const text = readFileSync(process.argv[2], "utf8");
const id = process.argv[3];
function observation(action: "parse-only" | "execute", role: "test" | "harness", source: string, nonce: string, sha: string): ChildV2 {
    const units: ObservationUnit[] = role === "test" ? [{ id: "u0", role: "test", text: source }] :
        [{ id: "u0", role: "harness", text: "0;" }, { id: "u1", role: "harness", text: source }, { id: "u2", role: "test", text: "7;" }];
    return observeScripts({ nonce, requestSha256: sha, action, preflightId: role === "test" ? null : "preflight", steps: 10000, calls: 64, units });
}
function seedJSON(completion: ValueCompletion | null) {
    if (completion === null) return null;
    if (completion.type !== "throw" || completion.value.kind !== "number") throw new Error("numeric seed completion required");
    return { type: "throw", origin: completion.origin, value: { kind: "number", value: completion.value.value }, diagnostic: completion.diagnostic };
}
function controls(): void {
    const sources = [readFileSync(process.argv[2], "utf8"), readFileSync(process.argv[5], "utf8"), "var touched=0; function touch(){touched+=1; print(9); return 1;} while(false) let x=touch();"];
    let checks = 0;
    const histories: string[] = [];
    for (const reverse of [false, true]) for (let index = 0; index < 3; index++) {
        const source = sources[reverse ? 2 - index : index];
        for (const seeded of [false, true]) for (const realmLabel of ["A", "B"]) for (const prefixLength of [0, 1, 2]) {
            let prints = 0;
            const realm = new Realm((_line: string) => { prints++; }, "script");
            const session = createScriptSession({ maxSteps: 10000, maxCalls: 64 });
            const seed = prepareBoundedScript({ id: "history", text: "let sentinel = 41; throw 3;" }, realm);
            if (seed.kind !== "ready") throw new Error("history setup");
            let savedSeed: ScriptEvaluation | null = null;
            if (seeded) {
                const result = evaluateScript(session, seed.record);
                savedSeed = result;
                check(result.phase === "body" && result.completion.type === "throw" && result.completion.value.kind === "number" && result.completion.value.value === 3, "seed completion");
            }
            for (let i = 0; i < prefixLength; i++) {
                const prefix = prepareBoundedScript({id: "u" + i, text: i === 0 ? "0;" : "1;"}, realm);
                if (prefix.kind !== "ready") throw new Error("prefix preparation");
                check(evaluateScript(session, prefix.record).completion.type === "normal", "prefix completion");
            }
            let guestCalls = 0;
            const context: OperationContext = {realm,
                call: (_callee, _receiver, _args, _loc): ValueCompletion => { guestCalls++; return normal(); },
                tick: (_loc): ValueCompletion => { throw new Error("binding tick"); }};
            const bindingBefore = seeded ? realm.globalEnvironment.getBindingValue("sentinel", context, {line:1,column:1}) : null;
            const seedCompletion = savedSeed === null ? null : savedSeed.completion;
            const seedValue = seedCompletion === null ? null : seedCompletion.value;
            const before = session.inspect(), keys = realm.globalObject.ownPropertyKeys();
            const descriptors = keys.map(key => realm.globalObject.getOwnProperty(key));
            const lexical = realm.globalEnvironment.hasLexicalDeclaration("sentinel");
            const unit = { id: "same", text: source };
            const rejected = prepareBoundedScript(unit, realm);
            check(rejected.kind === "blocked" && rejected.rejection.kind === "syntax-error" && rejected.rejection.ruleCode === "lexical-declaration-statement", "runtime lexical Statement rejection");
            if (rejected.kind !== "blocked") throw new Error("blocked required");
            check(rejected.unit.id === unit.id && rejected.unit.text === source, "rejection source");
            unit.text = "throw 19;"; unit.id = "changed";
            check(rejected.unit.id === "same" && rejected.unit.text === source, "rejection copied unit");
            const after = session.inspect();
            check(before.active === null && after.active === null && guestCalls === 0, "no active execution or guest call");
            if (seeded) {
                const bindingAfter = realm.globalEnvironment.getBindingValue("sentinel", context, {line:1,column:1});
                check(bindingBefore !== null && bindingBefore.type === "normal" && bindingAfter.type === "normal" && bindingBefore.value === bindingAfter.value && bindingAfter.value.kind === "number" && bindingAfter.value.value === 41, "lexical binding value identity");
                check(savedSeed !== null && savedSeed.completion === seedCompletion && savedSeed.completion.value === seedValue, "saved seed completion/value identities");
                if (prefixLength === 0) check(before.lastAbrupt !== null && before.lastAbrupt.record === seed.record && before.lastAbrupt.realm === realm && before.lastAbrupt.unitId === "history" && before.lastAbrupt.loc.line === 1 && before.lastAbrupt.loc.column === 20, "seed record and location");
            }
            if (!seeded || prefixLength > 0) check(before.lastAbrupt === null, "empty history after successful prefix or without seed");
            check(before !== after, "fresh inspection snapshots");
            if (before.lastAbrupt !== null && after.lastAbrupt !== null) check(before.lastAbrupt.loc !== after.lastAbrupt.loc, "copied history locations");
            histories.push(JSON.stringify({id: source === sources[0] ? "R0" : source === sources[1] ? "R1" : "effects", realmId: realmLabel, seeded, prefixCount: prefixLength,
                before: {steps:before.steps,calls:before.calls,depth:before.depth,active:null,lastAbrupt:before.lastAbrupt===null?null:{recordIdentity:"seed.record",realmIdentity:realmLabel,unitId:before.lastAbrupt.unitId,loc:before.lastAbrupt.loc}},
                after: {steps:after.steps,calls:after.calls,depth:after.depth,active:null,lastAbrupt:after.lastAbrupt===null?null:{recordIdentity:"seed.record",realmIdentity:realmLabel,unitId:after.lastAbrupt.unitId,loc:after.lastAbrupt.loc}},savedCompletion:seedJSON(seedCompletion)}));
            check(before.steps === after.steps && before.calls === after.calls && before.depth === after.depth && before.active === after.active, "all budgets unchanged");
            if (before.lastAbrupt === null) check(after.lastAbrupt === null, "empty history");
            else {
                const a = after.lastAbrupt;
                check(a !== null && a.record === before.lastAbrupt.record && a.realm === realm && a.unitId === before.lastAbrupt.unitId && a.loc.line === before.lastAbrupt.loc.line && a.loc.column === before.lastAbrupt.loc.column, "history identity and location");
            }
            check(prints === 0 && realm.globalEnvironment.hasLexicalDeclaration("sentinel") === lexical, "print and lexical state");
            check(!realm.globalEnvironment.hasLexicalDeclaration("alpha") && !realm.globalEnvironment.hasLexicalDeclaration("beta"), "no new lexical binding");
            const afterKeys = realm.globalObject.ownPropertyKeys();
            check(afterKeys.length === keys.length, "global key count");
            for (let k = 0; k < keys.length; k++) {
                check(keys[k] === afterKeys[k], "global key identity");
                const prior = descriptors[k], now = realm.globalObject.getOwnProperty(keys[k]);
                if (prior === undefined || now === undefined) throw new Error("descriptor disappeared");
                check(prior.kind === now.kind && prior.enumerable === now.enumerable && prior.configurable === now.configurable, "descriptor flags");
                if (prior.kind === "data" && now.kind === "data") check(prior.value === now.value && prior.writable === now.writable, "descriptor value identity");
                if (prior.kind === "accessor" && now.kind === "accessor") check(prior.get === now.get && prior.set === now.set, "accessor identity");
            }
            for (const action of ["parse-only", "execute"] as const) for (const role of ["test", "harness"] as const) for (const count of [0, 1, 2]) {
                // Repeated source/path text has distinct occurrence ids; failure never joins the prefix.
                const units: ObservationUnit[] = [];
                for (let i = 0; i < count; i++) units.push({ id: "u" + i, role: "harness", text: i === 0 ? "0;" : "1;" });
                units.push({ id: "u" + count, role, text: source });
                if (role === "harness") units.push({ id: "u" + (count + 1), role: "test", text: "throw 19;" });
                const result = observeScripts({ nonce: realmLabel, requestSha256: "a".repeat(64), action, preflightId: "preflight", steps: 10000, calls: 64, units });
                check(result.result.kind === "syntax-error" && result.result.ruleCode === "lexical-declaration-statement" && !result.testBodyEvaluated && result.inspection === null, "prefix rejection");
                check(result.completedUnits.length === count && result.operation.unitId === "u" + count && result.operation.stage === role && result.operation.phase === "parse", "prefix occurrence and phase");
                for (let i = 0; i < count; i++) check(result.completedUnits[i] === "u" + i, "completed occurrence");
                checks++;
            }
        }
    }
    for (const source of [sources[0], "x".repeat(100001), "@"] ) {
        const result = prepareBoundedScript({ id: "profile", text: source }, new Realm((_line: string) => {}, "legacy"));
        check(result.kind === "profile-rejected" && result.reason === "realm", "profile first");
    }
    const sameTexts = ['if(false) let x=7;', 'if(false) let x=7; class C{}', 'let x; x=7; x;'];
    for (const reverse of [false, true]) for (let i = 0; i < 3; i++) {
        const index = reverse ? 2 - i : i, realm = new Realm((_line: string) => { throw new Error("ready print"); }, "script");
        const unit = { id: "same", text: sameTexts[index] }, result = prepareBoundedScript(unit, realm);
        if (index === 0) check(result.kind === "blocked" && result.rejection.kind === "syntax-error" && result.rejection.ruleCode === "lexical-declaration-statement", "same id lexical");
        if (index === 1) check(result.kind === "blocked" && result.rejection.kind === "unsupported-syntax" && result.rejection.capabilityCode === "parse.declaration-statement", "same id late veto");
        if (index === 2) {
            if (result.kind !== "ready") throw new Error("ready control");
            unit.text = "throw 19;"; unit.id = "changed";
            check(result.record.belongsTo(realm) && result.record.inspect().unit.text === sameTexts[index] && result.record.inspect().unit.id === "same", "ready source identity");
            const run = evaluateScript(createScriptSession({ maxSteps: 10000, maxCalls: 64 }), result.record);
            check(run.phase === "body" && run.completion.type === "normal" && run.completion.value.kind === "number" && run.completion.value.value === 7, "ready completion 7");
        }
    }
    for (const action of ["parse-only", "execute"] as const) {
        const result = observation(action, "test", "7;", "ready", "a".repeat(64));
        check(result.result.kind === "normal" && result.testBodyEvaluated === (action === "execute"), "ready action");
    }
    console.log(JSON.stringify({ checks, runtimeInputs: 2, effectSources: 3, orders: 2, seededHistories: 2, realms: 2, profiles: 3, sameId: 6, ready: 2, histories }));
}

if (process.argv[4] === "controls") {
    controls();
} else if (process.argv[4] === "prepare") {
    const realm = new Realm((_line: string) => { throw new Error("preparation effect"); }, process.argv[5] === "legacy" ? "legacy" : "script");
    const unit = { id, text }, prepared = prepareBoundedScript(unit, realm);
    unit.id = "changed"; unit.text = "throw 19;";
    if (prepared.kind === "ready") {
        check(prepared.record.inspect().unit.id === id && prepared.record.inspect().unit.text === text, "copied ready unit");
        console.log(JSON.stringify(parseBoundedScriptPreparation({id, text}, {source:{text:""},body:[],scopes:new Map(),declarations:new Map(),assignmentNameEligible:new Map()})));
    } else {
        if (prepared.kind === "blocked") check(prepared.unit.id === id && prepared.unit.text === text, "copied rejected unit");
        console.log(JSON.stringify(prepared));
    }
} else {
    // Explicit argv fields avoid parsing untyped JSON in the static host driver.
    const action = process.argv[5] === "execute" ? "execute" : "parse-only";
    const preflightId = process.argv[7] === "null" ? null : process.argv[7];
    const units: ObservationUnit[] = [];
    for (let i = 13; i < process.argv.length; i += 3) units.push({id: process.argv[i], role: process.argv[i+1] === "harness" ? "harness" : "test", text: readFileSync(process.argv[i+2], "utf8")});
    if (process.argv[4] === "invalid") {
        let rejected = false;
        try { observeScripts({nonce:id,requestSha256:process.argv[6],action,preflightId,steps:decimal(process.argv[8]),calls:decimal(process.argv[9]),units}); }
        catch (error) { if (error instanceof Error && error.message === "invalid Script occurrence order") rejected = true; else throw error; }
        check(rejected,"malformed occurrence rejected");
        console.log("invalid occurrence rejected");
    } else {
    const child = observeScripts({nonce: id, requestSha256: process.argv[6], action, preflightId, steps: decimal(process.argv[8]), calls: decimal(process.argv[9]), units});
    // Return execute/harness and conformance are explicitly synthetic wire controls.
    if (process.argv[12] === "return-outside-function" && (action === "execute" || child.operation.stage === "harness")) child.result = {kind: "syntax-error", phase: "parse", constructorName: "SyntaxError", ruleCode: "return-outside-function"};
    if (process.argv[10] === "conformance") child.mode = "conformance";
    if (process.argv[11] === "diagnostic" && child.result.kind === "syntax-error") child.result.diagnostic = 'TypeError: diagnostic only ' + id + '\0"\\\ud800';
    console.log(scriptObservationJSONRecord(child));
    }
}

