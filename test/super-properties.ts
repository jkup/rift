import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string, realm = new Realm((_line: string) => {}, "script")) {
    const p = prepareBoundedScript({ id: "super-properties", text }, realm);
    if (p.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: 20000, maxCalls: 32 }), p.record)
        .completion;
}
function truth(text: string, realm = new Realm((_line: string) => {}, "script")): void {
    const r = run(text, realm);
    check(r.type === "normal" && r.value.kind === "boolean" && r.value.value, text);
}
for (const text of [
    "class B{m(){return this.x}}class D extends B{constructor(){super();this.x=7}m(){return super.m()+1}}new D().m()===8",
    "class B{static m(){return this.x}}class D extends B{static m(){return super.m()}}D.x=7;D.m()===7",
    "class B{get x(){return this.y}set x(v){this.y=v}}class D extends B{m(){super.x=7;return super.x}}var d=new D();d.m()===7&&d.y===7&&!d.hasOwnProperty('x')",
    "var p={m(){return this.x}},o={m(){return super.m()}};Object.setPrototypeOf(o,p);o.x=7;o.m()===7",
    "var p={get x(){return this.y},set x(v){this.y=v}},o={get x(){return super.x},set x(v){super.x=v}};Object.setPrototypeOf(o,p);o.x=7;o.x===7&&o.y===7",
    "class B{m(){return this.x}}class D extends B{m(){return super.m()}}var o={x:7,m:D.prototype.m};o.m()===7",
    "class B{m(){return this.x}}class D extends B{m(){return super.m()}}D.prototype.m.bind({x:7})()===7",
    "class B{m(){return 1}}class D extends B{m(){return super.m()}}Object.setPrototypeOf(D.prototype,{m(){return 7}});new D().m()===7",
    "class B{static m(){return 1}}class D extends B{static m(){return super.m()}}Object.setPrototypeOf(D,{m(){return 7}});D.m()===7",
    "class B{get x(){return this.y}}class D extends B{m(){return ()=>super.x}}var d=new D();d.y=7;d.m()()===7",
    "class B{get x(){return this.y}}class D extends B{m(){return eval('super.x')}}var d=new D();d.y=7;d.m()===7",
    "class B{get x(){return this.y}}class D extends B{m(x=super.x){return x}}var d=new D();d.y=7;d.m()===7",
    "class B{get x(){return this.y}}class D extends B{constructor(){super();this.y=7;this.z=super.x}}new D().z===7",
    "var n=0;class B{}class D extends B{constructor(){try{super[(n++,'x')]}catch(e){if(!(e instanceof ReferenceError))throw e}super()}}new D();n===0",
    "var trace='',key={toString(){trace+='K';return 'x'}},p={set x(v){trace+='S';this.y=v}},o={m(){super[key]=(trace+='R',7)}};Object.setPrototypeOf(o,p);o.m();trace==='RKS'&&o.y===7",
    "var trace='',key={toString(){trace+='K';return 'x'}},p={get x(){trace+='G';return 1},set x(v){trace+='S';this.y=v}},o={m(){super[key]+=(trace+='R',6)}};Object.setPrototypeOf(o,p);o.m();trace==='KGRS'&&o.y===7",
    "var n=0,key={toString(){n++;return 'x'}},p={x:6},o={m(){return super[key]++}};Object.setPrototypeOf(o,p);o.m()===6&&o.x===7&&p.x===6&&n===1",
    "var p={x:1},q={x:7},o={m(){return super[(Object.setPrototypeOf(o,q),'x')]}};Object.setPrototypeOf(o,p);o.m()===7",
    "var p={set x(v){this.y=1}},q={set x(v){this.y=2}},o={m(){super.x=(Object.setPrototypeOf(o,q),7)}};Object.setPrototypeOf(o,p);o.m();o.y===1",
    "var n=0,key={toString(){n++;return 'x'}},o={m(){return super[key]}};Object.setPrototypeOf(o,null);var caught=false;try{o.m()}catch(e){caught=e instanceof TypeError}caught&&n===0",
    "var n=0,key={toString(){n++;return 'x'}},o={m(){delete super[key]}};var caught=false;try{o.m()}catch(e){caught=e instanceof ReferenceError}caught&&n===0",
    "var p={},o={m(){super.x=7}};Object.defineProperty(p,'x',{value:1});Object.setPrototypeOf(o,p);o.m();o.x===1&&!o.hasOwnProperty('x')",
    "var p={},o={m(){'use strict';super.x=7}};Object.defineProperty(p,'x',{value:1});Object.setPrototypeOf(o,p);var caught=false;try{o.m()}catch(e){caught=e instanceof TypeError}caught&&!o.hasOwnProperty('x')",
    "class B{}class D extends B{m(){[super.x]=[7];return this.x}}new D().m()===7",
    "class B{}class D extends B{m(){({x:super.x}={x:7});return this.x}}new D().m()===7",
    "class B{}class D extends B{m(){for(super.x of [7]){}return this.x}}new D().m()===7",
    "class B{}class D extends B{m(){for(super.x in {a:1}){}return this.x}}new D().m()==='a'",
    "class B{m(){return this.x}}class D extends B{m(){return super.m?.()}}var d=new D();d.x=7;d.m()===7",
    "class B{}class D extends B{m(){return super.m?.()}}new D().m()===undefined",
    "class B{}class D extends B{m(){return typeof super.x}}new D().m()==='undefined'",
    "var p={C:function(){this.x=7}},o={m(){return new super.C()}};Object.setPrototypeOf(o,p);o.m().x===7",
    "class C{constructor(){this.x=super.toString()}}new C().x==='[object Object]'",
    "var p={x:7},o={m(){return ()=>eval('super.x')}};Object.setPrototypeOf(o,p);o.m()()===7",
]) {
    truth(text);
}
for (const invalid of ["42=1", "1_", "if(false) let x", 'function f(a,a){"use strict";}']) {
    truth(
        "var o={m(){try{eval('super.x;" +
            invalid +
            "')}catch(e){return e instanceof SyntaxError}}};o.m()",
    );
}
for (const text of [
    "var token={},key={toString(){throw token}},o={m(){return super[key]}};var caught=false;try{o.m()}catch(e){caught=e===token}caught",
    "var token={},n=0,key={toString(){n++;return 'x'}},o={m(){super[key]=(function(){throw token})()}};var caught=false;try{o.m()}catch(e){caught=e===token}caught&&n===0",
    "var p={get x(){'use strict';return this}},o={m(){'use strict';return super.x}};Object.setPrototypeOf(o,p);o.m.call(7)===7",
    "var seen,p={set x(v){'use strict';seen=this}},o={m(){'use strict';super.x=1}};Object.setPrototypeOf(o,p);o.m.call(7);seen===7",
    "var p={x:1},o={m(){'use strict';super.x=7}};Object.setPrototypeOf(o,p);var caught=false;try{o.m.call(3)}catch(e){caught=e instanceof TypeError}caught&&p.x===1",
    "class B{}class D extends B{m(){[...super.x]=[1,2];return this.x.join(',')}}new D().m()==='1,2'",
    "class B{}class D extends B{m(){({...super.x}={a:7});return this.x.a}}new D().m()===7",
    "class B{m(){return this}}class D extends B{m(){return (super.m)()}}var d=new D();d.m()===d",
]) {
    truth(text);
}
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
for (const [name, text] of [
    ["method", "var o={m(){return super.x}};Object.setPrototypeOf(o,null);o.m"],
    ["ForeignTypeError", "TypeError"],
]) {
    const result = run(text, owner);
    if (result.type !== "normal") {
        throw new Error("foreign method setup");
    }
    caller.defineScriptGlobal(name, { value: result.value });
}
truth(
    "var caught=false;try{method()}catch(e){caught=e instanceof ForeignTypeError&&!(e instanceof TypeError)}caught",
    caller,
);
const limited = run(
    "var p={get x(){while(true){}}},o={m(){try{return super.x}catch(e){return 7}}};Object.setPrototypeOf(o,p);o.m()",
);
check(
    limited.type === "throw" && limited.origin.kind === "resource-limit",
    "fatal inherited getter budget",
);
for (const text of [
    "super.x",
    "function f(){return super.x}",
    "class C{m(){function f(){return super.x}}}",
    "var o={m:function(){return super.x}}",
    "class C{m(){return super?.x}}",
    "class C{m(){super()}}",
]) {
    check(
        prepareBoundedScript(
            { id: "super-property-boundary", text },
            new Realm((_line: string) => {}, "script"),
        ).kind !== "ready",
        text,
    );
}
console.log("Super properties passed");
