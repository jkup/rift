import { lex } from "../src/lexer.js";
import { auditBoundedScriptNumericAssignments } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function execute(text: string, expected: string): void {
    const output: string[] = [], realm = new Realm(line => { output.push(line); }, "script");
    const prepared = prepareBoundedScript({ id: "legacy-number", text }, realm);
    check(prepared.kind === "ready", "prepare: " + text);
    if (prepared.kind !== "ready") return;
    const result = evaluateScript(createScriptSession({ maxSteps: 20000, maxCalls: 64 }), prepared.record).completion;
    check(result.type === "normal" && output.join("\n") === expected, "execute: " + text);
}
for (const [raw, decoded, expected] of [["077", "0o077", "63"], ["000", "0o000", "0"], ["078", "078", "78"], ["08.1_2", "08.1_2", "8.12"], ["08e1_0", "08e1_0", "80000000000"]]) {
    const source = "\r\n " + raw + ";", result = lex(source, true), token = result.tokens[0];
    check(result.error === null && token.kind === "number" && token.legacyNumeric === true, "legacy provenance: " + raw);
    check(token.text === decoded && token.start === 3 && token.end === 3 + raw.length, "decoded value and span");
    check(source.slice(token.start, token.end) === raw && token.loc.line === 2 && token.loc.column === 2, "raw spelling and location");
    execute("console.log(" + raw + ");", expected);
}
for (const [text, expected] of [
    ["console.log(Object.is(-00,-0));", "true"],
    ["console.log(077.toString(),08..toString());", "63 8"],
    ["var o={077:1,08:2};console.log(o[63],o[8]);", "1 2"],
    ['var o={077(){"use strict";return 7}};console.log(o[63]());', "7"],
    ["var {077:x}={63:7};console.log(x);", "7"],
    ["function f(a=077){return a}console.log(f());", "63"],
    ['077;"use strict";console.log(010);', "8"],
    ['console.log(eval("077"));', "63"],
    ['"use strict";console.log((0,eval)("077"));', "63"],
    ['"use strict";console.log(Function("return 077")());', "63"],
    ['"use strict";try{eval("077")}catch(e){console.log(e.name)}', "SyntaxError"],
    [`try{Function("'use strict';return 08")}catch(e){console.log(e.name)}`, "SyntaxError"],
    ['console.log(Number("077"),parseInt("077"));', "77 77"],
    ['"use strict";console.log(0o77,0O77,0b11,0x10,0.,0e1,.5);', "63 63 3 16 0 0 0.5"],
]) execute(text, expected);
for (const text of [
    '"use strict";077;', '"use strict";08;', 'function f(){"use strict";return 077;}',
    '"use strict";function f(){return 08;}', "class C{x=077;}", "class C{static{08;}}",
    "class C{077(){}}", "class C{[08](){}}", "class C extends (077,Object){}",
    '"use strict";({077:1});', '"use strict";var {077:x}={};',
]) {
    const prepared = prepareBoundedScript({ id: "strict-legacy-number", text }, new Realm((_line: string) => {}, "script"));
    check(prepared.kind === "blocked" && prepared.rejection.kind === "syntax-error" && prepared.rejection.ruleCode === "strict-legacy-number", "strict certificate: " + text);
}
for (const text of ["00.1;", "077e1;", "00n;", "08n;", "0_0;", "00_1;", "08_1;", "08e_1;", "077a;"]) {
    check(prepareBoundedScript({ id: "invalid-number", text }, new Realm((_line: string) => {}, "script")).kind !== "ready", "reject malformed number: " + text);
}
for (const text of ['"use strict";077;import x from "x";', '"use strict";077;@', '"use strict";077;with({}){}']) {
    const prepared = prepareBoundedScript({ id: "unsupported-precedence", text }, new Realm((_line: string) => {}, "script"));
    check(prepared.kind === "blocked" && prepared.rejection.kind === "unsupported-syntax", "whole-source grammar veto");
}
check(lex("077").error !== null && lex("08").error !== null, "legacy parser boundary");
for (const raw of ["01", "077", "08", "0o77"]) {
    const audit = auditBoundedScriptNumericAssignments(raw + "=7;");
    check(audit.kind === "eligible", "numeric target audit: " + raw);
    if (audit.kind === "eligible") {
        const target = audit.candidates[0].target;
        check(target.text === raw && target.start === 0 && target.end === raw.length, "raw numeric target evidence");
    }
    const strict = auditBoundedScriptNumericAssignments('"use strict";' + raw + "=7;");
    check(strict.kind === (raw === "0o77" ? "eligible" : "blocked"), "strict numeric target veto");
}
console.log("legacy numeric literals passed");
