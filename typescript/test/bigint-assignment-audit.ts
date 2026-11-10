import { auditBoundedScriptNumericAssignments } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
for (const literal of ["0n", "1n", "9007199254740993n", "0xFFn", "0b10_01n", "0o7_7n", "1_000n"]) {
    for (const operator of ["=", "+=", "-=", "*=", "/=", "%="]) {
        const source = "\n " + literal + operator + "2n;";
        const audit = auditBoundedScriptNumericAssignments(source);
        if (audit.kind !== "eligible") throw new Error("missing candidate: " + source);
        check(audit.sourceUnits === source.length && audit.consumedUnits === source.length && audit.candidates.length === 1, "complete source");
        const candidate = audit.candidates[0];
        check(candidate.target.text === literal && candidate.target.start === 2 && candidate.target.end === 2 + literal.length &&
            candidate.target.loc.line === 2 && candidate.target.loc.column === 2, "target evidence");
        check(candidate.operator.text === operator && candidate.operator.start === 2 + literal.length &&
            candidate.operator.end === 2 + literal.length + operator.length && candidate.operator.loc.line === 2 &&
            candidate.operator.loc.column === 2 + literal.length, "operator evidence");
        const realm = new Realm((_line: string) => {}, "script");
        const prepared = prepareBoundedScript({ id: "bigint-assignment", text: source }, realm);
        check(prepared.kind === "blocked" && prepared.rejection.kind === "syntax-error", "certified preparation rejection");
        for (const invocation of ["eval(" + JSON.stringify(source) + ")", "(0,eval)(" + JSON.stringify(source) + ")", "Function(" + JSON.stringify(source) + ")"]) {
            const wrapper = prepareBoundedScript({ id: "bigint-assignment-catch", text: "try{" + invocation + ";false}catch(e){e instanceof SyntaxError}" }, realm);
            if (wrapper.kind !== "ready") throw new Error("wrapper preparation");
            const result = evaluateScript(createScriptSession(), wrapper.record).completion;
            check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "catchable SyntaxError: " + invocation);
        }
    }
}
for (const source of ["1n=;", "1n=2n;@", "1n=2n;let x;let x;", "[1n]=[];"]) {
    check(auditBoundedScriptNumericAssignments(source).kind === "blocked", "preserve bounded rejection: " + source);
}
for (const source of ["var x=1n;x=2n;", "({1n:2n})", "1n+2n"]) {
    check(auditBoundedScriptNumericAssignments(source).kind === "none", "valid BigInt source");
}
const chain = auditBoundedScriptNumericAssignments("1n=2n=3n;");
check(chain.kind === "eligible" && chain.candidates.length === 2 && chain.candidates[0].target.text === "1n" && chain.candidates[1].target.text === "2n", "ordered nested candidates");
console.log("bigint assignment audit passed");
