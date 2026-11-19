import { auditBoundedScriptNumericAssignments } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
for (const literal of ["42", "0xFF", "1_000", "1e2", ".5", "0n", "9007199254740993n", "0xF_Fn"]) {
    for (const operator of ["++", "--"]) for (const prefix of [false, true]) {
        const source = "\n " + (prefix ? operator + literal : literal + operator) + ";";
        const targetStart = prefix ? 4 : 2, operatorStart = prefix ? 2 : 2 + literal.length;
        const audit = auditBoundedScriptNumericAssignments(source);
        if (audit.kind !== "eligible") throw new Error("missing candidate: " + source);
        check(audit.candidates.length === 1 && audit.sourceUnits === source.length && audit.consumedUnits === source.length, "complete source");
        const candidate = audit.candidates[0];
        check(candidate.target.text === literal && candidate.target.start === targetStart && candidate.target.end === targetStart + literal.length &&
            candidate.target.loc.line === 2 && candidate.target.loc.column === targetStart, "target span");
        check(candidate.operator.text === operator && candidate.operator.start === operatorStart && candidate.operator.end === operatorStart + 2 &&
            candidate.operator.loc.line === 2 && candidate.operator.loc.column === operatorStart, "operator span");
        const input = JSON.stringify("touched=true;" + source);
        for (const call of ["eval", "(0,eval)", "Function"]) {
            const realm = new Realm((_line: string) => {}, "script");
            const prepared = prepareBoundedScript({ id: "numeric-update", text: "var touched=false;try{" + call + "(" + input + ");false}catch(e){e instanceof SyntaxError&&!touched}" }, realm);
            if (prepared.kind !== "ready") throw new Error("wrapper preparation");
            const result = evaluateScript(createScriptSession(), prepared.record).completion;
            check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "catch before execution: " + call + source);
        }
    }
}
for (const source of ["++(1n);", "(42)--;", "1n/*same line*/++;", "++\n1n;", "1n++;2n=3n;"]) {
    check(auditBoundedScriptNumericAssignments(source).kind === "eligible", "grouping and whitespace: " + source);
}
for (const source of ["42\n++;", "1n/*\n*/++;", "1n++();", "++1n++;", "1n++;@", "1n++;let x;let x;", "++(-1n);", "(1n,2n)++;"]) {
    check(auditBoundedScriptNumericAssignments(source).kind === "blocked", "whole-source veto: " + source);
}
for (const source of ["var x=1n;x++;--x;", "var x=1;1\n++x;", "NaN++;", "var o={x:1n};o.x++;"]) {
    check(auditBoundedScriptNumericAssignments(source).kind === "none", "valid update syntax: " + source);
}
console.log("numeric update audit passed");
