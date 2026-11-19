import { Realm } from "../src/realm.js";
import { sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 50000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "arrows", text }, realm);
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

passes("var a=x=>x*2,b=(x)=>x*3,c=(x,y)=>x+y,d=()=>7; a(4)===8&&b(4)===12&&c(3,4)===7&&d()===7;");
passes("var f=(x,y,)=>{var z=x*y;return z;};f(3,5)===15&&(()=>{})()===undefined;");
passes("var f=x=>{x+1;};f(2)===undefined&&(()=>({x:4}))().x===4;");
passes("var f=a=>b=>a+b;f(3)(4)===7&&[1,2,3].map(x=>x*2).join(',')==='2,4,6';");
passes("var x=0,f=()=>++x; x===0&&f()===1&&f()===2;");
passes("var f=()=>this;f()===this&&f.call(null)===this&&f.apply(4,[])===this&&f.bind({})()===this;");
passes("var o={x:7,m(){return ()=>this.x;}};var f=o.m();f.call({x:9})===7;");
passes("function f(){'use strict';return ()=>this;}f.call(7).call({})===7&&f.call(null)()===null&&f()()===undefined;");
expect(run("function f(){return ()=>this;}var o={};f.call(o)()===o&&f()()===this&&f.call(3)().valueOf()===3;"), { kind: "boolean", value: true }, "sloppy outer receiver");
passes("function f(){return ()=>()=>this;}var o={};f.call(o)()()===o;");
passes("var o={m(){let x=3;{let y=4;return ()=>this.v+x+y;}},v:5};o.m()()===12;");
passes("var f=(a)=>{let x=a;return ()=>++x;};var g=f(4);g()===5&&g()===6;");
passes("var f=()=>{var x=3;return x;};f()===3&&typeof x==='undefined';");
passes("var f=x=>x;f.name==='f'&&f.length===1&&f.toString()==='x=>x'&&Object.getPrototypeOf(f)===Function.prototype&&!f.hasOwnProperty('prototype');");
passes("var o={f:()=>1};var f;f=()=>2;o.f.name==='f'&&f.name==='f';");
passes("var f=()=>1,ok=false;try{new f();}catch(e){ok=e instanceof TypeError;}ok;");
passes("var f=(()=>1).bind(null),ok=false;try{new f();}catch(e){ok=e instanceof TypeError;}ok&&!f.hasOwnProperty('prototype');");
passes("var f=()=>1,ok=false;try{({}) instanceof f;}catch(e){ok=e instanceof TypeError;}ok;");
passes("var f=()=>{try{throw 7;}catch(e){return e;}},g=()=>{try{return 2;}finally{return 3;}};f()===7&&g()===3;");
passes("var f=()=>{while(true){break;}return 4;};f()===4;");
passes("var x=0;var f=()=>{return x;},g=()=>++x;g()===1&&f()===1;");
passes("var x=0;var f=(x=1,()=>x);f()===1;");
passes("var f=()=>true?1:2;var g=true?()=>3:()=>4;f()===1&&g()===3;");
passes("var f=()=>1; (f,()=>2)()===2&&[()=>3,()=>4][1]()===4;");
passes("var f=()=>`x${2}`;f()==='x2'&&`${(()=>3)()}`==='3';");
passes("Function('return ()=>this;')()()===Function('return this;')();");
expect(run("var f=()=>{'use strict';return missing=3;};var ok=false;try{f();}catch(e){ok=e instanceof ReferenceError;}ok;"), { kind: "boolean", value: true }, "own strict block");
expect(run("var f=()=> 'use strict';f();implicit=3;implicit===3;"), { kind: "boolean", value: true }, "expression body is not a directive");
passes("var f=(x /* comment */)=>\nx;f(3)===3;");

for (const text of [
    "x\n=>x;", "(x)/*\n*/=>x;", "(a,a)=>a;",
    "async x=>x;", "var f=()=>arguments;", "()=>super.x;", "()=>new.target;", "1+x=>x;",
    "new ()=>1;", "()=>{}.x;", "()=>{}();", "()=>{}+1;", "((x))=>x;", "(x+y)=>x;",
    "while(true){var f=()=>{break;};}", "while(true){var f=()=>{continue;};}",
    "(x)=>{let x;};", "()=>{const x=1;var x;};",
]) {
    const realm = fresh();
    const prepared = prepareBoundedScript({ id: "invalid-arrow", text: "var effect=1;" + text }, realm);
    if (text === "async x=>x;") {
        check(prepared.kind === "ready", "async arrow prepares");
        expect(run("typeof effect;", realm), { kind: "string", value: "undefined" }, "async arrow preparation is inert");
        passes("(async x=>x)(7) instanceof Promise;");
        continue;
    }
    if (text === "var f=()=>arguments;") {
        check(prepared.kind === "ready", "arguments arrow prepares");
        expect(run("typeof effect;", realm), { kind: "string", value: "undefined" }, "arguments preparation is inert");
        expect(run(text + "var caught=false;try{f();}catch(e){caught=e instanceof ReferenceError;}caught;", realm),
            { kind: "boolean", value: true }, "top-level arrow has no implicit arguments");
        continue;
    }
    check(prepared.kind !== "ready", "rejected whole source: " + text);
    expect(run("typeof effect;", realm), { kind: "string", value: "undefined" }, "no preparation execution");
}
{
    const owner = fresh(), caller = fresh();
    expose(caller, "f", run("var secret=17;()=>[this,secret];", owner));
    expose(caller, "ownerGlobal", run("this;", owner));
    expose(caller, "ownerPrototype", { type: "normal", value: { kind: "object", object: owner.functionPrototype } });
    expect(run("var secret=99;f.call(this)[0]===ownerGlobal&&f()[1]===17&&Object.getPrototypeOf(f)===ownerPrototype;", caller), { kind: "boolean", value: true }, "defining Realm capture");
    expose(caller, "fail", run("()=>missing;", owner));
    const result = run("fail();", caller);
    check(result.type === "throw" && result.value.kind === "object" && result.value.object.getPrototypeOf() === owner.getErrorPrototype("ReferenceError"), "arrow error Realm");
}
const exhausted = run("var f=()=>f();f();", fresh(), 5000);
const rest = run("(...a)=>a;");
const defaulted = run("(a=1)=>a;");
check(defaulted.type === "normal" && defaulted.value.kind === "object" && defaulted.value.object.callable?.kind === "script-guest", "default arrow materializes");
passes("var f=(a=1)=>a;f()===1&&f(3)===3&&f.length===0;");
check(rest.type === "normal" && rest.value.kind === "object" && rest.value.object.callable?.kind === "script-guest", "rest arrow prepares and materializes");
passes("var f=(...a)=>a;Array.isArray(f())&&f(1,2).join(',')==='1,2';");
check(exhausted.type === "throw" && exhausted.origin.kind === "resource-limit", "recursive arrows bounded");
const loop = run("var f=()=>{while(true){}};f();", fresh(), 500);
check(loop.type === "throw" && loop.origin.kind === "resource-limit", "arrow loop bounded");
check(parse("x=>x;").error !== null, "legacy grammar unchanged");
passes("var f=({a})=>a;f({a:7})===7;");
console.log("Arrow functions passed");
