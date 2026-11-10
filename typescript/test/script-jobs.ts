import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs, type ScriptSession } from "../src/script-execution.js";
import { UNDEFINED, normal, languageFailure, type ValueCompletion, type OperationContext, type ScriptJob } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm: Realm, session: ScriptSession, id = "job-source"): ValueCompletion {
    const prepared = prepareBoundedScript({ id, text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    const result = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0 && session.inspect().depth === 0, "evaluation cleanup");
    return result;
}
function install(realm: Realm, retained: OperationContext[]): void {
    const enqueue = realm.createBuiltin("enqueue", 1, (_receiver, args, context, loc): ValueCompletion => {
        retained.push(context);
        const callback = args[0];
        if (context.enqueueJob === undefined) throw new Error("missing enqueue capability");
        return context.enqueueJob({ realm, run: (jobContext: OperationContext): ValueCompletion => jobContext.call(callback, UNDEFINED, [], loc) }, loc);
    });
    realm.defineScriptGlobal("enqueue", { value: { kind: "object", object: enqueue } });
}
function string(text: string, expected: string, realm: Realm, session: ScriptSession): void {
    const r = run(text, realm, session);
    check(r.type === "normal" && r.value.kind === "string" && r.value.value === expected, text);
}
{
    const realm = fresh(), session = createScriptSession(), retained: OperationContext[] = [];
    install(realm, retained);
    string("var order='';enqueue(()=>{order+='a';enqueue(()=>order+='c')});enqueue(()=>order+='b');order+='s';order", "s", realm, session);
    const enqueue = retained[0].enqueueJob;
    if (enqueue === undefined) throw new Error("missing retained capability");
    let denied = false;
    try { enqueue({ realm, run: (_context: OperationContext): ValueCompletion => normal() }, { line: 1, column: 1 }); }
    catch (error) { denied = error instanceof Error && error.message === "inactive Script session"; }
    check(denied, "retained enqueue denied outside execution");
    const drained = drainScriptJobs(session);
    check(drained.completed === 3 && drained.failures.length === 0 && !drained.fatal, "FIFO drain including nested enqueue");
    string("order", "sabc", realm, session);
    check(drainScriptJobs(session).completed === 0, "drain once");
}
{
    const realm = fresh(), session = createScriptSession(); install(realm, []);
    run("var order='',token={};enqueue(()=>{throw token});enqueue(()=>order+='b');throw 7", realm, session, "guest-job-origin");
    const drained = drainScriptJobs(session);
    check(drained.completed === 2 && drained.failures.length === 1 && !drained.fatal, "guest failure does not discard queued jobs");
    const originalLine = session.inspect().lastAbrupt?.loc.line;
    drained.failures[0].source.loc.line = 999;
    check(session.inspect().lastAbrupt?.loc.line === originalLine, "job failure source is detached from session history");
    const token = run("token", realm, session);
    const failure = drained.failures[0];
    check(token.type === "normal" && token.value.kind === "object" && failure.completion.value.kind === "object" && token.value.object === failure.completion.value.object, "throw identity");
    check(failure.source.unitId === "guest-job-origin" && failure.source.realm === realm, "guest callback source");
    string("order", "b", realm, session);
}
{
    const realm = fresh(), session = createScriptSession(); install(realm, []);
    let rejected = 0;
    const reenter = realm.createBuiltin("reenter", 0, (_receiver, _args, _context, _loc): ValueCompletion => {
        try { drainScriptJobs(session); }
        catch (error) { if (error instanceof Error && error.message === "Script checkpoint requires an idle session") rejected++; else throw error; }
        return normal();
    });
    realm.defineScriptGlobal("reenter", { value: { kind: "object", object: reenter } });
    run("reenter();enqueue(()=>reenter())", realm, session);
    check(drainScriptJobs(session).completed === 1 && rejected === 2, "no checkpoint inside Script or job");
}
{
    const caller = fresh(), owner = fresh(), session = createScriptSession();
    const enqueue = caller.createBuiltin("enqueueFailure", 0, (_receiver, _args, context, loc): ValueCompletion => {
        if (context.enqueueJob === undefined) throw new Error("missing enqueue");
        return context.enqueueJob({ realm: owner, run: (jobContext: OperationContext): ValueCompletion => languageFailure(jobContext.realm, "TypeError", "job failure", loc) }, loc);
    });
    caller.defineScriptGlobal("enqueueFailure", { value: { kind: "object", object: enqueue } });
    run("enqueueFailure()", caller, session, "foreign-job");
    const result = drainScriptJobs(session), failure = result.failures[0];
    check(result.completed === 1 && failure.completion.value.kind === "object" && failure.completion.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "requested job Realm");
    check(failure.source.unitId === "foreign-job" && failure.source.realm === owner, "enqueue source with execution Realm");
}
{
    const realm = fresh(), session = createScriptSession(); install(realm, []);
    run("var order='';enqueue(()=>{eval('async function f(){}')});enqueue(()=>order+='next')", realm, session);
    const drained = drainScriptJobs(session);
    check(!drained.fatal && drained.failures.length === 0 && drained.completed === 2, "async declaration job completes");
    string("order", "next", realm, createScriptSession());
}
for (const source of ["while(true){}", "eval('async function f(){await 1;}')"]) {
    const realm = fresh(), session = createScriptSession({ maxSteps: 200, maxCalls: 32 }); install(realm, []);
    run("var order='';enqueue(()=>{" + source + "});enqueue(()=>order+='wrong')", realm, session);
    const drained = drainScriptJobs(session);
    check(drained.fatal && drained.failures.length === 1 && drainScriptJobs(session).completed === 0, "fatal job clears queue");
    string("order", "", realm, createScriptSession());
    check(session.inspect().active === null && session.inspect().calls === 0 && session.inspect().depth === 0, "fatal job cleanup");
}
{
    const realm = fresh(), session = createScriptSession({ maxSteps: 100, maxCalls: 32 }); install(realm, []);
    const result = run("enqueue(()=>{});while(true){}", realm, session);
    check(result.type === "throw" && result.origin.kind === "resource-limit" && drainScriptJobs(session).completed === 0, "fatal synchronous evaluation clears jobs");
}
{
    const realm = fresh(), session = createScriptSession(); install(realm, []);
    const sentinel = new Error("host sentinel");
    const fault = realm.createBuiltin("fault", 0, (_receiver, _args, _context, _loc): ValueCompletion => { throw sentinel; });
    realm.defineScriptGlobal("fault", { value: { kind: "object", object: fault } });
    run("var order='';enqueue(()=>fault());enqueue(()=>order+='wrong')", realm, session);
    let caught = false;
    try { drainScriptJobs(session); } catch (error) { caught = error instanceof Error && error === sentinel; }
    check(caught && drainScriptJobs(session).completed === 0 && session.inspect().active === null, "host fault clears queue and restores idle state");
    string("order", "", realm, session);
}
{
    const realm = fresh(), session = createScriptSession({ maxSteps: 40, maxCalls: 32 });
    const loc = { line: 1, column: 1 };
    const repeated: ScriptJob = { realm: null, run: (context: OperationContext): ValueCompletion => {
        check(context.realm === realm, "null job Realm uses enqueue Realm");
        if (context.enqueueJob === undefined) throw new Error("missing enqueue");
        return context.enqueueJob(repeated, loc);
    } };
    const start = realm.createBuiltin("start", 0, (_receiver, _args, context, _loc): ValueCompletion => {
        if (context.enqueueJob === undefined) throw new Error("missing enqueue");
        return context.enqueueJob(repeated, loc);
    });
    realm.defineScriptGlobal("start", { value: { kind: "object", object: start } });
    run("start()", realm, session);
    const drained = drainScriptJobs(session);
    check(drained.fatal && drained.completed > 1 && drained.failures[0].completion.origin.kind === "resource-limit", "self-enqueue consumes steps without guest calls");
    check(drainScriptJobs(session).completed === 0, "self-enqueue cancellation");
}
{
    const owner = fresh(), caller = fresh(), session = createScriptSession(); install(owner, []);
    const enqueue = owner.globalObject.getOwnProperty("enqueue");
    if (enqueue === undefined || enqueue.kind !== "data") throw new Error("foreign enqueue setup");
    caller.defineScriptGlobal("enqueue", { value: enqueue.value });
    run("var out;enqueue(()=>{out=[]})", caller, session);
    check(drainScriptJobs(session).failures.length === 0, "foreign enqueue callback succeeds");
    const result = run("out", caller, session);
    check(result.type === "normal" && result.value.kind === "object" && result.value.object.getPrototypeOf() === caller.arrayPrototype, "callback defining Realm overrides job Realm");
}
check(drainScriptJobs(createScriptSession()).completed === 0, "unused session checkpoint");
console.log("Script jobs passed");
