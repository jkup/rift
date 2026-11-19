import type { Location } from "../src/syntax.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    type ScriptSession,
} from "../src/script-execution.js";
import { type Value, type ValueCompletion, type OperationContext } from "../src/runtime.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(
    source: string,
    realm: Realm,
    session: ScriptSession = createScriptSession(),
): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "generator-start", text: source }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + prepared.kind + ": " + source);
    }
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "caller state restored");
    return result;
}
function own(realm: Realm, name: string): Value {
    const property = realm.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") {
        throw new Error("missing " + name);
    }
    return property.value;
}
function define(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true });
}
const cases: string[] = [
    "function* f(){yield yield 1;}var g=f();g.next().value===1&&g.next(2).value===2&&g.next().done;",
    "function* f(){var x=1+(yield 2);}var g=f();g.next().value===2&&g.next(7).done;",
    "function* f(){throw yield 1;}var g=f(),marker={},caught;g.next();try{g.next(marker);}catch(e){caught=e;}caught===marker&&g.next().done;",
    "function* f(){var x;x=yield 1;}var g=f();g.next();g.next(7).done;",
    "function* f(){var x=yield 1;var y=yield x+10;return x+y;}var g=f();g.next().value===1&&g.next(5).value===15&&g.next(20).value===25;",
    "function* f(){let x=yield 1;const y=yield x+1;return x+y;}var g=f();g.next();g.next(3).value===4&&g.next(5).value===8;",
    "function* f(){return yield 1;}var g=f();g.next().value===1&&g.next(7).value===7&&g.next().done;",
    "function* inner(){yield 1;return 7;}function* f(){return yield* inner();}var g=f();g.next().value===1&&g.next().value===7;",
    "function* inner(){yield 1;return 7;}function* f(){let x=yield* inner();yield x;return x+1;}var g=f();g.next().value===1&&g.next().value===7&&g.next().value===8;",
    "function* f(){var x=(yield);return x;}var g=f();g.next().value===undefined&&g.next(7).value===7;",
    'function* f(){(yield 1);yield 2;}Array.from(f()).join(",")==="1,2";',
    "var probe;function* f(){let x=yield (probe=()=>x,1);return x;}var g=f(),caught=false;g.next();try{probe();}catch(e){caught=e instanceof ReferenceError;}caught&&g.next(7).value===7&&probe()===7;",
    "var probe;function* f(){const x=yield (probe=()=>x,1);return x;}var g=f(),caught=false;g.next();try{probe();}catch(e){caught=e instanceof ReferenceError;}caught&&g.next(7).value===7&&probe()===7;",
    "var probe;function* f(){var x=yield (probe=()=>x,1);return x;}var g=f();g.next();probe()===undefined&&g.next(7).value===7&&probe()===7;",
    'function* f(){try{var x=yield 1;return x;}catch(e){yield typeof x;return e;}}var g=f();g.next();g.throw(7).value==="undefined"&&g.next().value===7;',
    "function* f(){try{let x=yield 1;return x;}finally{yield 2;}}var g=f();g.next();g.return(7).value===2&&g.next().value===7;",
    "function* f(){try{return yield 1;}finally{yield 2;}}var g=f();g.next();g.next(7).value===2&&g.next().value===7;",
    "function* f(){try{return 7;}finally{const x=yield 2;yield x;}}var g=f();g.next().value===2&&g.next(5).value===5&&g.next().value===7;",
    'function* f(){var x=yield function(){};return x;}var g=f(),h=g.next().value;h.name===""&&g.next(8).value===8;',
    "function* f(){for(let i=0;i<2;i++){let x=yield i;yield x+i;}}var g=f();g.next().value===0&&g.next(5).value===5&&g.next().value===1&&g.next(7).value===8;",
    "var probe;function* f(){try{const x=yield (probe=()=>x,1);}catch(e){yield e;}}var g=f(),caught=false;g.next();g.throw(7);try{probe();}catch(e){caught=e instanceof ReferenceError;}caught;",
    "var n=0;function* f(){var x=yield ++n;return x+n;}var g=f();g.next();g.next(5).value===6&&n===1;",
    "function* f(){let x=yield* [];return x;}f().next().value===undefined;",
    "function* inner(){yield 1;return 3;}function* f(){try{return yield* inner();}finally{yield 2;}}var g=f();g.next().value===1&&g.next().value===2&&g.next().value===3;",
];
for (let i = 0; i < cases.length; i++) {
    const r = run(cases[i], new Realm((_line: string): void => {}, "script"));
    check(r.type === "normal" && r.value.kind === "boolean" && r.value.value, "receive case " + i);
}
{
    const realm = new Realm((_line: string) => {}, "script");
    const result = run(
        "function* f(){var x=yield 1,y=2;}var g=f();g.next().value===1&&g.next(7).done",
        realm,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original var list boundary",
    );
}
const A = new Realm((_line: string): void => {}, "script"),
    B = new Realm((_line: string): void => {}, "script");
run("function* f(){let x=yield 1;yield ()=>x;return x;}var g=f();g.next();", A);
define(B, "g", own(A, "g"));
const cross = run("var marker={},h=g.next(marker).value;h()===marker&&g.next().value===marker;", B);
check(
    cross.type === "normal" && cross.value.kind === "boolean" && cross.value.value,
    "foreign received binding identity",
);
{
    const source = "function* f(){foo(yield 1);}",
        realm = new Realm((_line: string): void => {}, "script");
    check(
        prepareBoundedScript({ id: "historical-call", text: source }, realm).kind === "ready",
        "historical call admitted",
    );
    const result = run(
        "function foo(x){return x}" + source + "var g=f();g.next();" + "g.next(7).done",
        realm,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "historical call resumes",
    );
}
{
    const realm = new Realm((_line: string) => {}, "script");
    const result = run(
        "function* f(){for(let i=yield 1;;){}}var g=f();g.next().value===1&&g.return(7).value===7",
        realm,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original lexical loop boundary",
    );
}
console.log("generator receive passed");
