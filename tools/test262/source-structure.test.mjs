import test from "node:test";
import assert from "node:assert/strict";
import { sourceStructure, replaceImportSources } from "./test-support/source-structure.mjs";

test("isolated import rewrites require one exact module and preserve other bytes", () => {
    const source = "import { read } from 'original';\nconst text = 'original';";
    assert.equal(
        replaceImportSources(source, { original: "replacement" }),
        "import { read } from \"replacement\";\nconst text = 'original';",
    );
    assert.throws(() => replaceImportSources(source, { missing: "replacement" }), /exactly one/);
    assert.throws(
        () => replaceImportSources(source + "\nimport 'original';", { original: "replacement" }),
        /exactly one/,
    );
});

test("source contracts ignore formatting and optional statement braces", () => {
    assert.deepEqual(
        sourceStructure("if (ready) send('value');"),
        sourceStructure('if(ready) { send("value"); }'),
    );
});

test("source contracts retain values, order, operators, and lexical scopes", () => {
    for (const [before, after] of [
        ["send('one')", "send('two')"],
        ["first(); second();", "second(); first();"],
        ["if (a && b) send()", "if (a || b) send()"],
        ["{ let x = 1; }", "let x = 1;"],
        ["if (ok) { let x = 1; }", "if (ok) { var x = 1; }"],
        ["tag`\\n`", "tag`\n`"],
    ]) {
        assert.notDeepEqual(sourceStructure(before), sourceStructure(after));
    }
    assert.throws(() => sourceStructure("const = ;"), /invalid source/);
});
