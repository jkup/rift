import { Realm } from "../src/realm.js";
import { getIterator, iteratorStep, iteratorStepValue, type IteratorRecord } from "../src/iterator.js";
import { GuestObject, normal, resourceFailure, UNDEFINED, type OperationContext, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function run(text: string, done: boolean, valueStep = false): void {
    const realm = new Realm((_line: string) => {}, "script");
    const observed: { record: IteratorRecord | null } = { record: null };
    const step = realm.createBuiltin("step", 1, (_receiver, args, context, loc): ValueCompletion => {
        const acquired = getIterator(args[0] ?? UNDEFINED, context, loc);
        if (acquired.type === "throw") return acquired;
        observed.record = acquired.value;
        if (valueStep) {
            const result = iteratorStepValue(acquired.value, context, loc);
            return result.type === "throw" ? result : normal(result.value);
        }
        const result = iteratorStep(acquired.value, context, loc);
        return result.type === "throw" ? result : result.value === null ? normal() : normal({ kind: "object", object: result.value });
    });
    realm.defineScriptGlobal("step", { value: { kind: "object", object: step } });
    const source = "var log='';var iterator={};iterator[Symbol.iterator]=function(){log+='i';return this};" + text;
    const prepared = prepareBoundedScript({ id: "iterator-step", text: source }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
    check(observed.record !== null && observed.record.done === done, "done state: " + text);
}
run("var r={get done(){log+='d';return false},get value(){throw 7}};iterator.next=function(){log+='n';return r};step(iterator)===r&&log==='ind'", false);
run("var r={get done(){log+='d';return true},get value(){throw 7}};iterator.next=function(){log+='n';return r};step(iterator)===undefined&&log==='ind'", true);
run("iterator.next=function(){return {get done(){return {}},get value(){throw 7}}};step(iterator)===undefined", true);
run("iterator.next=function(){return {get done(){return false},get value(){log+='v';return 7}}};step(iterator)===7&&log==='iv'", false, true);
run("iterator.next=function(){return {done:true,get value(){throw 7}}};step(iterator)===undefined", true, true);
for (const valueStep of [false, true]) {
    run("var sentinel={};iterator.next=function(){throw sentinel};try{step(iterator)}catch(e){e===sentinel}", true, valueStep);
    run("iterator.next=function(){return 1};try{step(iterator)}catch(e){e instanceof TypeError}", true, valueStep);
    run("var sentinel={};iterator.next=function(){return {get done(){throw sentinel}}};try{step(iterator)}catch(e){e===sentinel}", true, valueStep);
    run("Object.defineProperty(iterator,'next',{get:function(){log+='g';return function(){log+='n';return {done:false,value:8}}}});step(iterator);log==='ign'", false, valueStep);
}
run("var sentinel={};iterator.next=function(){return {done:false,get value(){throw sentinel}}};try{step(iterator)}catch(e){e===sentinel}", true, true);
for (const valueStep of [false, true]) {
    const realm = new Realm((_line: string) => {}, "script"), loc = { line: 3, column: 7 };
    const record: IteratorRecord = { iterator: new GuestObject(), nextMethod: UNDEFINED, done: false };
    const stop = resourceFailure("steps", 2, 1, "step bound", loc);
    let ticks = 0;
    const context: OperationContext = { realm,
        call: (_callee, _receiver, _args, _loc): ValueCompletion => { throw new Error("call after limit"); },
        tick: (_loc): ValueCompletion => { ticks++; return stop; } };
    const result = valueStep ? iteratorStepValue(record, context, loc) : iteratorStep(record, context, loc);
    check(result === stop && ticks === 1 && !record.done, "single shared tick and unchanged done state on limit");
    const fault = new Error("host fault");
    context.tick = (_loc): ValueCompletion => normal();
    context.call = (_callee, _receiver, _args, _loc): ValueCompletion => { throw fault; };
    let seen = false;
    try { if (valueStep) iteratorStepValue(record, context, loc); else iteratorStep(record, context, loc); }
    catch (error) { seen = error instanceof Error && error === fault; }
    check(seen && !record.done, "host fault passes through unchanged");
}
console.log("Iterator step passed");
