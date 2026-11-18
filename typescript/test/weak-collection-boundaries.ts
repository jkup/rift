import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function run(text: string, realm: Realm, steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "weak-collection-boundaries", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    return evaluateScript(createScriptSession({maxSteps: steps, maxCalls: 64}), prepared.record).completion;
}
let checks = 0;
function truth(text: string, realm: Realm): void {
    const result = run(text, realm);
    if (result.type !== "normal" || !sameValue(result.value, {kind: "boolean", value: true})) throw new Error(text);
    checks++;
}
for (const name of ["WeakMap", "WeakSet"]) {
    const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
    const foreign = run("function F(){}F.prototype=0;F", owner);
    if (foreign.type !== "normal") throw new Error("foreign constructor");
    caller.defineScriptGlobal("F", {value: foreign.value});
    caller.defineScriptGlobal("expected", {value: {kind: "object", object: name === "WeakMap" ? owner.weakMapPrototype : owner.weakSetPrototype}});
    truth("Object.getPrototypeOf(Reflect.construct(" + name + ",[],F))===expected;", caller);
    truth("let B=F.bind(null);Object.getPrototypeOf(Reflect.construct(" + name + ",[],B))===expected;", caller);
    truth("let seen=0,custom={};Object.defineProperty(B,'prototype',{get(){seen++;return custom}});Object.getPrototypeOf(Reflect.construct(" + name + ",[],B))===custom&&seen===1;", caller);
    const method = run(name + ".prototype.has;", owner);
    if (method.type !== "normal") throw new Error("foreign method");
    caller.defineScriptGlobal("foreignHas", {value: method.value});
    truth("foreignHas.call(new " + name + "(),{})===false;", caller);
    const error = run("foreignHas.call({});", caller);
    if (error.type !== "throw" || error.value.kind !== "object" || error.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")) throw new Error("method error Realm");
    checks++;
    truth("let C=" + name + ",d=Object.getOwnPropertyDescriptor(C,'prototype'),tag=Object.getOwnPropertyDescriptor(C.prototype,Symbol.toStringTag);C.length===0&&C.name==='" + name + "'&&!d.writable&&!d.enumerable&&!d.configurable&&!tag.writable&&!tag.enumerable&&tag.configurable;", caller);
    const bounded = run("new " + name + "({[Symbol.iterator](){return {next(){return {done:false,value:" + (name === "WeakMap" ? "[{},1]" : "{}") + "}}}}});", new Realm((_line: string) => {}, "script"), 300);
    if (bounded.type !== "throw" || bounded.origin.kind !== "resource-limit") throw new Error("bounded constructor");
    checks++;
}
console.log("weak-collection boundaries:", checks, "checks passed");
