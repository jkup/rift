import { lex } from "../src/lexer.js";
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
    const prepared = prepareBoundedScript({ id: "legacy-escape", text }, realm);
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
const slash = String.fromCharCode(92);
for (const [digits, expected] of [
    ["0", "0"],
    ["00", "0"],
    ["0000", "0,48"],
    ["1", "1"],
    ["37", "31"],
    ["40", "32"],
    ["77", "63"],
    ["100", "64"],
    ["377", "255"],
    ["400", "32,48"],
    ["777", "63,55"],
    ["378", "31,56"],
    ["08", "0,56"],
    ["09", "0,57"],
    ["078", "7,56"],
    ["8", "56"],
    ["9", "57"],
    ["80", "56,48"],
    ["0a", "0,97"],
    ["01a", "1,97"],
    ["38", "3,56"],
    ["48", "4,56"],
]) {
    const literal = '"' + slash + digits + '"',
        source = "\r\n " + literal + ";";
    const lexical = lex(source, true),
        token = lexical.tokens[0];
    check(lexical.error === null && token.kind === "string", "scan: " + digits);
    check(
        token.legacyEscape === (digits !== "0" && digits !== "0a"),
        "escape provenance: " + digits,
    );
    check(
        token.start === 3 &&
            token.end === 3 + literal.length &&
            source.slice(token.start, token.end) === literal,
        "raw span",
    );
    check(token.loc.line === 2 && token.loc.column === 2, "source location");
    execute(
        "var s=" +
            literal +
            ';var a=[];for(var i=0;i<s.length;i++)a.push(s.charCodeAt(i));console.log(a.join(","));',
        expected,
    );
}
const one = '"' + slash + '1"';
for (const text of [
    '"use strict";' + one + ";",
    one + ';"use strict";',
    "function f(){" + one + ';"use strict";}',
    '"use strict";({' + one + ":1});",
    "class C{" + one + "(){}}",
    "class C{x=" + one + ";}",
    "class C{static{" + one + ";}}",
]) {
    const prepared = prepareBoundedScript(
        { id: "strict-escape", text },
        new Realm((_line: string) => {}, "script"),
    );
    check(
        prepared.kind === "blocked" &&
            prepared.rejection.kind === "syntax-error" &&
            prepared.rejection.ruleCode === "strict-legacy-escape",
        "strict certificate: " + text,
    );
}
execute(
    "var o={" + one + '(){"use strict";return 7}};console.log(o[String.fromCharCode(1)]());',
    "7",
);
execute(
    '"use' + slash + '040strict";function f(){return this}console.log(f()===undefined);',
    "false",
);
execute(
    '"use strict";try{eval(' + JSON.stringify(one) + ")}catch(e){console.log(e.name)}",
    "SyntaxError",
);
execute('"use strict";console.log((0,eval)(' + JSON.stringify(one) + ").charCodeAt(0));", "1");
execute(
    "try{Function(" +
        JSON.stringify('"use strict";return ' + one) +
        ")}catch(e){console.log(e.name)}",
    "SyntaxError",
);
for (const suffix of ["@", 'import x from "x";', "with({}){}"]) {
    const prepared = prepareBoundedScript(
        { id: "escape-veto", text: '"use strict";' + one + ";" + suffix },
        new Realm((_line: string) => {}, "script"),
    );
    check(
        prepared.kind === "blocked" && prepared.rejection.kind === "unsupported-syntax",
        "whole-source grammar veto",
    );
}
check(lex(one).error !== null, "legacy lexer boundary");
console.log("legacy string escapes passed");
