import { Realm } from "../src/realm.js";
import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function run(text: string): ValueCompletion {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "numeric-separators", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const session = createScriptSession({ maxSteps: 10000, maxCalls: 64 });
    const result = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "restored session");
    return result;
}
function expect(result: ValueCompletion, expected: Value, label: string): void {
    check(result.type === "normal" && sameValue(result.value, expected), label);
}

const valid = [
    { text: "1_000", value: 1000 }, { text: "1_0_0_0", value: 1000 },
    { text: "1_2.3_4", value: 12.34 }, { text: ".0_1", value: 0.01 },
    { text: "0.0_1", value: 0.01 }, { text: "1_0.", value: 10 },
    { text: "1e1_0", value: 1e10 }, { text: "1_2.E+0_2", value: 1200 },
    { text: "1_0.0_1e-0_2", value: 0.1001 }, { text: "0e1_0", value: 0 },
    { text: "1e9_9_9", value: Infinity }, { text: "-1e-9_9_9", value: -0 },
    { text: "9_007_199_254_740_993", value: 9007199254740992 },
    { text: "0xFF_FF", value: 65535 }, { text: "0X0_0_1", value: 1 },
    { text: "0b1010_0101", value: 165 }, { text: "0B0_0", value: 0 },
    { text: "0o77_77", value: 4095 }, { text: "0O0_7", value: 7 },
];
for (const row of valid) {
    for (const prefix of ["", "'use strict';"])
        expect(run(prefix + row.text + ";"), { kind: "number", value: row.value }, row.text);
    check(parse(row.text + ";").error !== null, "legacy separator remains rejected");
}
const invalid = [
    "1_", "1__0", "1___0", "1_.0", "1._0", "1.0_", "1.0_e1", "1_e1", "1e_1", "1e+_1", "1e-_1", "1e1_", "1e1__0",
    "0_0", "0_1", "00_0", "08_0", "01_0", "0_0.1", "0_0e1", ".1_", ".1__2", "0x_1", "0x1_", "0x1__2", "0x1_G",
    "0b_1", "0b1_", "0b1__0", "0b1_2", "0o_1", "0o1_", "0o1__2", "0o1_8", "1_0n", "1_0name", "0x1_2n",
];
for (const text of invalid) {
    if (text === "1_0n" || text === "0x1_2n") {
        expect(run(text), { kind: "bigint", value: text === "1_0n" ? 10n : 18n }, "original separated BigInt now executes");
        continue;
    }
    const result = lex(text, true);
    check(result.error !== null && result.error.phase === "parse", "reject: " + text);
    const realm = new Realm((_line: string) => { throw new Error("preparation executed output"); }, "script");
    const prepared = prepareBoundedScript({ id: "bad-separator", text: "console.log('bad');" + text + ";" }, realm);
    check(prepared.kind !== "ready", "whole-source rejection");
}
const source = "\n 1_2.3_4e+0_2;0xF_F;";
const tokens = lex(source, true);
check(tokens.error === null, "raw tokenization");
const first = tokens.tokens[0], second = tokens.tokens[2];
check(first.text === "1_2.3_4e+0_2" && first.start === 2 && first.end === 14 && first.loc.line === 2 && first.loc.column === 2, "raw decimal token");
check(second.text === "0xF_F" && second.start === 15 && second.end === 20 && second.loc.column === 15, "raw radix token");
expect(run("function f(){return 1_000;}f.toString();"), { kind: "string", value: "function f(){return 1_000;}" }, "raw function source");
expect(run("var o={1_000:7,0xF_F(){return 9;}};o[1000]+o[255]();"), { kind: "number", value: 16 }, "numeric property keys");
expect(run("var _1=2;var x_1=3;_1+x_1;"), { kind: "number", value: 5 }, "identifier underscores unchanged");
expect(run("isNaN(Number('1_000'))&&parseInt('1_000')===1&&parseFloat('1.2_3')===1.2;"), { kind: "boolean", value: true }, "string conversions unchanged");
console.log("Numeric separators passed");
