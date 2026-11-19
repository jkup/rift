import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function string(text: string, expected: string): void {
    const prepared = prepareBoundedScript({ id: "string-padding", text }, fresh());
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (
        result.type !== "normal" ||
        result.value.kind !== "string" ||
        result.value.value !== expected
    ) {
        throw new Error(text + " expected " + expected);
    }
}
const cases: { source: string; expected: string }[] = [
    { source: "'ab'.padStart(5)", expected: "   ab" },
    { source: "'ab'.padEnd(5)", expected: "ab   " },
    { source: "'ab'.padStart(7,'xy')", expected: "xyxyxab" },
    { source: "'ab'.padEnd(7,'xy')", expected: "abxyxyx" },
    { source: "'ab'.padStart(3,'long filler')", expected: "lab" },
    { source: "''.padStart(3,'ab')", expected: "aba" },
    { source: "'ab'.padEnd(5.9,0)", expected: "ab000" },
    { source: "'ab'.padStart('5',null)", expected: "nulab" },
    { source: "'ab'.padStart(4,undefined)", expected: "  ab" },
    { source: "String.prototype.padEnd.call(12,4,'0')", expected: "1200" },
    { source: "String.prototype.padStart.call(new String('a'),3,'0')", expected: "00a" },
    { source: "'ab'.padStart(Infinity,'')", expected: "ab" },
    { source: "'ab'.padEnd(-Infinity,Symbol())", expected: "ab" },
    { source: "'ab'.padStart(2,Symbol())", expected: "ab" },
    { source: "'ab'.padEnd(NaN,{toString(){throw 7}})", expected: "ab" },
    { source: "'ab'.padStart()", expected: "ab" },
    { source: "'😀'.padStart(4,'x')", expected: "xx😀" },
    { source: "var s='x'.padEnd(2,'😀');s.length+':'+s.charCodeAt(1)", expected: "2:55357" },
    { source: "var s='x'.padStart(2,'\\udc00');s.length+':'+s.charCodeAt(0)", expected: "2:56320" },
    {
        source: "var order='',o={toString(){order+='s';return 'a'}},n={valueOf(){order+='n';return 3}},f={toString(){order+='f';return 'x'}};String.prototype.padStart.call(o,n,f)+':'+order",
        expected: "xxa:snf",
    },
    {
        source: "var order='',o={toString(){order+='s';return 'abc'}},n={valueOf(){order+='n';return 3}},f={toString(){order+='bad';throw 7}};String.prototype.padEnd.call(o,n,f)+':'+order",
        expected: "abc:sn",
    },
    {
        source: "var order='',n={valueOf(){order+='bad';return 3}},r='';try{String.prototype.padStart.call(null,n)}catch(e){r=e.name}r+':'+order",
        expected: "TypeError:",
    },
    {
        source: "var order='',f={toString(){order+='bad';return 'x'}},r='';try{'a'.padEnd({valueOf(){throw 7}},f)}catch(e){r=String(e)}r+':'+order",
        expected: "7:",
    },
];
for (const c of cases) {
    string(c.source, c.expected);
}
for (const method of ["padStart", "padEnd"]) {
    for (const source of [
        "'x'." + method + "(2,Symbol())",
        "'x'." + method + "(Symbol())",
        "String.prototype." + method + ".call(Symbol(),0)",
    ]) {
        string("var r='';try{" + source + "}catch(e){r=e.name}r", "TypeError");
    }
    string(
        "var d=Object.getOwnPropertyDescriptor(String.prototype,'" +
            method +
            "'),r='';try{new d.value()}catch(e){r=e.name}d.value.name+':'+d.value.length+':'+d.writable+':'+d.enumerable+':'+d.configurable+':'+r",
        method + ":1:true:false:true:TypeError",
    );
    for (const length of [3, 7, 16, 65, 1000]) {
        string(
            "'x'." + method + "(" + length + ",'ab')",
            method === "padStart" ? "x".padStart(length, "ab") : "x".padEnd(length, "ab"),
        );
    }
    const prepared = prepareBoundedScript(
        { id: "padding-budget", text: "try{'x'." + method + "(Infinity)}catch(e){'caught'}" },
        fresh(),
    );
    if (prepared.kind !== "ready") {
        throw new Error("budget prepare");
    }
    const result = evaluateScript(
        createScriptSession({ maxSteps: 200, maxCalls: 32 }),
        prepared.record,
    ).completion;
    if (result.type !== "throw" || result.origin.kind !== "resource-limit") {
        throw new Error("padding budget");
    }
}
console.log("String padding passed");
