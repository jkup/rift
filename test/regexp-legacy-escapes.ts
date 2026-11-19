import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parseRegExpSyntax } from "../src/regexp/regexp-pattern-syntax.js";

function check(value: boolean, message: string): void {
    if (!value) {
        throw new Error(message);
    }
}
function passes(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "legacy-regexp", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    const session = createScriptSession(),
        result = evaluateScript(session, prepared.record).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
    check(session.inspect().active === null && session.inspect().calls === 0, "caller restored");
}
for (const text of [
    "/^\\123$/.test('S') && /^\\377$/.test('ÿ') && /^\\400$/.test(' 0') && /^\\777$/.test('?7')",
    "/^\\08$/.test('\u00008') && /^\\09$/.test('\u00009') && /^\\118$/.test('\t8')",
    "/^\\8+$/.test('888') && /^\\89+$/.test('899') && !/^\\89+$/.test('8989')",
    "/^(a)\\1$/.test('aa') && /^\\1(a)$/.test('a')",
    "/^(a)\\18$/.test('a\u00018') && !/^(a)\\18$/.test('aa8')",
    "/^(a)(a)(a)(a)(a)(a)(a)(a)(a)(a)\\10$/.test('aaaaaaaaaaa')",
    "/^(a)[\\1]$/.test('a\u0001') && !/^(a)[\\1]$/.test('aa')",
    "/^[\\400]$/.test(' ') && /^[\\400]$/.test('0') && !/^[\\400]$/.test(' 0')",
    "/^[\\c1]$/.test('\u0011') && /^[\\c_]$/.test('\u001f')",
    "/^\\c1$/.test('\\\\c1') && /^\\c*$/.test('\\\\ccc') && /^\\c*$/.test('\\\\')",
    "/^[\\c]$/.test('\\\\') && /^[\\c]$/.test('c') && /^[\\c!]$/.test('!')",
    "/^\\k<x>$/.test('k<x>') && /^[\\k]$/.test('k')",
    "/^(?<x>a)\\k<x>$/.test('aa') && /^\\k<x>(?<x>a)$/.test('a')",
    "'use strict';/^\\07$/.test('\u0007')",
    "var ok=false;try{new RegExp('(?<x>a)[\\\\k]')}catch(e){ok=e instanceof SyntaxError}ok",
    "var ok=false;try{new RegExp('\\\\8','u')}catch(e){ok=e instanceof SyntaxError}ok",
]) {
    passes(text);
}

for (const source of [
    String.raw`\123`,
    String.raw`(a)\18`,
    String.raw`\999999999999`,
    String.raw`[\c1\c_]`,
    String.raw`\c*`,
    String.raw`\k<x>(?<x>a)`,
]) {
    let steps = 0;
    check(
        parseRegExpSyntax(source, () => {
            steps++;
            return true;
        }).kind === "ready",
        "budget baseline " + source,
    );
    for (let budget = 0; budget < steps; budget++) {
        let remaining = budget;
        check(
            parseRegExpSyntax(source, () => remaining-- > 0).kind === "stopped",
            "budget " + source + ":" + budget,
        );
    }
}
for (const source of [
    String.raw`\01`,
    String.raw`\8`,
    String.raw`[\1]`,
    String.raw`\c1`,
    String.raw`[\c_]`,
    String.raw`\k`,
]) {
    check(
        parseRegExpSyntax(source, () => true, true).kind === "syntax-error",
        "Unicode rejection " + source,
    );
}
for (const source of ["(?<=a)", String.raw`[\d-a]`, String.raw`[a-\d]`]) {
    check(
        parseRegExpSyntax(source, () => true).kind ===
            (source === "(?<=a)" ? "ready" : "unsupported"),
        "retained boundary " + source,
    );
}
console.log("regexp legacy escapes passed");
