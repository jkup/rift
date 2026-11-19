import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function run(text: string, realm = fresh(), steps = 20000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "object-methods", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + prepared.kind + " " + text);
    }
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "restored session");
    return result;
}
function passes(text: string): void {
    const result = run(text);
    check(
        result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
        text,
    );
}
for (const prefix of ["", "'use strict';"]) {
    for (const text of [
        "var o={x:2,m(a){return this.x+a;}};o.m(3)===5&&o.m.name==='m'&&o.m.length===1;",
        "var o={get x(){return this.y;},set x(v){this.y=v;}};o.x=7;o.x===7;",
        "var o={set x(v){this.y=v;},get x(){return this.y;}};o.x=7;o.x===7;",
        "var o={get:1,set:2};o.get===1&&o.set===2;",
        "var o={get(){return 1;},set(v){return v;}};o.get()===1&&o.set(2)===2;",
        "var o={get 'x y'(){return 3;},get 12(){return 4;},'z z'(){return 5;},16(){return 6;}};o['x y']===3&&o[12]===4&&o['z z']()===5&&o[16]()===6&&o[16].name==='16';",
        "var o={get x(){return 1;},get x(){return 2;},set x(v){this.y=v;}};o.x=3;o.x===2&&o.y===3;",
        "var o={get x(){return 1;},x:2};var d=Object.getOwnPropertyDescriptor(o,'x');d.value===2&&d.writable&&d.get===undefined;",
        "var o={x:1,get x(){return 2;}};var d=Object.getOwnPropertyDescriptor(o,'x');o.x===2&&d.set===undefined&&d.value===undefined;",
        "var o={get x(){return 1;},x(){return 2;}};o.x()===2;",
        "var o={set x(v){throw 9;},x:2,get x(){return 3;}};Object.getOwnPropertyDescriptor(o,'x').set===undefined;",
        "var o={get x(){return 1;},set x(v){}};var d=Object.getOwnPropertyDescriptor(o,'x');d.enumerable&&d.configurable&&d.get.name==='get x'&&d.set.name==='set x'&&d.get.length===0&&d.set.length===1;",
        "var o={m(){}};var d=Object.getOwnPropertyDescriptor(o,'m');d.writable&&d.enumerable&&d.configurable&&!o.m.hasOwnProperty('prototype');",
        "var o={get x(){return 1;},set x(v){}};var d=Object.getOwnPropertyDescriptor(o,'x');!d.get.hasOwnProperty('prototype')&&!d.set.hasOwnProperty('prototype');",
        "var o={__proto__(){return 1;}};o.hasOwnProperty('__proto__')&&o.__proto__()===1&&Object.getPrototypeOf(o)===Object.prototype;",
        "var o={get __proto__(){return 7;}};o.__proto__===7&&Object.getPrototypeOf(o)===Object.prototype;",
        "function f(){let x=3;return {m(){return ++x;},get x(){return x;},set x(v){x=v;}};}var o=f();o.m()===4&&(o.x=7)===7&&o.x===7;",
        "var x=9;var o={x(){return x;}};o.x()===9;",
        "var o={get x(){throw 7;}};var ok=false;try{o.x;}catch(e){ok=e===7;}ok;",
        "var o={set x(v){throw v;}};var ok=false;try{o.x=7;}catch(e){ok=e===7;}ok;",
        "var o={x:1,get y(){return this.x;},set y(v){this.x=v;}};o.y++;o.y+=3;o.x===5;",
        "var p={get x(){return this.y;},set x(v){this.y=v;}};var o=Object.create(p);o.x=4;o.x===4&&!p.hasOwnProperty('y');",
    ]) {
        passes(prefix + text);
    }
    for (const expression of [
        "o.m",
        "Object.getOwnPropertyDescriptor(o,'x').get",
        "Object.getOwnPropertyDescriptor(o,'x').set",
    ]) {
        passes(
            prefix +
                "var o={m(){throw 9;},get x(){throw 9;},set x(v){throw 9;}};var f=" +
                expression +
                ";var ok=false;try{new f();}catch(e){ok=e instanceof TypeError;}ok;",
        );
    }
}
passes("var o={m(){return this;}};var f=o.m;f()===this;");
passes("'use strict';var o={m(){return this;}};var f=o.m;f()===undefined;");
passes("var o={m(){'use strict';return this;}};var f=o.m;f()===undefined;");
passes(
    "var o={m /* a */ (x) { return x; },get x() { return 1; }};o.m.toString()==='m /* a */ (x) { return x; }'&&Object.getOwnPropertyDescriptor(o,'x').get.toString()==='get x() { return 1; }';",
);
passes("var o={get\nx(){return 1;}};o.x===1;");
for (const text of [
    "({get x(v){}});",
    "({set x(){}});",
    "({set x(a,b){}});",
    "({m(a,a){}});",
    "({get x:1});",
    "({[x](){}});",
    "({m(){return super.x;}});",
    "({async m(){}});",
    "({*m(){}});",
    "({x});",
    "({__proto__:null});",
]) {
    const realm = fresh();
    const prepared = prepareBoundedScript(
        { id: "invalid", text: "var untouched=1;" + text },
        realm,
    );
    if (
        text === "({async m(){}});" ||
        text === "({*m(){}});" ||
        text === "({__proto__:null});" ||
        text === "({x});" ||
        text === "({[x](){}});" ||
        text === "({m(){return super.x;}});"
    ) {
        check(prepared.kind === "ready", "supported method preparation is inert");
    } else {
        check(prepared.kind !== "ready", "reject " + text);
    }
    const result = run("typeof untouched==='undefined';", realm);
    check(
        result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
        "inert rejection",
    );
}
check(run("({[x](){}});", fresh()).type === "throw", "computed method reads its key at runtime");
check(
    run("({m(){return super.x;}});", fresh()).type === "normal",
    "original super property literal executes",
);
passes("({*m(){}}).m().next().done;");
passes("({async m(){}}).m() instanceof Promise;");
check(parse("({m(){}});").error !== null, "legacy method boundary");
const owner = fresh(),
    caller = fresh();
const method = run("({m(){return [];}}).m;", owner);
if (method.type === "normal") {
    caller.defineScriptGlobal("f", { value: method.value });
}
const array = run("f();", caller);
check(
    array.type === "normal" &&
        array.value.kind === "object" &&
        array.value.object.getPrototypeOf() === owner.arrayPrototype,
    "method Realm",
);
const result = run("var o={get x(){return this.x;}};o.x;", fresh(), 100);
check(
    result.type === "throw" && result.origin.kind === "resource-limit",
    "bounded recursive getter",
);
console.log("Object methods passed");
