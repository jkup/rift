import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { normal, sameValue, type ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string, realm = new Realm((_line: string) => {}, "script")) {
    const p = prepareBoundedScript({ id: "explicit-derived", text }, realm);
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
    "class B{constructor(x){this.x=x;this.nt=new.target}}class D extends B{constructor(x){super(x+1);this.y=2}}var d=new D(6);d.x===7&&d.y===2&&d.nt===D&&d instanceof B&&d instanceof D",
    "class B{}class D extends B{constructor(){var caught=false;try{this}catch(e){caught=e instanceof ReferenceError}super();this.caught=caught}}new D().caught",
    "class B{}class D extends B{constructor(){}}var caught=false;try{new D()}catch(e){caught=e instanceof ReferenceError}caught",
    "class B{}class D extends B{constructor(){return undefined}}var caught=false;try{new D()}catch(e){caught=e instanceof ReferenceError}caught",
    "class B{}class D extends B{constructor(){return 7}}var caught=false;try{new D()}catch(e){caught=e instanceof TypeError}caught",
    "class B{}class D extends B{constructor(){super();return 7}}var caught=false;try{new D()}catch(e){caught=e instanceof TypeError}caught",
    "var token={};class B{constructor(){throw 1}}class D extends B{constructor(){return token}}new D()===token",
    "class D extends null{constructor(){return Object.create(new.target.prototype)}}var d=new D();d instanceof D&&Object.getPrototypeOf(D.prototype)===null",
    "var n=0;class B{constructor(){this.n=++n}}class D extends B{constructor(){super();try{super()}catch(e){this.caught=e instanceof ReferenceError}}}var d=new D();d.n===1&&d.caught&&n===2",
    "class B{constructor(x){this.x=x}}class D extends B{constructor(){var f=()=>this;super(7);this.f=f}}var d=new D();d.f()===d&&d.x===7",
    "class B{}class D extends B{constructor(){var f=()=>7;var x=f();(()=>super())();this.x=x}}new D().x===7",
    "class B{}class D extends B{constructor(){var f=()=>this,caught=false;try{f()}catch(e){caught=e instanceof ReferenceError}super();this.caught=caught}}new D().caught",
    "class B{constructor(x){this.x=x}}class D extends B{constructor(x=super(7)){this.same=x===this}}var d=new D();d.x===7&&d.same",
    "class B{}class D extends B{constructor(x=this){super()}}var caught=false;try{new D()}catch(e){caught=e instanceof ReferenceError}caught",
    "class B{constructor(){this.nt=new.target}}class D extends B{constructor(){eval('super()');this.same=eval('this')===this}}function N(){}var d=Reflect.construct(D,[],N);d instanceof N&&d.nt===N&&d.same",
    "class B{}class D extends B{constructor(){var f=()=>eval('super()');f();this.x=7}}new D().x===7",
    "class B{}class D extends B{constructor(){eval(\"eval('super()')\");this.x=7}}new D().x===7",
    "var trace='';class B{constructor(){trace+='B'}}class C{constructor(){trace+='C'}}class D extends B{constructor(){super((Object.setPrototypeOf(D,C),trace+='A'))}}new D();trace==='AB'",
    "var trace='';class B{}class D extends B{constructor(){super((trace+='A'))}}Object.setPrototypeOf(D,null);try{new D()}catch(e){trace+=e instanceof TypeError?'T':'X'}trace==='AT'",
    "var token={};class B{}class D extends B{constructor(){super((function(){throw token})())}}Object.setPrototypeOf(D,null);var caught=false;try{new D()}catch(e){caught=e===token}caught",
    "class D extends Array{constructor(...xs){super(...xs);this.x=7}}var d=new D(1,2);Array.isArray(d)&&d.length===2&&d[1]===2&&d.x===7&&d instanceof D",
    "class D extends Map{constructor(){super([[1,7]])}}new D().get(1)===7",
    "class B{constructor(){return {x:7}}}class D extends B{constructor(){super();this.y=8}}var d=new D();d.x===7&&d.y===8&&!(d instanceof D)",
    "var f;class B{}class D extends B{constructor(){f=()=>this;return {}}}new D();var caught=false;try{f()}catch(e){caught=e instanceof ReferenceError}caught",
    "var f;class B{constructor(){this.x=7}}class D extends B{constructor(){f=()=>super();return {}}}new D();var d=f(),caught=false;try{f()}catch(e){caught=e instanceof ReferenceError}d.x===7&&d instanceof D&&caught",
    "class B{}class D extends B{constructor(){super();return undefined}}new D() instanceof D",
    "class B{}class D extends B{constructor(){var f=()=>()=>this;super();this.f=f()}}var d=new D();d.f()===d",
]) {
    truth(text);
}
for (const invalid of ["42=1", "1_", "if(false) let x", 'function f(a,a){"use strict";}']) {
    truth(
        "class B{}class D extends B{constructor(){var caught=false;try{eval('super();" +
            invalid +
            "')}catch(e){caught=e instanceof SyntaxError}super();this.caught=caught}}new D().caught",
    );
}
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
for (const [name, text] of [
    ["Primitive", "(class extends Object{constructor(){return 7}})"],
    ["Missing", "(class extends Object{constructor(){}})"],
    ["Early", "(class extends Object{constructor(){this}})"],
    ["ForeignReferenceError", "ReferenceError"],
    ["ForeignTypeError", "TypeError"],
]) {
    const result = run(text, owner);
    if (result.type !== "normal") {
        throw new Error("foreign setup");
    }
    caller.defineScriptGlobal(name, { value: result.value });
}
truth(
    "var caught=false;try{new Primitive()}catch(e){caught=e instanceof TypeError&&!(e instanceof ForeignTypeError)}caught",
    caller,
);
truth(
    "var caught=false;try{new Missing()}catch(e){caught=e instanceof ReferenceError&&!(e instanceof ForeignReferenceError)}caught",
    caller,
);
truth(
    "var caught=false;try{new Early()}catch(e){caught=e instanceof ForeignReferenceError&&!(e instanceof ReferenceError)}caught",
    caller,
);
const limited = run(
    "class B{}var D=B;for(var i=0;i<50;i++){D=class extends D{constructor(){super()}}}new D()",
);
check(
    limited.type === "throw" && limited.origin.kind === "resource-limit",
    "explicit constructor depth budget",
);
const argumentLimit = run(
    "class B{}class D extends B{constructor(){try{super((function(){while(true){}})())}catch(e){return {}}}}new D()",
);
check(
    argumentLimit.type === "throw" && argumentLimit.origin.kind === "resource-limit",
    "fatal super argument budget",
);
for (const text of [
    "class D extends Object{constructor(){(0,eval)('super()')}}new D()",
    "class D extends Object{constructor(){function f(){eval('super()')}f()}}new D()",
    "class D extends Object{constructor(){Function('super()')}}new D()",
]) {
    const result = run(text);
    check(
        result.type === "throw" && result.origin.kind === "unsupported-operation",
        "super context does not leak: " + text,
    );
}
const inspected = new Realm((_line: string) => {}, "script"),
    session = createScriptSession();
let observations = 0;
const inspect = inspected.createBuiltin(
    "inspectThis",
    1,
    (_receiver, args, _context, _loc): ValueCompletion => {
        const frame = session.inspect().active;
        check(
            frame !== null && sameValue(frame.thisValue, args[0]),
            "current this binding in snapshot",
        );
        observations++;
        return normal();
    },
);
inspected.defineScriptGlobal("inspectThis", { value: { kind: "object", object: inspect } });
const prepared = prepareBoundedScript(
    {
        id: "derived-inspection",
        text: "class D extends Object{constructor(){inspectThis(undefined);(()=>super())();inspectThis(this);(()=>inspectThis(this))()}}new D()",
    },
    inspected,
);
if (prepared.kind !== "ready") {
    throw new Error("inspection preparation");
}
check(
    evaluateScript(session, prepared.record).completion.type === "normal" && observations === 3,
    "derived inspection",
);
check(
    session.inspect().active === null &&
        session.inspect().calls === 0 &&
        session.inspect().depth === 0,
    "constructor cleanup",
);
for (const text of [
    "super()",
    "function f(){super()}",
    "class B{constructor(){super()}}",
    "class B{}class D extends B{m(){super()}}",
    "class B{}class D extends B{constructor(){function f(){super()}}}",
    "class B{}class D extends B{constructor(){new super()}}",
    "class B{}class D extends B{constructor(){super?.()}}",
]) {
    check(
        prepareBoundedScript(
            { id: "super-boundary", text },
            new Realm((_line: string) => {}, "script"),
        ).kind !== "ready",
        text,
    );
}
check(
    run("class B{}class D extends B{constructor(){super.x}}").type === "normal",
    "super property constructor declaration",
);
console.log("Explicit derived constructors passed");
