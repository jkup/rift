import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse, auditBoundedScriptNumericAssignments } from "../src/parser.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string, realm = new Realm((_line: string) => {}, "script")) {
    const p = prepareBoundedScript({ id: "new-target", text }, realm);
    if (p.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: 100000, maxCalls: 64 }), p.record)
        .completion;
}
for (const text of [
    "function F(){return new.target}F()===undefined&&new F()===F",
    "function F(a=new.target){return a}F()===undefined&&new F()===F",
    "function F(){return ()=>new.target}new F()()===F&&F()()===undefined",
    "function F(){return ()=>()=>new.target}new F()()()===F",
    "function F(){function g(){return new.target}this.v=g()}new F().v===undefined",
    "function F(){return eval('new.target')}F()===undefined&&new F()===F",
    "function F(){return ()=>eval('new.target')}new F()()===F",
    "function F(){return eval('()=>new.target')}new F()()===F",
    "function F(){return eval('eval(\"new.target\")')}new F()===F",
    "function F(){return new.target}var B=F.bind(null),C=B.bind(null);new B()===F&&new C()===F&&B()===undefined",
    "class C{constructor(){return new.target}}new C()===C",
    "class C{m(){return new.target}static m(){return new.target}}new C().m()===undefined&&C.m()===undefined",
    "var o={m(){return new.target},get x(){return new.target}};o.m()===undefined&&o.x===undefined",
    "var F=Function('return new.target');F()===undefined&&new F()===F",
    "function F(){class C{[new.target.name](){return 7}}return C}var C=new F();new C().F()===7",
    "function F(){return new.target}F.toString()==='function F(){return new.target}'",
    "function F(){try{eval('new.target;42=1')}catch(e){return e instanceof SyntaxError}}F()",
    "function F(){try{eval('new.target;1_;')}catch(e){return e instanceof SyntaxError}}F()",
    "function F(){try{eval('new.target;if(false) let x;')}catch(e){return e instanceof SyntaxError}}F()",
    "function F(){try{eval('new.target;function g(a,a){\"use strict\";}')}catch(e){return e instanceof SyntaxError}}F()",
]) {
    const r = run(text);
    check(r.type === "normal" && r.value.kind === "boolean" && r.value.value, text);
}
for (const text of [
    "new.target",
    "function F(){};new.target",
    "class C{m(){}};()=>new.target",
    "()=>new.target",
    "(a=new.target)=>a",
    "class C{[new.target](){}}",
    "function F(){new.other}",
    "function F(){new.target=1}",
]) {
    check(
        prepareBoundedScript(
            { id: "invalid-new-target", text },
            new Realm((_line: string) => {}, "script"),
        ).kind !== "ready",
        text,
    );
}
for (const text of [
    "eval('new.target')",
    "(()=>eval('new.target'))()",
    "function F(){return (0,eval)('new.target')}new F()",
    "function F(){this.v=Function('return ()=>new.target')()()}new F().v",
]) {
    const r = run(text);
    if (text.includes("Function(")) {
        check(
            r.type === "normal" && r.value.kind === "undefined",
            "Function does not inherit constructor target",
        );
    } else {
        check(
            r.type === "throw" && r.origin.kind === "unsupported-operation",
            "eval does not inherit an unavailable function context",
        );
    }
}
check(parse("function F(){return new.target}").error !== null, "legacy parser boundary");
check(
    auditBoundedScriptNumericAssignments("new.target;42=1").kind === "blocked",
    "outside-function audit veto",
);
check(
    auditBoundedScriptNumericAssignments("new.target;42=1", false, true).kind === "eligible",
    "context retained by numeric audit",
);
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
const f = run("function F(){return ()=>new.target}F", owner);
if (f.type !== "normal") {
    throw new Error("foreign setup");
}
caller.defineScriptGlobal("F", { value: f.value });
const result = run("new F()()===F", caller);
check(
    result.type === "normal" && result.value.kind === "boolean" && result.value.value,
    "foreign constructor target",
);
console.log("New target passed");
