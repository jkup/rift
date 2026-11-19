import { lex, createLexer } from "../src/lexer.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function execute(text: string, expected: string): void {
    const output: string[] = [],
        realm = new Realm((line) => {
            output.push(line);
        }, "script");
    const prepared = prepareBoundedScript({ id: "whitespace", text }, realm);
    check(prepared.kind === "ready", "prepare: " + text);
    if (prepared.kind !== "ready") {
        return;
    }
    const result = evaluateScript(
        createScriptSession({ maxSteps: 20000, maxCalls: 64 }),
        prepared.record,
    ).completion;
    check(result.type === "normal" && output.join("\n") === expected, "execute: " + text);
}
const spaces = [
    9, 11, 12, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202,
    8239, 8287, 12288, 65279,
];
const lines = [10, 13, 8232, 8233];
for (const code of [...spaces, ...lines]) {
    const separator = String.fromCharCode(code),
        newline = lines.includes(code);
    const result = lex("a" + separator + "b", true),
        token = result.tokens[1];
    check(result.error === null && result.tokens.length === 3, "token separation: " + code);
    check(token.text === "b" && token.start === 2 && token.end === 3, "UTF-16 span: " + code);
    check(
        token.loc.line === (newline ? 2 : 1) && token.loc.column === (newline ? 1 : 3),
        "location: " + code,
    );
    const incremental = createLexer("a" + separator + "b", true);
    check(
        incremental.next().text === "a" &&
            incremental.next().text === "b" &&
            incremental.next().kind === "eof",
        "incremental: " + code,
    );
    check(
        (lex("a" + separator + "b").error === null) === (newline || code === 9 || code === 32),
        "legacy boundary: " + code,
    );
    execute(
        separator + "var" + separator + "x" + separator + "=" + separator + "7;console.log(x);",
        "7",
    );
    execute(
        "function f(){return" + separator + "7;}console.log(f());",
        newline ? "undefined" : "7",
    );
    execute("var x=1;// comment" + separator + "x=2;\nconsole.log(x);", newline ? "2" : "1");
    execute(
        "function f(){return/*" + separator + "*/7;}console.log(f());",
        newline ? "undefined" : "7",
    );
    if (!newline) {
        execute(
            separator + '"use strict";function f(){return this;}console.log(f()===undefined);',
            "true",
        );
        execute("console.log('" + separator + "'.charCodeAt(0));", String(code));
        const tick = String.fromCharCode(96);
        execute("console.log(" + tick + separator + tick + ".charCodeAt(0));", String(code));
    }
}
const crlf = lex("a\r\nb", true).tokens[1];
check(
    crlf.start === 3 && crlf.end === 4 && crlf.loc.line === 2 && crlf.loc.column === 1,
    "CRLF is one line boundary",
);
const comment = lex("a/*\r\n*/b", true).tokens[1];
check(
    comment.start === 7 && comment.loc.line === 2 && comment.loc.column === 3,
    "CRLF inside a block comment",
);
for (const code of [0, 8, 0x85, 0x180e, 0x200b, 0x200c, 0x200d, 0x2060]) {
    const result = lex(";" + String.fromCharCode(code) + ";", true);
    check(
        result.error !== null && result.rejection?.kind === "unsupported-syntax",
        "excluded separator: " + code,
    );
}
console.log("script whitespace passed");
