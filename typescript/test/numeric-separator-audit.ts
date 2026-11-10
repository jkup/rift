import { auditBoundedScriptNumericSeparators, parseBoundedScriptDeclarationPlan, parseBoundedScriptPreparation } from "../src/parser.js";
import { lex, lexNumericSeparatorAudit } from "../src/lexer.js";
import type { DeclarationNodes } from "../src/script-declarations.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const malformed = ["1_", "10__0", "10._1", "10.0_e1", "0b0_", "0b0__0", "0o0_", "0x1_", "00_0", "0_0", "08_0",
    ".1_", "1e_2", "1e+_2", "1e2_", "0x_1", "0b_1", "0o_1", "1_.2", "1_e2"];
for (const literal of malformed) {
    const text = "/* original */\r\n(" + literal + "); // end";
    for (const strict of [false, true]) {
        const audit = auditBoundedScriptNumericSeparators(text, strict);
        if (audit.kind !== "eligible") throw new Error("candidate: " + literal);
        check(audit.consumedUnits === text.length && audit.sourceUnits === text.length, "whole source");
        check(audit.candidates.length === 1, "one candidate");
        const token = audit.candidates[0];
        check(token.text === literal && text.slice(token.start, token.end) === literal, "original token");
        check(token.loc.line === 2 && token.loc.column === 2, "original location");
        const nodes: DeclarationNodes = { source: { text: "untouched" }, body: [], scopes: new Map(), declarations: new Map(), assignmentNameEligible: new Map() };
        const result = parseBoundedScriptPreparation({ id: "original", text }, nodes, strict);
        check(result.kind === "blocked" && result.rejection.kind === "syntax-error" && result.rejection.ruleCode === "numeric-separator", "certified preparation");
        check(nodes.source.text === "untouched" && nodes.body.length === 0 && nodes.scopes.size === 0 && nodes.declarations.size === 0, "no retained audit nodes");
    }
    check(lex(text, true).error !== null, "ordinary lexer unchanged");
    const plan = parseBoundedScriptDeclarationPlan({ id: "original", text });
    check(plan.kind === "blocked" && plan.rejection.kind === "unsupported-syntax", "planner unchanged");
}
for (const text of ["1_000;", "0xA_B;", "0b1_0;", "0o1_7;", "1.2_3e4_5;", ".1_2;", "0.0_1;", "0e1_0;",
    "10.._1;", "'1_';", "`1_`;", "// 1_\n1;", "/* 10__0 */1;"]) {
    check(auditBoundedScriptNumericSeparators(text).kind === "none", "valid: " + text);
    check(lexNumericSeparatorAudit(text).tokens.every(t => t.kind !== "invalid-number"), "no invalid token");
}
for (const text of ["1_0n;", "0xA_Bn;", "/1_/;", "var r=/10__0/;", "1_; class C{}", "class C{};1_;",
    "1_;let x;let x;", "1_;let x;var x;", "1_;function f(a,a){'use strict';}", "1_;if(true)let x;",
    "1_;42=2;", "1_;return 2;", "1_;'unterminated", "1_;/* unterminated", "1_; 01;", "1_foo;",
    "0b1_2;", "1_;1e;", "({1_: 2});", "1_;var r=/a/;"]) {
    if (text === "1_0n;" || text === "0xA_Bn;") {
        check(auditBoundedScriptNumericSeparators(text).kind === "none", "original BigInt is now a valid numeric token");
    } else if (text === "/1_/;" || text === "var r=/10__0/;") {
        check(auditBoundedScriptNumericSeparators(text).kind === "none", "admitted regex body is not a numeric token");
    } else if (text === "1_; class C{}" || text === "class C{};1_;" || text === "1_;var r=/a/;") {
        const audit = auditBoundedScriptNumericSeparators(text);
        check(audit.kind === "eligible" && audit.candidates.length === 1, "admitted syntax preserves numeric candidate");
    } else check(auditBoundedScriptNumericSeparators(text).kind === "blocked", "veto: " + text);
}
for (const text of ["1_;var arguments;", "1_;delete x;", "1_;var eval;"]) {
    check(auditBoundedScriptNumericSeparators(text).kind === "eligible", "sloppy: " + text);
    check(auditBoundedScriptNumericSeparators(text, true).kind === "blocked", "inherited strict veto: " + text);
}
const mixed = "1_; `raw 2_ ${3__4}`; function f(){return 0x1_;}";
const audit = auditBoundedScriptNumericSeparators(mixed);
check(audit.kind === "eligible" && audit.candidates.length === 3, "multiple candidates and template boundaries");
const large = auditBoundedScriptNumericSeparators("1_;" + " ".repeat(100001));
check(large.kind === "blocked" && large.rejection?.kind === "resource-limit", "source guard");
const deep = auditBoundedScriptNumericSeparators("(".repeat(300) + "1_" + ")".repeat(300));
check(deep.kind === "blocked" && deep.rejection?.kind === "resource-limit", "depth guard");
console.log("Numeric separator audit passed");
