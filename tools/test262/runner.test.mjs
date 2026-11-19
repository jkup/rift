import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { discoverTests, inputStore, skipReason } from "./runner-input.mjs";
import {
    defaultLimits,
    runProcess,
    executeTest,
    checkHarness,
    classifyResult,
} from "./runner-execute.mjs";
import { options, summarize } from "./run.mjs";
import { mapConcurrent } from "../native-build-runner.mjs";

const scratchRoot = resolve("build/test262-runner-tests");
await mkdir(scratchRoot, { recursive: true });
const directory = await mkdtemp(join(scratchRoot, "run-"));
const corpus = join(directory, "corpus");
await mkdir(join(corpus, "test"), { recursive: true });
await mkdir(join(corpus, "harness"));
const sources = join(directory, "sources");
await mkdir(sources);
for (const name of ["assert.js", "sta.js"]) {
    await writeFile(
        join(corpus, "harness", name),
        await readFile(`test/fixtures/harness-bundle/${name}`),
    );
}
const store = inputStore(corpus, sources);
const policy = { features: { WeakRef: "not implemented" } };
const execution = {
    command: process.env.RIFT_TEST262_TEST_DRIVER ?? process.execPath,
    prefix: process.env.RIFT_TEST262_TEST_DRIVER
        ? []
        : [resolve("build/node/src/script-observation-driver.js")],
    directory,
    limits: defaultLimits,
};
async function prepare(name, frontmatter, source) {
    const path = `test/${name}.js`;
    await writeFile(
        join(corpus, path),
        `/*---\ndescription: runner regression\n${frontmatter}\n---*/\n${source}`,
    );
    return store.prepare(path, policy);
}

test("metadata expands both modes; fixtures are not standalone tests", async () => {
    const rows = await prepare("variants", "", "assert.sameValue(1, 1);");
    assert.deepEqual(
        rows.map((row) => row.variant),
        ["non-strict", "strict"],
    );
    assert.equal(rows[0].inputs.length, 3);
    assert.ok(rows[1].inputs.at(-1).text.startsWith('"use strict";\n'));
    assert.equal(rows[0].inputs[0], rows[1].inputs[0]);
    await writeFile(join(corpus, "test/ignored_FIXTURE.js"), "");
    assert.ok(!(await discoverTests(corpus)).some((path) => path.includes("_FIXTURE")));
});

test("raw tests receive no harness; unsupported profiles retain variants", async () => {
    const raw = await prepare("raw", "flags: [raw]", "1;");
    assert.equal(raw[0].inputs.length, 1);
    assert.equal(raw[0].variant, "raw");
    const skipped = await prepare("skip", "features: [WeakRef]", "new WeakRef({});");
    assert.equal(skipped.length, 2);
    assert.ok(skipped.every((row) => row.status === "skip" && row.reason.includes("WeakRef")));
    const module = await prepare("module", "flags: [module]", "export default 1;");
    assert.equal(module[0].variant, "module");
    assert.equal(module[0].status, "skip");
    assert.equal(
        skipReason({ flags: [], features: ["unknown-new-feature"] }, "test/a.js", policy),
        null,
    );
});

test("bad metadata and missing includes are input errors, never skips", async () => {
    const bad = await prepare("bad", "flags: [onlyStrict, noStrict]", "");
    assert.equal(bad[0].status, "input-error");
    const missing = await prepare("missing", "includes: [missing.js]", "");
    assert.equal(missing.length, 2);
    assert.ok(missing.every((row) => row.status === "input-error"));
    const traversal = await prepare("traversal", "includes: [../test/raw.js]", "");
    assert.equal(traversal[0].status, "input-error");
});

test("current corpus raw modules and CR-only metadata preserve source bytes", async () => {
    const module = await prepare("raw-module", "flags: [module, raw]", "#!");
    assert.equal(module[0].status, "skip");
    assert.equal(module[0].variant, "module");
    const text = "/*---\rdescription: CR-only source\rflags: [noStrict]\r---*/\r1;";
    await writeFile(join(corpus, "test/cr.js"), text);
    const rows = await store.prepare("test/cr.js", policy);
    assert.equal(rows[0].inputs.at(-1).text, text);
});

test("real driver retains assertions, negative type/phase and Realm isolation", async () => {
    const controls = await checkHarness(store, execution);
    assert.ok(
        controls.every((control) => control.status === "pass"),
        JSON.stringify(controls),
    );
    const cases = [
        ["positive", "", "assert.sameValue(1 + 1, 2);", "pass"],
        ["assertion", "", "assert.sameValue(1, 2);", "fail"],
        [
            "negative",
            "negative:\n  phase: runtime\n  type: TypeError",
            "throw new TypeError();",
            "pass",
        ],
        [
            "wrong-type",
            "negative:\n  phase: runtime\n  type: TypeError",
            "throw new RangeError();",
            "fail",
        ],
        [
            "engine-reference-error",
            "negative:\n  phase: runtime\n  type: ReferenceError",
            "missingBinding;",
            "pass",
        ],
        [
            "engine-type-error",
            "negative:\n  phase: runtime\n  type: TypeError",
            "null.value;",
            "pass",
        ],
        ["parse", "negative:\n  phase: parse\n  type: SyntaxError", "return;", "pass"],
        [
            "wrong-phase",
            "negative:\n  phase: parse\n  type: SyntaxError",
            "throw new SyntaxError();",
            "fail",
        ],
        ["isolated", "", "assert.sameValue(typeof leaked, 'undefined'); var leaked = 1;", "pass"],
    ];
    for (const [name, frontmatter, source, expected] of cases) {
        const rows = await prepare(name, frontmatter, source);
        const results = await mapConcurrent(rows, 2, (row) => executeTest(row, execution));
        assert.deepEqual(
            results.map((result) => result.status),
            [expected, expected],
            name + JSON.stringify(results),
        );
    }
});

test("harness errors and unsupported diagnostics cannot satisfy negative tests", async () => {
    await writeFile(join(corpus, "harness/broken.js"), "throw new TypeError();");
    const rows = await prepare(
        "broken-harness",
        "includes: [broken.js]\nnegative:\n  phase: runtime\n  type: TypeError",
        "throw new TypeError();",
    );
    const result = await executeTest(rows[0], execution);
    assert.equal(result.status, "harness-error");
    assert.equal(
        classifyResult(
            {
                operation: { stage: "test" },
                result: { kind: "unsupported-syntax", capabilityCode: "parse.unexpected" },
            },
            { phase: "parse", type: "SyntaxError" },
        ).status,
        "unsupported",
    );
});

test("transport distinguishes timeout, crash, output cap, spawn error and cancellation", async () => {
    const script = join(directory, "transport.mjs");
    await writeFile(
        script,
        `
const mode = process.argv[2];
if (mode === "hang") setInterval(() => {}, 1000);
if (mode === "crash") process.exitCode = 7;
if (mode === "output") process.stdout.write("x".repeat(10000));
`,
    );
    for (const [mode, expected] of [
        ["hang", "timeout"],
        ["crash", "crash"],
        ["output", "output-limit"],
    ]) {
        const result = await runProcess(process.execPath, [script, mode], {
            wallMs: 500,
            outputBytes: 100,
        });
        assert.equal(result.status, expected);
        assert.ok(result.output.length <= 100);
    }
    const absent = await runProcess(join(directory, "missing.exe"), [], defaultLimits);
    assert.equal(absent.status, "harness-error");
    const controller = new AbortController();
    controller.abort();
    const cancelled = await runProcess(
        process.execPath,
        [script, "hang"],
        defaultLimits,
        controller.signal,
    );
    assert.equal(cancelled.status, "cancelled");
});

test("missing and malformed result files fail closed", async () => {
    const rows = await prepare("protocol", "flags: [raw]", "1;");
    const script = join(directory, "bad-driver.mjs");
    await writeFile(
        script,
        "import {writeFileSync} from 'node:fs'; writeFileSync(process.argv[7], '{}');",
    );
    const malformed = await executeTest(rows[0], {
        ...execution,
        command: process.execPath,
        prefix: [script],
    });
    assert.equal(malformed.status, "harness-error");
    await writeFile(script, "");
    const missing = await executeTest(rows[0], {
        ...execution,
        command: process.execPath,
        prefix: [script],
    });
    assert.equal(missing.status, "harness-error");
});

test("a valid result cannot override a later crash or output overflow", async () => {
    const rows = await prepare("late-fault", "flags: [raw]", "1;");
    const script = join(directory, "late-fault.mjs");
    const delegate = `import {spawnSync} from 'node:child_process';
spawnSync(${JSON.stringify(execution.command)}, ${JSON.stringify(execution.prefix)}.concat(process.argv.slice(2)), {stdio:'inherit'});`;
    for (const [fault, status] of [
        ["process.exitCode = 7;", "crash"],
        ["process.stdout.write('x'.repeat(10000));", "output-limit"],
    ]) {
        await writeFile(script, delegate + fault);
        const result = await executeTest(rows[0], {
            ...execution,
            command: process.execPath,
            prefix: [script],
            limits: { ...defaultLimits, outputBytes: 100 },
        });
        assert.equal(result.status, status);
    }
});

test("summary keeps denominators and CLI rejects invalid scheduling controls", () => {
    assert.deepEqual(
        summarize([{ status: "pass" }, { status: "skip" }, { status: "unsupported" }]),
        {
            selected: 3,
            knownVariants: 3,
            unknownVariantFiles: 0,
            counts: { pass: 1, skip: 1, unsupported: 1 },
            exitCode: 1,
        },
    );
    assert.equal(summarize([{ status: "crash" }]).exitCode, 2);
    assert.equal(summarize([{ status: "input-error", variant: null }]).unknownVariantFiles, 1);
    assert.equal(summarize([{ status: "pass" }, { status: "skip" }]).exitCode, 0);
    for (const args of [
        ["--jobs", "0"],
        ["--jobs", "1.5"],
        ["--timeout", "Infinity"],
        ["--oops"],
    ]) {
        assert.throws(() => options(args));
    }
});
