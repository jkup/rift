import { lex, createLexer } from "../src/lexer.js";
import { scanPrivateIdentifier } from "../src/private-identifier.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
const spellings: [string, string, boolean][] = [
    ["alpha", "alpha", false],
    ["π", "π", false],
    ["𐐀", "𐐀", false],
    ["a\u0301", "a\u0301", false],
    ["a\u200c\u200d", "a\u200c\u200d", false],
    ["\\u0061", "a", true],
    ["a\\u0062", "ab", true],
    ["\\u{10400}", "𐐀", true],
    ["\\u{000000000061}", "a", true],
    ["\\u0069f", "if", true],
    ["a\\u0030", "a0", true],
];
for (const [spelling, name, escaped] of spellings) {
    const source = "\r\n  " + spelling + ";";
    const result = lex(source, true),
        token = result.tokens[0];
    check(result.error === null && result.tokens.length === 3, "scan " + spelling);
    check(
        token.kind === "word" && token.text === name && token.escaped === escaped,
        "name and escape provenance",
    );
    check(
        token.start === 4 &&
            token.end === 4 + spelling.length &&
            token.loc.line === 2 &&
            token.loc.column === 3,
        "source span",
    );
    check(
        source.slice(token.start, token.end) === spelling &&
            result.tokens[1].loc.column === 3 + spelling.length,
        "raw source width",
    );
    const incremental = createLexer(source, true);
    check(
        incremental.next().text === name &&
            incremental.next().text === ";" &&
            incremental.next().kind === "eof",
        "incremental tokens",
    );
    check(incremental.next().kind === "eof" && incremental.result().error === null, "stable end");
    const privateName = scanPrivateIdentifier("#" + spelling, 0);
    check(
        privateName.kind === "ready" &&
            privateName.text === "#" + name &&
            privateName.end === spelling.length + 1,
        "private scanner agreement",
    );
}
for (const source of [
    "\\u0030x",
    "\\u200C",
    "\\uD800",
    "\\uD801\\uDC00",
    "\\u{}",
    "\\u{110000}",
    "\\u00ZZ",
    "\\x61",
    "a\\u002D",
    "1π",
    "1\\u0061",
    "1n\\u0061",
]) {
    const result = lex(source, true);
    check(
        result.error !== null && result.rejection?.kind === "unsupported-syntax",
        "invalid token remains explicit: " + source,
    );
}
const executions: [string, string][] = [
    ["var \\u0061=7;console.log(a);", "7"],
    ["var π=7;console.log(\\u03c0);", "7"],
    ["var 𐐀=7;console.log(\\u{10400});", "7"],
    ["var é=1,é=2;console.log(é,é);", "1 2"],
    ["var a=7;console.log(({\\u0061}).a);", "7"],
    ["var o={\\u0069f:7};console.log(o.\\u0069f);", "7"],
    ["var o={\\u0072eturn(){return 7;}};console.log(o.return());", "7"],
    ["function \\u0066(){return 7;}console.log(f.name,f());", "f 7"],
    ["function \\u0066(){}console.log(f.toString());", "function \\u0066(){}"],
    ["var a=0;\\u0061:while(true){a=7;break a;}console.log(a);", "7"],
    ["var let=[7];l\\u0065t[0];console.log(let[0]);", "7"],
    ["var let;for(l\\u0065t of [7]){}console.log(let);", "7"],
    ["var let={};for(l\\u0065t.x of [7]){}console.log(let.x);", "7"],
    ["function async(x){return x;}console.log(a\\u0073ync(7));", "7"],
    ["var a\\u0077ait=7;console.log(await);", "7"],
    ["var y\\u0069eld=7;console.log(yield);", "7"],
    ["var o={g\\u0065t(){return 7;}};console.log(o.get());", "7"],
    ["var o={get \\u0069f(){return 7;}};console.log(o.if);", "7"],
    ["class C{st\\u0061tic(){return 7;}}console.log(new C().static());", "7"],
    ["class C{st\\u0061tic=7;}console.log(new C().static,C.static);", "7 undefined"],
    ["class C{c\\u006fnstructor(){this.x=7;}}console.log(new C().x);", "7"],
    ["var p={x:7};console.log(({__pr\\u006fto__:p}).x);", "7"],
    ["var {\\u0061:x}={a:7};console.log(x);", "7"],
    ["var [\\u0061]=[7];console.log(a);", "7"],
    ["var \\u0061;({a}= {a:7});console.log(a);", "7"],
    ["function f(\\u0061=7){return a;}console.log(f());", "7"],
    ["console.log(((\\u0061)=>a)(7));", "7"],
    ["try{throw 7;}catch(\\u0061){console.log(a);}", "7"],
];
for (const [text, expected] of executions) {
    const output: string[] = [],
        realm = new Realm((line) => {
            output.push(line);
        }, "script");
    const prepared = prepareBoundedScript({ id: "identifier-execution", text }, realm);
    check(prepared.kind === "ready", "prepare: " + text);
    if (prepared.kind !== "ready") {
        continue;
    }
    const result = evaluateScript(
        createScriptSession({ maxSteps: 20000, maxCalls: 64 }),
        prepared.record,
    ).completion;
    check(result.type === "normal" && output.join("\n") === expected, "execute: " + text);
}
for (const text of [
    "var \\u0069f=1;",
    "\\u0074rue;",
    "\\u0074his;",
    "\\u0074ypeof 1;",
    "'x' \\u0069n {};",
    "function f(){return new.\\u0074arget;}",
    "a\\u0073ync function f(){}",
    "async f\\u0075nction f(){}",
    "a\\u0073ync x=>x;",
    "l\\u0065t x=1;",
    "for(var x o\\u0066 []){}",
    "({g\\u0065t x(){}});",
    "class C{st\\u0061tic x=1;}",
    "class C{st\\u0061tic {}}",
    "class C{constructor(){}c\\u006fnstructor(){}}",
    "class C{static pr\\u006ftotype(){}}",
    "class C{c\\u006fnstructor=1;}",
    "let l\\u0065t=1;",
    "async function f(a\\u0077ait){}",
    "async function f(){a\\u0077ait 1;}",
    "function* f(y\\u0069eld){}",
    '"use strict";var \\u0070ublic=1;',
    '"use strict";var \\u0065val=1;',
    "let a;let \\u0061;",
]) {
    const realm = new Realm((_line: string) => {}, "script");
    check(
        prepareBoundedScript({ id: "identifier-rejection", text }, realm).kind !== "ready",
        "reject: " + text,
    );
}
check(lex("π").error !== null && lex("\\u0061").error !== null, "legacy lexing remains unchanged");
check(parse("var \\u0061=1;").error !== null, "legacy parser remains unchanged");
console.log("ordinary identifiers passed");
