import { Realm } from "./realm.js";
import { prepareBoundedScript, type ExecutableScript, type ScriptPreparation } from "./script-record.js";
import { createScriptSession, type ScriptSourceSnapshot, type ScriptSession } from "./script-execution.js";
import { evaluateScriptObserved, type ObservedScriptEvaluation } from "./script-throw-inspection.js";
import { parse } from "./parser.js";
import { GuestObject, normal, sameValue, UNDEFINED, type Value, type ValueCompletion, type Builtin, type ThrowCompletion } from "./runtime.js";
import { GuestArray } from "./array-object.js";
import { wellKnownSpecies } from "./symbols.js";
import { mapObjectDefaultArray } from "./array-map.js";
import type { ChildV2, ScriptConstructor, ScriptOperation, ScriptOriginalThrow, ScriptResult, ScriptSite } from "./script-observation-types.js";

export type ObservationUnit = { id: string; role: "harness" | "test"; text: string };
export type ScriptObservationRequest = {
    nonce: string; requestSha256: string; action: "parse-only" | "execute";
    preflightId: string | null; steps: number; calls: number; units: ObservationUnit[];
};
export type ScriptControlReport = { version: 1; nonce: string; control: string; input: string; passed: boolean; observed: number[]; effects: string };
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function object(value: Value): GuestObject { if (value.kind !== "object") throw new Error("object required"); return value.object; }
function own(target: GuestObject, key: string): Value {
    const d = target.getOwnProperty(key);
    if (d === undefined || d.kind !== "data") throw new Error("own data required");
    return d.value;
}
function obj(value: GuestObject): Value { return { kind: "object", object: value }; }

// Only this attempt creates and registers production Realms and records. Source
// IDs alone cannot authorize a snapshot: projection checks real record identity.
class Attempt {
    private realm = new Realm((_line: string) => { throw new Error("unexpected Script output"); }, "script");
    private other: Realm | null = null;
    private records = new Map<ExecutableScript, string>();
    private realms = new Map<Realm, string>();
    private completed: string[] = [];
    private control = "none";
    private input = "alpha";
    private values: number[] = [];
    private effects = "";
    private target: GuestObject | null = null;
    private sentinel = new GuestObject();
    private secondary: ThrowCompletion | null = null;
    private session: ScriptSession | null = null;
    private readyPrinted = false;
    private verified = false;
    constructor(private request: ScriptObservationRequest) { this.realms.set(this.realm, "test"); }
    private realmFor(unit: ObservationUnit): Realm {
        return this.control.startsWith("guest-other") && unit.id === "u" + (this.request.units.length - 2) && this.other !== null ? this.other : this.realm;
    }
    private realmId(realm: Realm): string { const id = this.realms.get(realm); if (id === undefined) throw new Error("unregistered entry Realm"); return id; }
    private site(snapshot: ScriptSourceSnapshot): ScriptSite {
        const unitId = this.records.get(snapshot.record);
        const realmId = this.realms.get(snapshot.realm);
        if (unitId === undefined || unitId !== snapshot.unitId || realmId === undefined)
            throw new Error("unregistered Script source");
        return { unitId, realmId, location: { line: snapshot.loc.line, column: snapshot.loc.column } };
    }
    private original(completion: ThrowCompletion, source: ScriptSourceSnapshot): ScriptOriginalThrow {
        const origin = completion.origin.kind;
        if (origin !== "guest" && origin !== "engine-diagnostic") throw new Error("not an ordinary throw");
        return { valueKind: completion.value.kind, origin, site: this.site(source) };
    }
    private result(completion: ThrowCompletion): ScriptResult {
        const origin = completion.origin;
        if (origin.kind === "resource-limit") return { kind: "resource-limit", guardCode: origin.guardCode, count: origin.count, limit: origin.limit };
        if (origin.kind === "unsupported-operation") return { kind: "unsupported-operation", phase: "runtime", capabilityCode: origin.capabilityCode };
        throw new Error("ordinary throw requires constructor projection");
    }
    private envelope(operation: ScriptOperation, source: ScriptSite | null, result: ScriptResult): ChildV2 {
        return { driverVersion: 2, nonce: this.request.nonce, requestSha256: this.request.requestSha256,
            mode: "script-observation", operation, source,
            testBodyEvaluated: operation.stage === "test" && operation.phase === "body",
            harnessValidated: this.request.preflightId !== null, preflightId: this.request.preflightId,
            completedUnits: this.completed.slice(), inspection: null, result };
    }
    private observed(unit: ObservationUnit, observed: ObservedScriptEvaluation): ChildV2 {
        const evaluation = observed.evaluation;
        const operation: ScriptOperation = { stage: unit.role, phase: evaluation.phase, unitId: unit.id, realmId: this.realmId(this.realmFor(unit)) };
        const completion = evaluation.completion;
        if (completion.type === "normal") {
            if (unit.role === "harness") this.completed.push(unit.id);
            return this.envelope(operation, null, { kind: "normal" });
        }
        if (observed.source === null) throw new Error("missing original source");
        const source = this.site(observed.source);
        if (completion.origin.kind === "resource-limit" || completion.origin.kind === "unsupported-operation")
            return this.envelope(operation, source, this.result(completion));
        const original = this.original(completion, observed.source);
        const inspection = observed.inspection;
        if (inspection === null) throw new Error("missing throw inspection");
        const kind = inspection.kind;
        if (kind === "resource-limit" || kind === "unsupported-operation") {
            const answer = this.envelope(operation, this.site(inspection.source), this.result(inspection.completion));
            answer.inspection = { original, operation };
            return answer;
        }
        let constructor: ScriptConstructor;
        if (kind === "available" || kind === "non-string-name") {
            const realmId = this.realms.get(inspection.realm);
            if (realmId === undefined) constructor = { outcome: "unregistered-realm", name: null, realmId: null, secondary: null };
            else if (kind === "available") constructor = { outcome: "available", name: inspection.name, realmId, secondary: null };
            else constructor = { outcome: "non-string-name", name: null, realmId, secondary: null };
        } else if (kind === "abrupt") {
            constructor = { outcome: "abrupt", name: null, realmId: null, secondary: this.original(inspection.completion, inspection.source) };
        } else constructor = { outcome: kind, name: null, realmId: null, secondary: null };
        return this.envelope(operation, source, { kind: "throw", phase: "runtime", original, constructor });
    }
    private rejected(unit: ObservationUnit, prepared: Exclude<ScriptPreparation, { kind: "ready" }>): ChildV2 {
        const operation: ScriptOperation = { stage: unit.role, phase: "parse", unitId: unit.id, realmId: this.realmId(this.realmFor(unit)) };
        const location = prepared.kind === "profile-rejected" ? { line: 1, column: 1 } : prepared.diagnostic.loc;
        const site: ScriptSite = { unitId: unit.id, realmId: operation.realmId, location };
        if (prepared.kind === "profile-rejected") return this.envelope(operation, site, { kind: "unsupported-profile", reasonCode: prepared.reason });
        if (prepared.kind === "conflict") return this.envelope(operation, site, { kind: "unsupported-syntax", capabilityCode: "script.uncertified-conflict" });
        const rejection = prepared.rejection;
        // The legacy source-only return audit is the sole certified rule. Its
        // success cannot replace the actual bounded Script preparation result.
        if (this.request.action === "parse-only" && unit.role === "test") {
            const audit = parse(unit.text);
            if (audit.rejection !== null && audit.rejection.kind === "syntax-error" && audit.rejection.ruleCode === "return-outside-function" && audit.error !== null)
                return this.envelope(operation, { unitId: unit.id, realmId: "test", location: audit.error.loc },
                    { kind: "syntax-error", phase: "parse", constructorName: "SyntaxError", ruleCode: "return-outside-function" });
        }
        if (rejection.kind === "syntax-error") throw new Error("unreviewed Script rule");
        return this.envelope(operation, site, rejection);
    }
    run(): ChildV2 {
        const session = createScriptSession({ maxSteps: this.request.steps, maxCalls: this.request.calls });
        this.session = session;
        let steps = 0;
        for (const unit of this.request.units) {
            const prepared = prepareBoundedScript({ id: unit.id, text: unit.text }, this.realmFor(unit));
            if (prepared.kind !== "ready") return this.rejected(unit, prepared);
            this.records.set(prepared.record, unit.id);
            if (unit.role === "test" && this.request.action === "parse-only")
                return this.envelope({ stage: "test", phase: "parse", unitId: unit.id, realmId: "test" }, null, { kind: "normal" });
            let observed: ObservedScriptEvaluation;
            try { observed = evaluateScriptObserved(session, prepared.record); }
            finally {
                const state = session.inspect();
                check(state.active === null && state.calls === 0 && state.depth === 0 && state.steps >= steps, "Script cleanup/budget");
                steps = state.steps;
            }
            if (observed.source !== null) {
                const history = session.inspect().lastAbrupt;
                check(history !== null && history.record === observed.source.record && history.realm === observed.source.realm && history.unitId === observed.source.unitId &&
                    history.loc.line === observed.source.loc.line && history.loc.column === observed.source.loc.column, "original history retained");
            }
            if (this.control.startsWith("guest-") && unit.id === "u" + (this.request.units.length - 2) && observed.evaluation.completion.type === "normal") {
                const getter = own(this.realmFor(unit).globalObject, "getter");
                if (this.target === null) throw new Error("missing control target");
                if (this.control.endsWith("name")) object(own(this.realm.globalObject, "ctor")).bootstrapDefine("name", { get: getter, configurable: true });
                else this.target.bootstrapDefine("constructor", { get: getter, configurable: true });
            }
            const harnessControl = this.control.startsWith("B") || this.control.startsWith("N") || this.control === "I01";
            if (harnessControl ? unit.id === "u" + (this.request.units.length - 2) : unit.role === "test") this.verifyControl(observed);
            const answer = this.observed(unit, observed);
            if (answer.result.kind !== "normal" || unit.role === "test") return answer;
        }
        throw new Error("missing test unit");
    }
    // Registered controls have fixed setup here, never a caller callback, Realm
    // map, context or AST. Only the separate control executable exposes them.
    controlSetup(control: string, input: string): void {
        check(input === "alpha" || input === "beta", "control input");
        const allowed = ["S01", "S02", "loop", "X03", "null", "noncallable", "nonstring", "empty", "registered-other", "foreign", "unregistered", "I01", "message-identity", "guest-constructor", "guest-name", "guest-other", "guest-other-name",
            "constructor-throw", "name-throw", "constructor-resource", "name-resource", "constructor-calls", "name-calls", "constructor-host", "name-host", "constructor-unsupported", "name-unsupported", "U01",
            "B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B09", "B10", "B11", "B12", "B13", "B14", "B15", "B16", "N01", "N02"];
        check(allowed.includes(control), "unknown registered control");
        this.control = control; this.input = input;
        const r = this.realm;
        if (control === "S02") r.defineScriptGlobal("reserved", { value: UNDEFINED, writable: false, configurable: false });
        if (control === "S01" || control === "loop") {
            const callback: Builtin = (_receiver, args, context, _loc) => {
                const active = this.session?.inspect().active;
                check(active !== null && active !== undefined && active.realm === r && active.phase === "body" && this.records.get(active.record) === this.request.units[this.request.units.length - 1].id && context.realm === r, "guarded test entry");
                if (control === "loop") { if (!this.readyPrinted) { this.readyPrinted = true; console.log("SCRIPT_LOOP_ENTERED"); } }
                else { check(args.length === 1 && args[0].kind === "number", "numeric observation"); if (args[0].kind === "number") this.values.push(args[0].value); }
                return normal();
            };
            r.defineScriptGlobal(control === "loop" ? "entered" : "observe", { value: obj(r.createBuiltin("observe", 1, callback)), writable: true, configurable: true });
        }
        let owner = r;
        if (control === "B09" || control === "registered-other" || control === "unregistered" || control.startsWith("guest-other")) {
            owner = new Realm((_line: string) => { throw new Error("control output"); }, "script");
            if (control !== "unregistered") this.realms.set(owner, "other");
            this.other = owner;
            if (control === "B09") r.defineScriptGlobal("Other", { value: own(owner.globalObject, "ReferenceError"), writable: true, configurable: true });
        }
        if (control === "foreign") owner = new Realm((_line: string) => { throw new Error("control output"); });
        if (control === "U01") r.defineScriptGlobal("unsupported", { value: obj(r.createBuiltin("unsupported", 0, (_v, _a, c, l) => this.mapFailure(c, l))), configurable: true });
        if (control === "X03" || ["null", "noncallable", "nonstring", "empty", "registered-other", "foreign", "unregistered"].includes(control) || control.startsWith("constructor-") || control.startsWith("name-") || control.startsWith("guest-")) {
            const target = new GuestObject(), ctor = owner.createBuiltin("ctor", 0, (_r, _a, _c, _l) => normal());
            this.target = target;
            if (control.startsWith("guest-")) {
                r.defineScriptGlobal("ctor", { value: obj(ctor), configurable: true });
                owner.defineScriptGlobal("sentinel", { value: obj(this.sentinel), configurable: true });
            }
            const cget: Builtin = (receiver, _args, context, loc) => {
                check(sameValue(receiver, obj(target)), "constructor receiver"); this.effects += "C";
                if (control.startsWith("constructor-")) return this.fault(control, context, loc);
                if (control === "null") return normal({ kind: "null" });
                if (control === "noncallable") return normal({ kind: "number", value: 7 });
                return normal(obj(ctor));
            };
            const nget: Builtin = (receiver, _args, context, loc) => {
                check(sameValue(receiver, obj(ctor)), "name receiver"); this.effects += "N";
                if (control.startsWith("name-")) return this.fault(control, context, loc);
                return normal(control === "nonstring" ? { kind: "number", value: 7 } : { kind: "string", value: control === "empty" ? "" : "ReferenceError" });
            };
            target.bootstrapDefine("constructor", { get: obj(r.createBuiltin("constructor", 0, cget)), configurable: true });
            ctor.bootstrapDefine("name", { get: obj(r.createBuiltin("name", 0, nget)), configurable: true });
            r.defineScriptGlobal("target", { value: obj(target), writable: true, configurable: true });
        }
    }
    private mapFailure(context: Parameters<Builtin>[2], loc: Parameters<Builtin>[3]): ValueCompletion {
        const array = new GuestArray(this.realm.arrayPrototype), constructor = new GuestObject();
        constructor.bootstrapDefine(wellKnownSpecies, { value: own(this.realm.globalObject, "Object") });
        array.bootstrapDefine("constructor", { value: obj(constructor) });
        const callback = this.realm.createBuiltin("callback", 3, (_r, _a, _c, _l) => normal());
        return mapObjectDefaultArray(array, obj(callback), UNDEFINED, context, loc);
    }
    private fault(control: string, context: Parameters<Builtin>[2], loc: Parameters<Builtin>[3]): ValueCompletion {
        if (control.endsWith("-host")) throw new Error("registered host fault");
        if (control.endsWith("-calls")) {
            const recur = this.realm.createBuiltin("recur", 0, (_r, _a, c, l) => this.fault(control, c, l));
            return context.call(obj(recur), UNDEFINED, [], loc);
        }
        if (control.endsWith("-resource")) {
            while (true) { const tick = context.tick(loc); if (tick.type === "throw") return tick; }
        }
        if (control.endsWith("-unsupported")) return this.mapFailure(context, loc);
        const secondary: ThrowCompletion = { type: "throw", value: obj(this.sentinel), origin: { kind: "guest" }, diagnostic: { phase: "runtime", name: "irrelevant", message: "secondary", loc } };
        this.secondary = secondary; return secondary;
    }
    private verifyControl(observed: ObservedScriptEvaluation): void {
        const c = observed.evaluation.completion;
        if (this.target !== null && c.type === "throw" && c.origin.kind === "guest") check(c.value.kind === "object" && c.value.object === this.target, "original thrown identity");
        // A control oracle cannot replace a resource/unsupported completion
        // with its own failed expectation. Preserve the outcome and leave the
        // report unverified; the parent rejects preflight without minting an ID.
        if (c.type === "throw" && (c.origin.kind === "resource-limit" || c.origin.kind === "unsupported-operation")) return;
        const inspected = observed.inspection;
        if (inspected !== null && (inspected.kind === "resource-limit" || inspected.kind === "unsupported-operation")) return;
        if (this.secondary !== null) {
            const i = observed.inspection;
            check(i !== null && i.kind === "abrupt" && i.completion === this.secondary && i.completion.value.kind === "object" && i.completion.value.object === this.sentinel, "secondary completion identity");
        }
        if (this.control === "S01" && !(c.type === "normal" && this.values.length === 1 && this.values[0] === (this.input === "alpha" ? 1 : 2))) return;
        if (this.control === "I01") {
            const value = this.input === "alpha" ? 7 : 11;
            if (!(c.type === "throw" && c.origin.kind === "guest" && c.value.kind === "number" && c.value.value === value)) return;
            this.values.push(value);
        }
        if (this.control.startsWith("guest-")) {
            const inspection = observed.inspection;
            check(inspection !== null && inspection.kind === "abrupt" && inspection.completion.value.kind === "object" && inspection.completion.value.object === this.sentinel, "actual guest secondary identity");
            const owner = this.control.startsWith("guest-other") && this.other !== null ? this.other : this.realm;
            const seen = own(owner.globalObject, "seen");
            check(seen.kind === "number" && seen.value === 1, "guest Get exactly once");
        }
        if (this.control === "message-identity") {
            check(c.type === "throw" && c.origin.kind === "guest", "message throw");
            if (c.type !== "throw") throw new Error("missing message throw");
            check(sameValue(own(object(c.value), "message"), own(this.realm.globalObject, "message")), "exact message Value identity");
        }
        if ((this.control === "B01" || this.control === "B05" || this.control === "B11" || this.control === "N01") && c.type !== "normal") return;
        const messages: { id: string; message: string }[] = [
            { id: "B02", message: "control" }, { id: "B03", message: "Expected true but got false" },
            { id: "B04", message: "Expected SameValue(«0», «-0») to be true" },
            { id: "B06", message: "Expected a ReferenceError to be thrown but no exception was thrown at all" },
            { id: "B07", message: "Thrown value was not an object!" }, { id: "B08", message: "Expected a ReferenceError but got a TypeError" },
            { id: "B09", message: "Expected a ReferenceError but got a different error constructor with the same name" },
            { id: "B10", message: "assert.throws requires two arguments: the error constructor and a function to run" },
            { id: "B12", message: "control" }, { id: "B13", message: "control (_isSameValue operation threw) 7" },
            { id: "B15", message: "Expected SameValue(«[object Object]», «0») to be true" }, { id: "N02", message: "Expected SameValue(«1», «1») to be false" }
        ];
        const expected = messages.find(row => row.id === this.control);
        if (expected !== undefined || this.control === "B14") {
            if (c.type !== "throw" || c.origin.kind !== "guest" || c.value.kind !== "object") return;
            const thrown = object(c.value), ctor = own(this.realm.globalObject, "Test262Error"), prototype = thrown.getPrototypeOf();
            if (!(prototype !== null && prototype === object(own(object(ctor), "prototype")) && sameValue(own(prototype, "constructor"), ctor))) return;
            const message = own(thrown, "message");
            if (expected !== undefined) { if (!(message.kind === "string" && message.value === expected.message)) return; }
            else if (message.kind !== "object") return;
        }
        if (this.control === "B16" && !(c.type === "throw" && c.origin.kind === "guest" && c.value.kind === "number" && c.value.value === 7)) return;
        this.verified = true;
    }
    report(): ScriptControlReport { return { version: 1, nonce: this.request.nonce, control: this.control, input: this.input, passed: this.verified, observed: this.values.slice(), effects: this.effects }; }
}

export function observeScripts(request: ScriptObservationRequest): ChildV2 {
    if (!Number.isSafeInteger(request.steps) || request.steps < 0 || !Number.isSafeInteger(request.calls) || request.calls < 0 || request.units.length === 0)
        throw new Error("invalid Script request");
    for (let n = 0; n < request.units.length; n++) {
        const unit = request.units[n];
        if (unit.id !== "u" + n || unit.role !== (n === request.units.length - 1 ? "test" : "harness")) throw new Error("invalid Script occurrence order");
    }
    return new Attempt(request).run();
}

export function observeScriptControl(request: ScriptObservationRequest, control: string, input: string): { child: ChildV2; report: ScriptControlReport } {
    const attempt = new Attempt(request);
    attempt.controlSetup(control, input);
    const child = attempt.run();
    return { child, report: attempt.report() };
}
