import { Realm } from "../src/realm.js";
import { sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 50000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "function-constructor", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    try { return evaluateScript(session, prepared.record).completion; }
    finally { check(session.inspect().active === null && session.inspect().calls === 0, "restored session"); }
}
function expect(result: ValueCompletion, expected: Value, label: string): void {
    check(result.type === "normal" && sameValue(result.value, expected), label);
}
function passes(text: string): void {
    for (const prefix of ["", "'use strict';"])
        expect(run(prefix + text), { kind: "boolean", value: true }, text);
}
function expose(realm: Realm, name: string, result: ValueCompletion): void {
    if (result.type !== "normal") throw new Error("expose " + name);
    realm.defineScriptGlobal(name, { value: result.value });
}

passes("Function()()===undefined&&(new Function())()===undefined;");
passes("Function('return 7;')()===7&&new Function('a','b','return a+b;')(2,3)===5;");
passes("Function('a,b','c','return a+b+c;')(1,2,3)===6;");
passes("var f=Function('a','b','return a+b;');f.name==='anonymous'&&f.length===2&&typeof f==='function';");
passes("var f=Function('a','return a;');f.toString()==='function anonymous(a\\n) {\\nreturn a;\\n}';");
passes("Object.getPrototypeOf(Function)===Function.prototype&&Function.prototype.constructor===Function&&Function.prototype()===undefined;");
passes("Function.name==='Function'&&Function.length===1&&Function instanceof Function&&Function() instanceof Function;");
passes("var f=Function();Object.getPrototypeOf(f)===Function.prototype&&Object.getPrototypeOf(f.prototype)===Object.prototype&&f.prototype.constructor===f;");
passes("var d=Object.getOwnPropertyDescriptor(Function,'prototype');!d.writable&&!d.enumerable&&!d.configurable;");
passes("var d=Object.getOwnPropertyDescriptor(Function.prototype,'constructor');d.value===Function&&d.writable&&!d.enumerable&&d.configurable;");
passes("var f=Function('a','return a;');var l=Object.getOwnPropertyDescriptor(f,'length');var n=Object.getOwnPropertyDescriptor(f,'name');!l.writable&&!l.enumerable&&l.configurable&&!n.writable&&!n.enumerable&&n.configurable;");
passes("Function.toString()==='function Function() { [native code] }';");
passes("var C=Function('x','this.x=x;');var x=new C(7);x.x===7&&x instanceof C;");
passes("var maker=Function.bind(null,'a','return a+1;');maker()(3)===4&&(new maker())(3)===4;");
passes("var x=7;function make(){var x=9;return Function('return x;');}var f=make();x=11;f()===11;");
passes("let x=7;function make(){let hidden=9;return Function('return x+typeof hidden;');}make()()==='7undefined';");
passes("var anonymous=23;var f=Function('return anonymous;');f()===23&&anonymous===23;");
passes("var f=Function();!this.hasOwnProperty('anonymous');");
passes("var global=this;Function('return this;')()===global&&Function('\"use strict\";return this;')()===undefined;");
passes("var hit=false;var f=Function('hit=true;return 7;');!hit&&f()===7&&hit;");
passes("var f=Function('var local=3;function inner(){return local;}return inner;');f()()===3&&typeof local==='undefined';");
passes("var trace='';var a={toString(){trace+='a';return 'x';}};var b={toString(){trace+='b';return 'return x;';}};var f=Function(a,b);trace==='ab'&&f(9)===9;");
passes("var x={};x[Symbol.toPrimitive]=function(hint){if(hint!=='string')throw 9;return 'return 7;';};Function(x)()===7;");
passes("var hit=false;var ok=false;try{Function({toString(){throw 7;}},{toString(){hit=true;return '';}});}catch(e){ok=e===7;}ok&&!hit;");
passes("var hit=false;var ok=false;try{Function('?',{toString(){hit=true;throw 7;}});}catch(e){ok=e===7;}ok&&hit;");
passes("var ok=false;try{Function(Symbol());}catch(e){ok=e instanceof TypeError;}ok;");
passes("var ok=false;try{Function('a','let a;');}catch(e){ok=e instanceof SyntaxError;}ok;");
passes("var ok=false;try{Function('let x;let x;');}catch(e){ok=e instanceof SyntaxError;}ok;");
passes("Function('a//comment','return a;')(7)===7&&Function('return 8;//comment')()===8;");

for (const args of [
    "'a=1','return a;'", "'/*','*/return 1;'", "'a){}function injected(b','return 1;'", "'return 1;} var injected=7; function tail(){'",
]) {
    const realm = fresh();
    check(run("var caught=false;var after=false;", realm).type === "normal", "setup source rejection");
    const result = run("try{Function(" + args + ");after=true;}catch(e){caught=e instanceof SyntaxError;}", realm);
    if (result.type === "throw") {
        check(result.origin.kind === "unsupported-operation" && result.origin.capabilityCode === "runtime.dynamic-function-source", "explicit unsupported dynamic source");
        expect(run("caught;", realm), { kind: "boolean", value: false }, "unsupported source is fatal");
    } else {
        expect(run("caught;", realm), { kind: "boolean", value: true }, "certified invalid boundary is catchable");
    }
    expect(run("after;", realm), { kind: "boolean", value: false }, "no successful construction");
    expect(run("typeof injected;", realm), { kind: "string", value: "undefined" }, "no injected globals");
}
{
    const owner = fresh(), caller = fresh();
    expose(caller, "F", run("var secret=17;Function;", owner));
    expose(caller, "ownerGlobal", run("this;", owner));
    expose(caller, "ownerPrototype", { type: "normal", value: { kind: "object", object: owner.functionPrototype } });
    expect(run("var secret=99;var f=F('return secret;');f()===17&&Object.getPrototypeOf(f)===ownerPrototype&&F('return this;')()===ownerGlobal;", caller), { kind: "boolean", value: true }, "defining Realm global scope");
    const error = run("F(Symbol());", caller);
    check(error.type === "throw" && error.value.kind === "object" && error.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "constructor error Realm");
    const syntax = run("F('let x;let x;');", caller);
    check(syntax.type === "throw" && syntax.value.kind === "object" && syntax.value.object.getPrototypeOf() === owner.getErrorPrototype("SyntaxError"), "syntax error Realm");
    const target = run("F('return missing;')();", caller);
    check(target.type === "throw" && target.value.kind === "object" && target.value.object.getPrototypeOf() === owner.getErrorPrototype("ReferenceError"), "dynamic body error Realm");
}
{
    const realm = fresh();
    realm.defineScriptGlobal("source", { value: { kind: "string", value: " ".repeat(1000) + "return 7;" } });
    const result = run("Function(source);", realm, 50);
    check(result.type === "throw" && result.origin.kind === "resource-limit" && result.origin.guardCode === "steps", "bounded parsing budget");
    realm.defineScriptGlobal("oversize", { value: { kind: "string", value: " ".repeat(100001) } });
    const large = run("Function(oversize);", realm);
    check(large.type === "throw" && large.origin.kind === "resource-limit" && large.origin.guardCode === "source-units", "bounded source size");
    const execution = run("Function('while(true){}')();", realm, 500);
    check(execution.type === "throw" && execution.origin.kind === "resource-limit", "dynamic execution uses active budget");
}
const legacy = new Realm((_line: string) => {});
passes("Function('return ()=>1;')()()===1;");
passes("Function('...a','return 1;')(2,3)===1;");
check(legacy.functionPrototype.getOwnProperty("constructor") === undefined && !legacy.global.bindings.has("Function"), "legacy unchanged");
console.log("Function constructor passed");
