import test from "node:test";
import assert from "node:assert/strict";
import { inspectPolicy } from "./readability-policy.mjs";

const rules = (source, file = "src/example.ts") =>
    inspectPolicy(file, source).map((issue) => issue.rule);

test("semantic imports stay within the semantic core", () => {
    for (const source of [
        'import fs from "node:fs";',
        'import fs from "fs";',
        'export * from "../tools/host.js";',
        'import "./cli.js";',
        'import "./host/script-observation.js";',
        'import "./host/observation-driver.js";',
        'import("node:fs");',
        "import(target);",
    ]) {
        assert.deepEqual(rules(source), ["core-import-boundary"]);
    }
    assert.deepEqual(rules('import { Value } from "./runtime.js";'), []);
    assert.deepEqual(rules('import fs from "node:fs";', "src/cli.ts"), []);
    assert.deepEqual(rules('import fs from "node:fs";', "src/host/observation-driver.ts"), []);
    assert.deepEqual(rules('import fs from "node:fs";', "tools/host.mjs"), []);
});

test("compiler field restriction covers ordinary and computed literal names", () => {
    for (const field of ["prototype", '"prototype"', '["prototype"]']) {
        assert.deepEqual(rules(`class Guest { ${field} = null; }`), ["compiler-prototype-field"]);
    }
    assert.deepEqual(rules("class Guest { prototypeSlot = null; }"), []);
    assert.deepEqual(rules("class Guest { [prototype] = null; }"), []);
});

test("suppression policy rejects blanket, unexplained and block-wide exceptions", () => {
    for (const comment of [
        "oxlint-disable",
        "oxlint-disable-next-line",
        "eslint-disable no-unused-vars -- This disables a whole file.",
        "oxlint-disable-next-line no-unused-vars",
        'eslint no-unused-vars: "off"',
    ]) {
        assert.deepEqual(rules(`// ${comment}\nconst x = 1;`), ["explained-suppression"]);
    }
    assert.deepEqual(
        rules(
            "// oxlint-disable-next-line no-unused-vars -- The probe deliberately retains its callback signature.\nconst x = 1;",
        ),
        [],
    );
    assert.deepEqual(rules('const text = "// oxlint-disable";'), []);
});
