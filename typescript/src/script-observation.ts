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
    constructor(private request: ScriptObservationRequest, private mode: "script-observation" | "conformance" = "script-observation", private preflightControl: boolean = false) { this.realms.set(this.realm, "test"); }
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
            mode: this.mode, operation, source,
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
        if (rejection.kind === "syntax-error") {
            if (rejection.ruleCode !== "return-outside-function" && rejection.ruleCode !== "duplicate-block-lexical-function" && rejection.ruleCode !== "duplicate-strict-parameter" && rejection.ruleCode !== "assignment-target" && rejection.ruleCode !== "lexical-declaration-statement" && rejection.ruleCode !== "numeric-separator" && rejection.ruleCode !== "regexp-literal" && rejection.ruleCode !== "private-name") throw new Error("unreviewed Script rule");
            return this.envelope(operation, site,
                { kind: "syntax-error", phase: "parse", constructorName: "SyntaxError", ruleCode: rejection.ruleCode });
        }
        // Preserve independent legacy return certification at its original boundary.
        if (this.request.action === "parse-only" && unit.role === "test") {
            const audit = parse(unit.text);
            if (audit.rejection !== null && audit.rejection.kind === "syntax-error" && audit.rejection.ruleCode === "return-outside-function" && audit.error !== null)
                return this.envelope(operation, { unitId: unit.id, realmId: "test", location: audit.error.loc },
                    { kind: "syntax-error", phase: "parse", constructorName: "SyntaxError", ruleCode: "return-outside-function" });
        }
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
            // The closed preflight route stops at the actual control harness, even
            // when its oracle reports false. Never prepare the trailing test.
            if (this.preflightControl && unit.id === "u" + (this.request.units.length - 2)) return answer;
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

// BEGIN private positional conformance request construction.
type ProducerLimits = {
    sourceUnits: number; parseDepth: number; steps: number; calls: number;
    evaluationDepth: number; wallMs: number; outputBytes: number;
};
type ProducerUnit = { id: string; role: "harness" | "test"; text: string };
type ScriptProducerRequest = {
    mode: "conformance"; variant: "raw" | "non-strict" | "strict";
    action: "execute" | "parse-only"; nonce: string; requestSha256: string;
    preflightId: string | null; limits: ProducerLimits; units: ProducerUnit[];
};
function producerNeed(ok: boolean, code: string): void { if (!ok) throw new Error("script-producer/" + code); }
function producerIdentifier(value: string): boolean {
    if (typeof value !== "string" || value.length === 0) return false;
    for (let n = 0; n < value.length; n++) if (value.charCodeAt(n) < 33 || value.charCodeAt(n) > 126) return false;
    return true;
}
function producerHash(value: string): boolean {
    if (typeof value !== "string" || value.length !== 64) return false;
    for (let n = 0; n < value.length; n++) {
        const c = value.charCodeAt(n);
        if (!((c >= 48 && c <= 57) || (c >= 97 && c <= 102))) return false;
    }
    return true;
}
function producerDecimal(text: string): number {
    if (text.length === 0) throw new Error("script-producer/limit");
    for (let n = 0; n < text.length; n++) producerNeed(text.charCodeAt(n) >= 48 && text.charCodeAt(n) <= 57, "limit");
    const value = Number(text);
    producerNeed(Number.isSafeInteger(value), "limit");
    return value;
}
function parseProducerArguments(args: string[]): ScriptProducerRequest {
    producerNeed(Array.isArray(args), "arguments");
    for (let n = 0; n < args.length; n++) producerNeed(typeof args[n] === "string", "arguments");
    producerNeed(args.length >= 17 && (args.length - 14) % 3 === 0, "argc");
    producerNeed(args[0] === "conformance", "mode");
    producerNeed(args[1] === "raw" || args[1] === "non-strict" || args[1] === "strict", "variant");
    producerNeed(args[2] === "execute" || args[2] === "parse-only", "action");
    producerNeed(producerIdentifier(args[3]), "nonce");
    producerNeed(producerHash(args[4]), "request-hash");
    producerNeed(producerIdentifier(args[5]), "preflight");
    producerNeed(args[6].length > 0, "result-path");
    const limits: ProducerLimits = { sourceUnits: producerDecimal(args[7]), parseDepth: producerDecimal(args[8]), steps: producerDecimal(args[9]),
        calls: producerDecimal(args[10]), evaluationDepth: producerDecimal(args[11]), wallMs: producerDecimal(args[12]), outputBytes: producerDecimal(args[13]) };
    const request: ScriptProducerRequest = { mode: "conformance", variant: args[1] as ScriptProducerRequest["variant"],
        action: args[2] as ScriptProducerRequest["action"], nonce: args[3], requestSha256: args[4],
        preflightId: args[5] === "-" ? null : args[5], limits, units: [] };
    for (let n = 14; n < args.length; n += 3) {
        producerNeed(args[n] === "u" + ((n - 14) / 3) && args[n + 1] === (n === args.length - 3 ? "test" : "harness") && args[n + 2].length > 0, "unit");
        request.units.push({ id: args[n], role: n === args.length - 3 ? "test" : "harness", text: "" });
    }
    // Decimal syntax already guarantees nonnegative safe integers. Check fixed
    // limits only after every triple, preserving the positional error order.
    producerNeed(limits.sourceUnits === 100000 && limits.parseDepth === 128 && limits.evaluationDepth === 256, "fixed-limit");
    producerNeed(limits.wallMs <= 2147483647, "wall-limit");
    producerNeed(request.variant === "raw" ? request.units.length === 1 && request.preflightId === null : request.preflightId !== null, "variant-preflight");
    return request;
}

function prepareProducerRequest(args: string[], sourceTexts: string[]): ScriptProducerRequest {
    const request = parseProducerArguments(args);
    producerNeed(Array.isArray(sourceTexts) && sourceTexts.length === request.units.length, "source-texts");
    for (let n = 0; n < request.units.length; n++) {
        producerNeed(typeof sourceTexts[n] === "string", "source-texts");
        request.units[n].text = sourceTexts[n];
    }
    if (request.variant === "strict")
        producerNeed(request.units[request.units.length - 1].text.startsWith('"use strict";\n'), "strict-transform");
    return request;
}

// Positional data only: no public API accepts or returns a producer request record.
// Ordinary string arrays; extra array properties are ignored. No hostile-object guarantee.
export function validateConformanceScriptArguments(args: string[]): void { parseProducerArguments(args); }
// END private positional conformance request construction.

// Mode selects wire data, not admission. Only the parent can verify preflight.
export function produceConformanceScripts(args: string[], sourceTexts: string[]): ChildV2 {
    const request = prepareProducerRequest(args, sourceTexts);
    const observation: ScriptObservationRequest = { nonce: request.nonce, requestSha256: request.requestSha256,
        action: request.action, preflightId: request.preflightId, steps: request.limits.steps, calls: request.limits.calls,
        units: request.units.map(unit => ({ id: unit.id, role: unit.role, text: unit.text })) };
    return new Attempt(observation, "conformance").run();
}

// BEGIN closed conformance preflight prerequisite. Data only; no success token.
type PreflightRequest = { control: string; input: string; observation: ScriptObservationRequest };
function preflightNeed(ok: boolean, code: string): void { if (!ok) throw new Error("script-preflight/" + code); }
function preflightDecimal(text: string): number {
    if (text.length === 0) throw new Error("script-preflight/limit");
    for (let n = 0; n < text.length; n++) preflightNeed(text.charCodeAt(n) >= 48 && text.charCodeAt(n) <= 57, "limit");
    const value = Number(text);
    preflightNeed(Number.isSafeInteger(value), "limit");
    return value;
}
function preflightSource(control: string, input: string): string {
    switch (control) {
        case "B01": return "\"use strict\"; assert(true); assert.sameValue(NaN,NaN); assert.sameValue(-0,-0);";
        case "B02": return "\"use strict\"; assert(false,'control');";
        case "B03": return "\"use strict\"; assert(false);";
        case "B04": return "\"use strict\"; assert.sameValue(0,-0);";
        case "B05": return "\"use strict\"; assert.throws(ReferenceError,function(){missing;});";
        case "B06": return "\"use strict\"; assert.throws(ReferenceError,function(){});";
        case "B07": return "\"use strict\"; assert.throws(ReferenceError,function(){throw 7;});";
        case "B08": return "\"use strict\"; assert.throws(ReferenceError,function(){throw new TypeError();});";
        case "B09": return "\"use strict\"; assert.throws(ReferenceError,function(){throw new Other();});";
        case "B10": return "\"use strict\"; assert.throws(TypeError,7);";
        case "B11": return "\"use strict\"; var e=Test262Error('x'); assert.sameValue(e.constructor,Test262Error); assert.sameValue(e.toString(),'Test262Error: x');";
        case "B12": return "\"use strict\"; Test262Error.thrower('control');";
        case "B13": return "\"use strict\"; assert._isSameValue=function(){throw 7;}; assert.sameValue(1,1,'control');";
        case "B14": return "\"use strict\"; assert(false,{toString:function(){throw 7;}});";
        case "B15": return "\"use strict\"; assert.sameValue({toString:function(){throw new TypeError();}},0);";
        case "B16": return "\"use strict\"; assert.sameValue({toString:function(){throw 7;}},0);";
        case "N01": return "\"use strict\"; assert.notSameValue(0,-0);";
        case "N02": return "\"use strict\"; assert.notSameValue(1,1);";
        case "I01": return input === "alpha" ? "\"use strict\"; assert.sameValue(7,7); throw 7;" : "\"use strict\"; assert.sameValue(11,11); throw 11;";
    }
    throw new Error("script-preflight/control");
}
// Exact pinned Test262 originals, including comments and line endings. LICENSE:
// test/fixtures/harness-bundle/LICENSE, revision91c70759363c46557b694792bf34a2551a7af5ba.
const preflightAssert = "// Copyright (C) 2017 Ecma International.  All rights reserved.\n// This code is governed by the BSD license found in the LICENSE file.\n/*---\ndescription: |\n    Collection of assertion functions used throughout test262\ndefines:\n  - assert\n  - compareArray\n  - formatIdentityFreeValue\n  - formatSimpleValue\n  - isNegativeZero\n  - isPrimitive\n---*/\n\n\nfunction isNegativeZero(value) {\n  return value === 0 && 1 / value === -Infinity;\n}\n\nfunction isPrimitive(value) {\n  return !value || (typeof value !== 'object' && typeof value !== 'function');\n}\n\nfunction formatIdentityFreeValue(value) {\n  switch (value === null ? 'null' : typeof value) {\n    case 'string':\n      return typeof JSON !== \"undefined\" ? JSON.stringify(value) : '\"' + value + '\"';\n    case 'bigint':\n      return String(value) + \"n\";\n    case 'number':\n      if (isNegativeZero(value)) return '-0';\n      // falls through\n    case 'boolean':\n    case 'undefined':\n    case 'null':\n      return String(value);\n  }\n}\n\nfunction formatSimpleValue(value) {\n  var basic = formatIdentityFreeValue(value);\n  if (basic) return basic;\n  try {\n    return String(value);\n  } catch (err) {\n    if (err.name === 'TypeError') {\n      return Object.prototype.toString.call(value);\n    }\n    throw err;\n  }\n}\n\nfunction assert(mustBeTrue, message) {\n  if (mustBeTrue === true) {\n    return;\n  }\n\n  if (message === undefined) {\n    message = 'Expected true but got ' + assert._toString(mustBeTrue);\n  }\n  throw new Test262Error(message);\n}\n\nassert._isSameValue = function (a, b) {\n  if (a === b) {\n    // Handle +/-0 vs. -/+0\n    return a !== 0 || 1 / a === 1 / b;\n  }\n\n  // Handle NaN vs. NaN\n  return a !== a && b !== b;\n};\n\nassert.sameValue = function (actual, expected, message) {\n  try {\n    if (assert._isSameValue(actual, expected)) {\n      return;\n    }\n  } catch (error) {\n    throw new Test262Error(message + ' (_isSameValue operation threw) ' + error);\n    return;\n  }\n\n  if (message === undefined) {\n    message = '';\n  } else {\n    message += ' ';\n  }\n\n  message += 'Expected SameValue(«' + assert._toString(actual) + '», «' + assert._toString(expected) + '») to be true';\n\n  throw new Test262Error(message);\n};\n\nassert.notSameValue = function (actual, unexpected, message) {\n  if (!assert._isSameValue(actual, unexpected)) {\n    return;\n  }\n\n  if (message === undefined) {\n    message = '';\n  } else {\n    message += ' ';\n  }\n\n  message += 'Expected SameValue(«' + assert._toString(actual) + '», «' + assert._toString(unexpected) + '») to be false';\n\n  throw new Test262Error(message);\n};\n\nassert.throws = function (expectedErrorConstructor, func, message) {\n  var expectedName, actualName;\n  if (typeof func !== \"function\") {\n    throw new Test262Error('assert.throws requires two arguments: the error constructor ' +\n      'and a function to run');\n    return;\n  }\n  if (message === undefined) {\n    message = '';\n  } else {\n    message += ' ';\n  }\n\n  try {\n    func();\n  } catch (thrown) {\n    if (typeof thrown !== 'object' || thrown === null) {\n      message += 'Thrown value was not an object!';\n      throw new Test262Error(message);\n    } else if (thrown.constructor !== expectedErrorConstructor) {\n      expectedName = expectedErrorConstructor.name;\n      actualName = thrown.constructor.name;\n      if (expectedName === actualName) {\n        message += 'Expected a ' + expectedName + ' but got a different error constructor with the same name';\n      } else {\n        message += 'Expected a ' + expectedName + ' but got a ' + actualName;\n      }\n      throw new Test262Error(message);\n    }\n    return;\n  }\n\n  message += 'Expected a ' + expectedErrorConstructor.name + ' to be thrown but no exception was thrown at all';\n  throw new Test262Error(message);\n};\n\nassert.compareArray = function (actual, expected, message) {\n  message = message === undefined ? '' : message;\n\n  if (typeof message === 'symbol') {\n    message = message.toString();\n  }\n\n  if (isPrimitive(actual)) {\n    assert(false, \"Actual argument [\" + actual + \"] shouldn't be primitive. \" + String(message));\n  } else if (isPrimitive(expected)) {\n    assert(false, \"Expected argument [\" + expected + \"] shouldn't be primitive. \" + String(message));\n  }\n  var result = compareArray(actual, expected);\n  if (result) return;\n\n  var format = compareArray.format;\n  assert(false, \"Actual \" + format(actual) + \" and expected \" + format(expected) + \" should have the same contents. \" + String(message));\n};\n\nfunction compareArray(a, b) {\n  if (b.length !== a.length) {\n    return false;\n  }\n  for (var i = 0; i < a.length; i++) {\n    if (!assert._isSameValue(b[i], a[i])) {\n      return false;\n    }\n  }\n  return true;\n}\n\ncompareArray.format = function (arrayLike) {\n  return \"[\" + Array.prototype.map.call(arrayLike, String).join(\", \") + \"]\";\n};\n\nassert._formatIdentityFreeValue = formatIdentityFreeValue;\n\nassert._toString = formatSimpleValue;\n";
const preflightSta = "// Copyright (c) 2012 Ecma International.  All rights reserved.\n// This code is governed by the BSD license found in the LICENSE file.\n/*---\ndescription: |\n    Provides both:\n\n    - An error class to avoid false positives when testing for thrown exceptions\n    - A function to explicitly throw an exception using the Test262Error class\ndefines: [Test262Error, $DONOTEVALUATE]\n---*/\n\n\nfunction Test262Error(message) {\n  if (!(this instanceof Test262Error)) return new Test262Error(message);\n  this.message = message || \"\";\n}\n\nTest262Error.prototype.toString = function () {\n  return \"Test262Error: \" + this.message;\n};\n\nTest262Error.thrower = function (message) {\n  throw new Test262Error(message);\n};\n\nfunction $DONOTEVALUATE() {\n  throw \"Test262: This statement should not be evaluated.\";\n}\n";
function parsePreflightArguments(args: string[]): PreflightRequest {
    preflightNeed(Array.isArray(args), "arguments");
    for (let n = 0; n < args.length; n++) preflightNeed(typeof args[n] === "string", "arguments");
    preflightNeed(args.length === 29 || args.length === 32, "argc");
    preflightNeed(args[0] === "conformance-preflight-v1", "purpose");
    preflightSource(args[1], "alpha");
    preflightNeed(args[2] === "alpha" || args[2] === "beta", "input");
    preflightNeed(args[3] === "conformance", "mode");
    preflightNeed(args[4] === "strict", "variant");
    preflightNeed(args[5] === "execute", "action");
    preflightNeed(producerIdentifier(args[6]), "nonce");
    preflightNeed(producerHash(args[7]), "request-hash");
    preflightNeed(args[8] === "-", "preflight");
    preflightNeed(args[9].length > 0, "result-path");
    const sourceUnits = preflightDecimal(args[10]), parseDepth = preflightDecimal(args[11]);
    const steps = preflightDecimal(args[12]), calls = preflightDecimal(args[13]);
    const evaluationDepth = preflightDecimal(args[14]), wallMs = preflightDecimal(args[15]);
    preflightDecimal(args[16]);
    const units: ObservationUnit[] = [];
    for (let n = 17; n < args.length; n += 3) {
        preflightNeed(args[n] === "u" + ((n - 17) / 3) && args[n + 1] === (n === args.length - 3 ? "test" : "harness") && args[n + 2].length > 0, "unit");
        units.push({ id: args[n], role: n === args.length - 3 ? "test" : "harness", text: "" });
    }
    preflightNeed(sourceUnits === 100000 && parseDepth === 128 && evaluationDepth === 256, "fixed-limit");
    preflightNeed(wallMs <= 2147483647, "wall-limit");
    return { control: args[1], input: args[2], observation: { nonce: args[6], requestSha256: args[7], action: "execute", preflightId: null, steps, calls, units } };
}
function preparePreflightRequest(args: string[], sourceTexts: string[]): PreflightRequest {
    const request = parsePreflightArguments(args), units = request.observation.units;
    preflightNeed(Array.isArray(sourceTexts) && sourceTexts.length === units.length, "source-texts");
    for (let n = 0; n < units.length; n++) preflightNeed(typeof sourceTexts[n] === "string", "source-texts");
    preflightNeed(sourceTexts[0] === preflightAssert, "harness-source");
    for (let n = 1; n < units.length - 2; n++) preflightNeed(sourceTexts[n] === preflightSta, "harness-source");
    preflightNeed(sourceTexts[units.length - 2] === preflightSource(request.control, request.input), "control-source");
    preflightNeed(sourceTexts[units.length - 1] === '"use strict";\n', "test-source");
    for (let n = 0; n < units.length; n++) units[n].text = sourceTexts[n];
    return request;
}
export function validateConformancePreflightArguments(args: string[]): void { parsePreflightArguments(args); }
// Trusted positional string arrays, as in E3b; no callback/AST/Realm parameters.
export function produceConformancePreflightControl(args: string[], sourceTexts: string[]): { child: ChildV2; report: ScriptControlReport } {
    const request = preparePreflightRequest(args, sourceTexts);
    const attempt = new Attempt(request.observation, "conformance", true);
    attempt.controlSetup(request.control, request.input);
    const child = attempt.run();
    return { child, report: attempt.report() };
}
// END closed conformance preflight prerequisite.
