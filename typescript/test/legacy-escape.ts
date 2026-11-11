import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function run(realm: Realm, text: string, steps = 100000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "legacy-escape", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    const result = evaluateScript(session, prepared.record).completion;
    if (session.inspect().active !== null || session.inspect().calls !== 0) throw new Error("legacy escape restoration");
    return result;
}
for (const text of [
    "escape(String.fromCharCode(92))===\"%5C\"",
    "escape(\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@*_+-./\")===\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@*_+-./\"",
    "escape(\" !\\\"#$%&'():;<=>?[]^`{|}~\")===\"%20%21%22%23%24%25%26%27%28%29%3A%3B%3C%3D%3E%3F%5B%5D%5E%60%7B%7C%7D%7E\"",
    "escape(\"\\0\\x7f\\x80\\xff\\u0100\\uffff\")===\"%00%7F%80%FF%u0100%uFFFF\"",
    "escape(\"\\ud83d\\ude00\\ud800\\udfff\")===\"%uD83D%uDE00%uD800%uDFFF\"",
    "unescape(\"%00%7f%80%fF%u0100%ufffF\")===\"\\0\\x7f\\x80\\xff\\u0100\\uffff\"",
    "unescape(\"%uD83D%uDE00%uD800%udfff\")===\"\\ud83d\\ude00\\ud800\\udfff\"",
    "unescape(\"% %0 %GG %u %u123 %u12GG %U0041\")===\"% %0 %GG %u %u123 %u12GG %U0041\"",
    "unescape(\"%%41%u0041%2541\")===\"%AA%41\"",
    "unescape(\"%u00411\")===\"A1\"&&unescape(\"%411\")===\"A1\"",
    "unescape(\"a+b%2Bc\")===\"a+b+c\"",
    "unescape(\"%C3%A9\")===\"\\u00c3\\u00a9\"",
    "escape() === \"undefined\" && unescape() === \"undefined\"",
    "escape(null)===\"null\"&&unescape(null)===\"null\"&&escape(12n)===\"12\"",
    "(()=>{var log=\"\",o={toString(){log+=\"S\";return {}},valueOf(){log+=\"V\";return \" \"}};return escape(o)===\"%20\"&&log===\"SV\"})()",
    "(()=>{var hint=\"\",o={[Symbol.toPrimitive](h){hint=h;return \"%41\"}};return unescape(o)===\"A\"&&hint===\"string\"})()",
    "(()=>{var marker={},o={toString(){throw marker}};try{escape(o)}catch(e){return e===marker}return false})()",
    "(()=>{try{escape(Symbol())}catch(e){return e instanceof TypeError}return false})()",
    "(()=>{try{unescape(Symbol())}catch(e){return e instanceof TypeError}return false})()",
    "escape.length===1&&unescape.length===1&&escape.name===\"escape\"&&unescape.name===\"unescape\"",
    "(()=>{try{new escape(\"x\")}catch(e){return e instanceof TypeError}return false})()",
    "(()=>{var d=Object.getOwnPropertyDescriptor(globalThis,\"unescape\");return d.writable&&!d.enumerable&&d.configurable})()",
    "unescape(\"\\ud800%u0041\\udfff\")===\"\\ud800A\\udfff\"",
    "unescape(\"%u0%41\")===\"%u0A\"",
    "escape(\"é\")===\"%E9\"&&encodeURIComponent(\"é\")===\"%C3%A9\""
]) {
    const result = run(new Realm((_line: string) => {}, "script"), text);
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) throw new Error("execute: " + text);
}

const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
for (const name of ["escape", "unescape"]) {
    const method = run(owner, name);
    if (method.type !== "normal") throw new Error("escape export");
    caller.defineScriptGlobal("foreign", { value: method.value, configurable: true });
    const error = run(caller, "foreign(Symbol())");
    if (error.type !== "throw" || error.value.kind !== "object" || error.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")) throw new Error("escape error Realm");
    const local = run(caller, 'foreign({toString(){throw new TypeError("local")}})');
    if (local.type !== "throw" || local.value.kind !== "object" || local.value.object.getPrototypeOf() !== caller.getErrorPrototype("TypeError")) throw new Error("escape coercion error Realm");
    const metadata = run(caller, 'foreign.toString()==="function '+name+'() { [native code] }"&&!Object.hasOwn(foreign,"prototype")');
    if (metadata.type !== "normal" || metadata.value.kind !== "boolean" || !metadata.value.value) throw new Error("escape metadata");
}

const realm = new Realm((_line: string) => {}, "script");
const unitParts: string[] = [];
for (let code = 0; code <= 0xffff; code++) unitParts.push(String.fromCharCode(code));
const units = unitParts.join("");
realm.defineScriptGlobal("units", { value: { kind: "string", value: units } });
const roundtrip = run(realm, "unescape(escape(units))", 1000000);
if (roundtrip.type !== "normal" || roundtrip.value.kind !== "string" || roundtrip.value.value !== units) throw new Error("all UTF-16 code units round-trip");

for (const name of ["escape", "unescape"]) {
    let interrupted = false, completed = false;
    for (let steps = 0; steps < 80; steps++) {
        const result = run(realm, name + '("%uD800 ")', steps);
        if (result.type === "throw") {
            if (result.origin.kind !== "resource-limit" || result.origin.guardCode !== "steps") throw new Error("escape budget cutoff");
            interrupted = true;
        } else {
            const expected = name === "escape" ? "%25uD800%20" : String.fromCharCode(0xd800) + " ";
            if (result.value.kind !== "string" || result.value.value !== expected) throw new Error("escape budget result");
            completed = true;
        }
    }
    if (!interrupted || !completed) throw new Error("escape budget boundary");
    const bounded = run(realm, name + "(units)", 100);
    if (bounded.type !== "throw" || bounded.origin.kind !== "resource-limit" || bounded.origin.guardCode !== "steps") throw new Error("escape large input bounded");
}
console.log("legacy escape passed");
