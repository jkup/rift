import {Realm} from "../src/realm.js";
import {lex} from "../src/lexer.js";
import {parse} from "../src/parser.js";
import {prepareBoundedScript} from "../src/script-record.js";
import {createScriptSession, evaluateScript} from "../src/script-execution.js";
import {sameValue} from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const sources = [".5", ".5e2", "1e2", "1E+2", "1e-2", "1.e2", "0e999", "1e999", "1e-999", "-1e-999", "5e-324", "9007199254740993e0"];
const expected = [0.5, 50, 100, 100, 0.01, 100, 0, Infinity, 0, -0, 5e-324, 9007199254740992];
for (let i = 0; i < sources.length; i++) {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({id: "decimal", text: sources[i] + ";"}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare decimal " + sources[i]);
    const session = createScriptSession({maxSteps: 1000, maxCalls: 64});
    const result = evaluateScript(session, prepared.record).completion;
    check(result.type === "normal" && sameValue(result.value, {kind: "number", value: expected[i]}), "decimal value " + sources[i]);
    check(session.inspect().active === null && session.inspect().calls === 0, "decimal session restored");
}
for (const text of ["1e", "1e+", "1e-", "1e+x", "1e 2", "1e\n2", ".5e-", "1e2foo", "1e2_3", "01e2", "0xG", "1_000", "1n"]) {
    const result = lex(text, true);
    if (text === "1n") {
        const realm = new Realm((_line: string) => {}, "script");
        const prepared = prepareBoundedScript({ id: "original-bigint", text }, realm);
        if (prepared.kind !== "ready") throw new Error("original BigInt decimal source");
        const completion = evaluateScript(createScriptSession(), prepared.record).completion;
        check(completion.type === "normal" && sameValue(completion.value, { kind: "bigint", value: 1n }), "original decimal BigInt now executes");
        continue;
    }
    if (text === "1e2_3" || text === "1_000") { check(result.error === null, "separator now supported " + text); continue; }
    check(result.error !== null && result.error.phase === "parse", "reject decimal " + text);
}
for (const text of ["1e2;", ".5;", ".5e2;"]) {
    check(parse(text).error !== null, "legacy decimal admission unchanged");
}
const source = "\n .5e+2;1e-3;";
const result = lex(source, true);
check(result.error === null, "decimal tokenization");
const first = result.tokens[0], second = result.tokens[2];
check(first.kind === "number" && first.text === ".5e+2" && first.start === 2 && first.end === 7 && first.loc.line === 2 && first.loc.column === 2, "leading-dot token span");
check(second.kind === "number" && second.text === "1e-3" && second.start === 8 && second.end === 12 && second.loc.column === 8, "exponent token span");
console.log("Decimal literals passed");
