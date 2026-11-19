import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { lex } from "../src/lexer.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const cases = [
    "class C{1n;static 0xffn;}var c=new C();Object.hasOwn(c,1)&&c[1]===undefined&&Object.hasOwn(C,255)&&C[255]===undefined",
    "0n===BigInt(0)&&-0n===0n&&typeof 1n===\"bigint\"",
    "9007199254740993n===BigInt(\"9007199254740993\")&&9007199254740993n!==9007199254740992n",
    "0xffn===255n&&0XFFn===255n&&0o777n===511n&&0O777n===511n&&0b101n===5n&&0B101n===5n",
    "1_234_567n===1234567n&&0xFF_FFn===65535n&&0b10_01n===9n&&0o7_7n===63n",
    "2n**100n===1267650600228229401496703205376n&&-7n/3n===-2n",
    "1n.toString()===\"1\"&&0xffn.toString(16)===\"ff\"",
    "var o={9007199254740993n:7,0xffn:8};o[\"9007199254740993\"]===7&&o[255]===8",
    "var o={1n(){return 7},get 2n(){return 8},set 3n(v){this.saved=v}};o[3]=9;o[1]()===7&&o[2]===8&&o.saved===9",
    "class C{1n(){return 7}get 2n(){return 8}set 3n(v){this.saved=v}static 4n(){return 9}}var c=new C();c[3]=10;c[1]()===7&&c[2]===8&&c.saved===10&&C[4]()===9",
    "var {1n:x,0xffn:y}={1:7,255:8};x===7&&y===8",
    "var x;({9007199254740993n:x}={\"9007199254740993\":7});x===7",
    "function f({0x10n:x}){return x}f({16:7})===7",
    "var x=1n;x++;x+=2n;x===4n",
    "function* f(){return 3n+(yield 2n)}var g=f();g.next().value===2n&&g.next(4n).value===7n",
    "var n=0;for(var x of [1n,2n])n+=Number(x);n===3",
    "\"use strict\";0n===0x0n&&1_0n===10n",
    "String.raw`x${1n}y`===\"x1y\"&&`${0xffn}`===\"255\"",
    "var x=1n;switch(x){case 1: x=9n;break;case 1n:x=2n}x===2n",
    "Object.keys({0x10n:1,16n:2}).length===1&&({0x10n:1,16n:2})[16]===2",
    "Object.getOwnPropertyNames(class{0x10n(){}}.prototype)[0]===\"16\""
];
for (let i = 0; i < cases.length; i++) {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "bigint-literal", text: cases[i] }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare case " + i + ": " + prepared.kind);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "literal case " + i);
}
const invalid = [
    "00n",
    "01n",
    "08n",
    "0_0n",
    "1.0n",
    "1.n",
    ".1n",
    "1e1n",
    "1E+1n",
    "0xn",
    "0bn",
    "0on",
    "0b2n",
    "0o8n",
    "0xgn",
    "1_n",
    "1__0n",
    "0x_fn",
    "0xff_n",
    "1n0",
    "1nn",
    "1nfoo",
    "0xffn0",
    "0xffnfoo",
    "1N",
    "1n=2n",
    "++1n",
    "1n++",
    "({1n})",
    "class C{1n,}"
];
for (const text of invalid) {
    const prepared = prepareBoundedScript({ id: "bigint-invalid", text }, new Realm((_line: string) => {}, "script"));
    check(prepared.kind !== "ready", "reject " + text);
}
const tokens = lex("0n 0xffn 1_000n", true);
check(tokens.error === null && tokens.tokens[0].kind === "bigint" && tokens.tokens[0].start === 0 && tokens.tokens[0].end === 2, "decimal token range");
check(tokens.tokens[1].text === "0xffn" && tokens.tokens[1].start === 3 && tokens.tokens[1].end === 8, "radix token range");
check(tokens.tokens[2].text === "1_000n" && tokens.tokens[2].start === 9 && tokens.tokens[2].end === 15, "separator token range");
check(lex("1n").error !== null, "legacy numeric grammar unchanged");
console.log("bigint literals passed");
