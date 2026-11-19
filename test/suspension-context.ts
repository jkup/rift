import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, type ScriptSession } from "../src/script-execution.js";
import { UNDEFINED, normal, languageFailure, type Value, type ValueCompletion, type OperationContext } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const loc: Location = { line: 1, column: 1 };
function run(source: string, realm: Realm, session: ScriptSession): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "resume-probe", text: source }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + prepared.kind);
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "session restored");
    return result;
}
function own(realm: Realm, name: string): Value {
    const property = realm.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") throw new Error("missing " + name);
    return property.value;
}
function define(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true });
}
function numeric(result: ValueCompletion, expected: number): void {
    check(result.type === "normal" && result.value.kind === "number" && result.value.value === expected, "number " + expected);
}

// This controller is probe-only: it suspends host control flow, not a guest AST.
class Suspended {
    current: OperationContext | null = null;
    completed = false;
    readonly iterator: Generator<Value, ValueCompletion, ValueCompletion>;
    constructor(readonly first: Value, readonly second: Value) { this.iterator = body(this); }
    call(callback: Value): ValueCompletion {
        const context = this.current;
        if (context === null) throw new Error("inactive resume");
        const realm = context.realm;
        const result = context.call(callback, UNDEFINED, [], loc);
        check(context.realm === realm, "callback Realm restored");
        return result;
    }
    resume(context: OperationContext, sent: ValueCompletion = normal()): ValueCompletion {
        if (this.current !== null) return languageFailure(context.realm, "TypeError", "already executing", loc);
        if (this.completed) return normal();
        this.current = context;
        try {
            const result = this.iterator.next(sent);
            if (result.done) { this.completed = true; return result.value; }
            return normal(result.value);
        } catch (error) {
            this.completed = true;
            throw error;
        } finally {
            this.current = null;
        }
    }
}
function* body(frame: Suspended): Generator<Value, ValueCompletion, ValueCompletion> {
    const first = frame.call(frame.first);
    if (first.type === "throw") return first;
    const sent: ValueCompletion = yield first.value;
    if (sent.type === "throw") return sent;
    return frame.call(frame.second);
}
function install(realm: Realm, frame: Suspended): void {
    define(realm, "resume", { kind: "object", object: realm.createBuiltin("resume", 0,
        (_receiver: Value, _args: Value[], context: OperationContext, _loc: Location): ValueCompletion => frame.resume(context)) });
}
const A = new Realm((_line: string): void => {}, "script"), B = new Realm((_line: string): void => {}, "script");
const setup = createScriptSession();
check(run('var count=0; var marker={}; function first(){count++;return count;} function second(){count++;return count;} function fail(){throw marker;} function costly(){while(true){count++;}} function reenter(){return resume();}', A, setup).type === "normal", "setup");
const firstSession = createScriptSession(), secondSession = createScriptSession();
const frame = new Suspended(own(A, "first"), own(A, "second"));
install(A, frame); install(B, frame);
numeric(run('resume();', A, firstSession), 1);
check(frame.current === null && !frame.completed, "yield releases context");
const firstSteps = firstSession.inspect().steps, setupSteps = setup.inspect().steps;
numeric(run('resume();', B, secondSession), 2);
check(frame.current === null && frame.completed, "completion releases context");
check(firstSession.inspect().steps === firstSteps && setup.inspect().steps === setupSteps && secondSession.inspect().steps > 0, "current budget only");
check(run('resume();', B, secondSession).type === "normal", "completed resume");
numeric(run('count;', A, setup), 2);

const failed = new Suspended(own(A, "first"), own(A, "fail"));
install(A, failed); install(B, failed);
numeric(run('resume();', A, firstSession), 3);
const beforeFailure = firstSession.inspect().steps;
const failure = run('resume();', B, secondSession), marker = own(A, "marker");
check(failure.type === "throw" && failure.value.kind === "object" && marker.kind === "object" && failure.value.object === marker.object, "guest throw identity");
check(failed.current === null && failed.completed && firstSession.inspect().steps === beforeFailure, "throw cleanup/current session");

const injected = new Suspended(own(A, "first"), own(A, "second"));
install(A, injected);
check(run('resume();', A, createScriptSession()).type === "normal", "injected first yield");
define(B, "resume", { kind: "object", object: B.createBuiltin("resume", 0,
    (_receiver: Value, _args: Value[], context: OperationContext, _loc: Location): ValueCompletion => injected.resume(context, failure)) });
const abrupt = run('resume();', B, createScriptSession());
check(abrupt === failure && injected.current === null && injected.completed, "injected completion identity");
let inactive = false;
try { injected.call(own(A, "first")); } catch (error) { if (error instanceof Error) inactive = error.message === "inactive resume"; }
check(inactive, "suspended callbacks have no execution authority");

const costly = new Suspended(own(A, "first"), own(A, "costly"));
install(A, costly); install(B, costly);
numeric(run('resume();', A, firstSession), 5);
const beforeBudget = firstSession.inspect().steps, limited = createScriptSession({ maxSteps: 80, maxCalls: 16 });
const stopped = run('resume();', B, limited);
check(stopped.type === "throw" && stopped.origin.kind === "resource-limit", "current resource stop");
check(costly.current === null && costly.completed && firstSession.inspect().steps === beforeBudget && limited.inspect().steps > 80, "resource cleanup/current session");

const recursive = new Suspended(own(A, "reenter"), own(A, "second"));
install(A, recursive); install(B, recursive);
const recursion = run('resume();', B, createScriptSession());
check(recursion.type === "throw" && recursion.value.kind === "object" && recursion.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"), "reentry error Realm");
check(recursive.current === null && recursive.completed, "reentry cleanup");

const sentinel = new Error("host fault");
const fault = { kind: "object" as const, object: A.createBuiltin("fault", 0,
    (_receiver: Value, _args: Value[], _context: OperationContext, _loc: Location): ValueCompletion => { throw sentinel; }) };
const faulty = new Suspended(own(A, "first"), fault);
install(A, faulty); install(B, faulty);
check(run('resume();', A, createScriptSession()).type === "normal", "fault first yield");
const faultSession = createScriptSession();
let caught = false;
try { run('resume();', B, faultSession); } catch (error) { if (error instanceof Error) caught = error === sentinel; }
check(caught && faulty.current === null && faulty.completed, "host fault identity/cleanup");
const idle = faultSession.inspect();
check(idle.active === null && idle.calls === 0 && idle.depth === 0, "host fault session restored");
console.log("suspension context passed");
