import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function run(text: string, realm = fresh(), steps = 50000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "sloppy-block-functions", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record)
        .completion;
}
function passes(text: string, realm = fresh()): void {
    const result = run(text, realm);
    check(
        result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
        text,
    );
}
for (const source of [
    "var before=typeof f;var local;{local=f();function f(){return 7;}}before==='undefined'&&local===7&&f()===7;",
    "if(false){function f(){return 7;}}typeof f==='undefined'&&Object.hasOwn(this,'f');",
    "var f=3;if(false){function f(){return 7;}}f===3;",
    "var local;try{local=f;throw 3;function f(){return 7;}}catch(e){}typeof f==='undefined'&&local()===7;",
    "function outer(){var get=()=>f;{return [get,f];function f(){return 7;}}}var pair=outer();pair[0]()===undefined&&pair[1]()===7;",
    "{function f(){return 1;}}var first=f;{function f(){return 2;}}first()===1&&f()===2&&first!==f;",
    "var inside;{function f(){return 1;}{function f(){return 2;}}inside=f();}inside===1&&f()===2;",
    "let f=3;var local;{function f(){return 7;}local=f();}f===3&&local===7&&!Object.hasOwn(this,'f');",
    "var local;{let f=3;{function f(){return 7;}local=f();}local+=f;}local===10&&typeof f==='undefined'&&!Object.hasOwn(this,'f');",
    "function outer(f){{function f(){return 7;}}return f;}outer(3)===3;",
    "function outer(f=3){{function f(){return 7;}}return f;}outer()===3;",
    "function outer(...f){{function f(){return 7;}}return f[0];}outer(3)===3;",
    "var caught;try{throw 3;}catch(f){{function f(){return 7;}}caught=f;}caught===3&&f()===7;",
    "var f=3;function outer(a=()=>f){{function f(){return 7;}}return [a(),f()];}outer().join(',')==='3,7';",
    "function outer(){function f(){return 1;}var before=f();{function f(){return 2;}}return [before,f()];}outer().join(',')==='1,2';",
    "function outer(){var before=arguments;{function arguments(){return 7;}}return before[0]===3&&arguments()===7;}outer(3);",
    "function outer(a=()=>arguments){var before=arguments;{function arguments(){return 7;}}return before===a()&&arguments()===7;}outer();",
    "function outer(){var f=()=>{var before=arguments;{function arguments(){return 7;}}return before[0]+arguments();};return f();}outer(3)===10;",
    "function outer(){if(false){function arguments(){return 7;}}return arguments[0];}outer(3)===3;",
    "function outer(){if(false){function arguments(){}}}outer()===undefined;",
    "var fs=[];for(let i=0;i<2;i++){function f(){return i;}fs.push(f);}fs[0]()===0&&fs[1]()===1&&f()===1;",
    "var local;switch(0){case 0:local=f();break;case 1:function f(){return 7;}}local===7&&typeof f==='undefined';",
    "switch(1){case 1:function f(){return 7;}}f()===7;",
    "{function f(){'use strict';return this;}}f()===undefined;",
    "Function('{function f(){return 7;}}return f();')()===7;",
]) {
    passes(source);
}

for (const source of [
    "var local;{local=f();function f(){return 7;}}local===7&&typeof f==='undefined';",
    "if(false){function f(){return 7;}}typeof f==='undefined'&&!Object.hasOwn(this,'f');",
    "function outer(f){{function f(){return 7;}}return f;}outer(3)===3;",
]) {
    passes("'use strict';" + source);
}

{
    const realm = fresh();
    run(
        "var calls=0,saved;Object.defineProperty(this,'f',{configurable:true,set:function(v){calls++;saved=v;}});",
        realm,
    );
    passes("{function f(){return 7;}}calls===1&&saved()===7;", realm);
}
{
    const realm = fresh();
    run(
        "var caught=false,later=false;Object.defineProperty(this,'f',{set:function(v){throw v;}});",
        realm,
    );
    passes(
        "try{function f(){return 7;}later=true;}catch(e){caught=e()===7;}caught&&!later;",
        realm,
    );
}
{
    const realm = fresh();
    run("let f=3;", realm);
    passes(
        "var local;{function f(){return 7;}local=f();}local===7&&f===3&&!Object.hasOwn(this,'f');",
        realm,
    );
}
{
    const realm = fresh();
    run("var observed;Object.preventExtensions(this);", realm);
    passes("{function f(){return 7;}observed=f();}observed===7&&typeof f==='undefined';", realm);
}
{
    const realm = fresh();
    realm.defineScriptGlobal("f", {
        value: { kind: "number", value: 3 },
        writable: false,
        configurable: false,
    });
    passes("var local;{function f(){return 7;}local=f();}local===7&&f===3;", realm);
}
{
    const realm = fresh();
    const prepared = prepareBoundedScript(
        { id: "detached-plan", text: "{function f(){return 7;}}f();" },
        realm,
    );
    if (prepared.kind !== "ready") {
        throw new Error("legacy plan");
    }
    const inspected = prepared.record.inspect();
    check(inspected.legacyBlockFunctions?.length === 1, "legacy declaration inspection");
    if (inspected.legacyBlockFunctions !== undefined) {
        (inspected.legacyBlockFunctions as number[])[0] = 99;
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    check(
        result.type === "normal" && sameValue(result.value, { kind: "number", value: 7 }),
        "inspection is detached",
    );
}
for (const text of [
    "{function f(){}function f(){}}",
    "switch(1){case 1:function f(){}case 2:function f(){}}",
]) {
    const prepared = prepareBoundedScript({ id: "duplicate-sloppy", text }, fresh());
    check(
        prepared.kind === "blocked" && prepared.rejection.kind === "unsupported-syntax",
        "duplicate sloppy functions remain unsupported",
    );
}
{
    const realm = fresh(),
        other = fresh(),
        session = createScriptSession();
    run("let f=3;", other);
    for (const target of [realm, other, realm]) {
        const prepared = prepareBoundedScript(
            { id: "session-reuse", text: "{function f(){return 7;}}f;" },
            target,
        );
        if (prepared.kind !== "ready") {
            throw new Error("session reuse prepare");
        }
        const result = evaluateScript(session, prepared.record).completion;
        check(
            result.type === "normal" &&
                (target === other
                    ? sameValue(result.value, { kind: "number", value: 3 })
                    : result.value.kind === "object"),
            "global eligibility is local to each evaluation",
        );
    }
}
{
    const realm = fresh(),
        other = fresh();
    const result = run(
        "var marker=7;function outer(){{function f(){return marker;}}return f;}outer;",
        realm,
    );
    if (result.type !== "normal") {
        throw new Error("cross Realm setup");
    }
    other.defineScriptGlobal("outer", { value: result.value, writable: true, configurable: true });
    passes(
        "var marker=3;var f=outer();f()===7&&Object.getPrototypeOf(f)===Object.getPrototypeOf(outer);",
        other,
    );
}
for (const text of [
    "{let f;function f(){}}",
    "{var f;function f(){}}",
    "'use strict';{function f(){}function f(){}}",
]) {
    check(
        prepareBoundedScript({ id: "restricted-block", text }, fresh()).kind !== "ready",
        "restricted: " + text,
    );
}
{
    const realm = fresh();
    const result = run("if(true)function f(){}", realm);
    check(result.type === "normal", "conditional declaration executes");
    passes("typeof f==='function'", realm);
}
const bounded = run("while(true){function f(){return 7;}}", fresh(), 100);
check(
    bounded.type === "throw" && bounded.origin.kind === "resource-limit",
    "bounded block allocation",
);
console.log("Sloppy block functions passed");
