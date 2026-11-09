import { Realm } from "../src/realm.js";
import { sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 50000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "rest-parameters", text }, realm);
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

passes("function f(...a){return a;}Array.isArray(f())&&f().length===0&&f(1,2,3).join(',')==='1,2,3';");
passes("function f(a,b,...c){return [a,b,c];}var r=f(1);r[0]===1&&r[1]===undefined&&r[2].length===0;");
passes("function f(a,b,...c){return c;}f(1,2,3,4).join(',')==='3,4'&&f(1,2).length===0;");
passes("var f=function(x,...a){return a;},g=(x,...a)=>a;f(1,2,3).join(',')==='2,3'&&g(1,2,3).join(',')==='2,3';");
passes("var o={f(x,...a){return this.x+a.length;},x:7};o.f(0,1,2)===9&&o.f.length===1;");
passes("var o={f(...a){return ()=>this.x+a[0];},x:7};o.f(3)()===10;");
passes("function f(...a){return a;}f()!==f()&&f(1)!==f(1)&&Object.getPrototypeOf(f())===Array.prototype;");
passes("function f(...a){return a;}var o={},s=Symbol();var a=f(undefined,null,o,s);a.length===4&&a.hasOwnProperty('0')&&a[0]===undefined&&a[1]===null&&a[2]===o&&a[3]===s;");
passes("function f(x,...a){x=9;a[0]=8;return a;}var input=[1,2,3];var out=f(...input);out.join(',')==='8,3'&&input.join(',')==='1,2,3';");
passes("function f(...a){return a;}var a=f(7);var d=Object.getOwnPropertyDescriptor(a,'0');d.value===7&&d.writable&&d.enumerable&&d.configurable&&a.length===1;");
passes("function f(...a){return a;}function g(a,b,...c){}var h=(a,...b)=>b;f.length===0&&g.length===2&&h.length===1&&f.toString()==='function f(...a){return a;}';");
passes("function f(...a){return a;}f.call(null,1,2).join(',')==='1,2'&&f.apply(null,[3,4]).join(',')==='3,4'&&f.bind(null,5)(6).join(',')==='5,6';");
passes("function C(x,...a){this.x=x;this.a=a;}var c=new C(1,2,3);c instanceof C&&c.x===1&&c.a.join(',')==='2,3';");
passes("function f(...a){var a;return a;}f(1,2).length===2;");
passes("function f(...a){function a(){return 9;}return a();}f(1,2)===9;");
passes("function f(...a){return ()=>a;}f(1,2)().join(',')==='1,2';");
passes("Function('x','...a','return a;')(1,2,3).join(',')==='2,3'&&Function('...a','return a;').length===0;");
passes("var f=(...a)=>a;f.length===0&&!f.hasOwnProperty('prototype')&&f(1,2).length===2;");
expect(run("function f(...a){'use\\x20strict';return a;}f(1).length===1;"), { kind: "boolean", value: true }, "escaped directive remains sloppy");
expect(run("function f(...a){('use strict');return a;}f(1).length===1;"), { kind: "boolean", value: true }, "parenthesized string is not a directive");
passes("function f(...a){var x=1;'use strict';return a;}f(1).length===1;");
passes("var f=(...a)=>'use strict';f()==='use strict';");
passes("var effects=0;Object.defineProperty(Array.prototype,'0',{set(v){effects++;},configurable:true});function f(...a){return a;}var a=f(7);delete Array.prototype[0];effects===0&&a[0]===7;");

for (const text of [
    "function f(...a,b){}", "function f(...a,){}", "function f(...a=[]){}", "function f(...a,...b){}",
    "function f(a,...a){}", "function f(a,a,...b){}", "function f(...a){'use strict';}",
    "function f(...a){'other';'use strict';}", "function f(...a){let a;}", "function f(...[a]){}",
    "(...a,b)=>a;", "(...a,)=>a;", "(...a=[])=>a;", "(a,...a)=>a;", "(...a)=>{'use strict';};",
    "var o={set x(...a){}};", "var o={get x(...a){}};", "var o={f(...a){'use strict';}};",
]) {
    const realm = fresh();
    check(prepareBoundedScript({ id: "invalid-rest", text: "var effect=1;" + text }, realm).kind !== "ready", "reject: " + text);
    expect(run("typeof effect;", realm), { kind: "string", value: "undefined" }, "whole-source rejection");
}
{
    const owner = fresh(), caller = fresh();
    expose(caller, "f", run("function f(...a){return a;}f;", owner));
    expose(caller, "prototype", { type: "normal", value: { kind: "object", object: owner.arrayPrototype } });
    expect(run("Object.getPrototypeOf(f(1,2))===prototype&&f(1,2).length===2;", caller), { kind: "boolean", value: true }, "defining Realm array");
}
{
    const realm = fresh();
    run("var entered=false;var input=[];for(var i=0;i<500;i++){input.push(i);}function f(...a){entered=true;return a;}", realm);
    // Bind captures arguments before the limited invocation, isolating rest copying from argument evaluation.
    run("var bound=f.bind(null,...input);", realm);
    const result = run("bound();", realm, 800);
    check(result.type === "throw" && result.origin.kind === "resource-limit", "bounded rest copy");
    expect(run("entered;", realm), { kind: "boolean", value: false }, "rest exhaustion precedes body");
}
check(parse("function f(...a){}").error !== null, "legacy rest unchanged");
console.log("Rest parameters passed");
