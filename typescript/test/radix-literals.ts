import {Realm} from "../src/realm.js";
import {lex} from "../src/lexer.js";
import {parse} from "../src/parser.js";
import {prepareBoundedScript} from "../src/script-record.js";
import {createScriptSession, evaluateScript} from "../src/script-execution.js";
import {sameValue} from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const sources = ["0xFF", "0XfF", "0b101", "0B101", "0o777", "0O777", "0x000F", "-0b0", "0x20000000000001", "0x20000000000003", "0x" + "f".repeat(300)];
const expected = [255, 255, 5, 5, 511, 511, 15, -0, 9007199254740992, 9007199254740996, Infinity];
for (let i = 0; i < sources.length; i++) {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({id: "radix", text: sources[i] + ";"}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare radix " + sources[i]);
    const session = createScriptSession({maxSteps: 1000, maxCalls: 64});
    const result = evaluateScript(session, prepared.record).completion;
    check(result.type === "normal" && sameValue(result.value, {kind: "number", value: expected[i]}), "radix value " + sources[i]);
    check(session.inspect().active === null && session.inspect().calls === 0, "radix session restored");
}
for (const text of ["0x", "0X", "0b", "0o", "0xG", "0b2", "0b102", "0o8", "0o78", "0x1g", "0b1e2", "0x1n", "0x1_2", "0b_1", "0o7$", "00x1"]) {
    if (text === "0x1_2") { check(lex(text, true).error === null, "separator now supported " + text); continue; }
    check(lex(text, true).error !== null, "reject radix " + text);
}
for (const text of ["0xFF;", "0b10;", "0o77;"]) {
    check(parse(text).error !== null, "legacy radix admission unchanged");
}
const tokens = lex("\n 0XfF;0o7;", true);
check(tokens.error === null, "radix tokenization");
const first = tokens.tokens[0], second = tokens.tokens[2];
check(first.text === "0XfF" && first.start === 2 && first.end === 6 && first.loc.line === 2 && first.loc.column === 2, "hex raw span");
check(second.text === "0o7" && second.start === 7 && second.end === 10 && second.loc.column === 7, "octal raw span");
console.log("Radix literals passed");
