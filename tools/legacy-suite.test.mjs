import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { classifyFixture, runFixture, selectFixtures } from "./legacy-suite.mjs";

test("real process status overrides reported checks; silent completion is separate", async () => {
    for (const [source, expected] of [
        ['console.log("PASS: one")', "reported-success"],
        ['console.log("PASS: one\\nFAIL: two")', "reported-failure"],
        ['console.log("ordinary output")', "completed-without-checks"],
        ['console.log("PASS: one");process.exitCode=1', "runtime-error"],
        ["process.exitCode=2", "parse-error"],
        ["process.exitCode=70", "host-fault"],
        ["process.exitCode=66", "host-fault"],
    ]) {
        assert.equal(
            classifyFixture(await runFixture(process.execPath, ["-e", source])).outcome,
            expected,
        );
    }
});

test("launch failure, deadline and bounded output remain distinct", async () => {
    assert.equal(
        classifyFixture(await runFixture(resolve("build/absent-legacy-executable"), [])).outcome,
        "host-fault",
    );
    assert.equal(
        classifyFixture(await runFixture(process.execPath, ["-e", "setInterval(()=>{},1000)"], 100))
            .outcome,
        "timeout",
    );
    assert.equal(
        classifyFixture(
            await runFixture(process.execPath, ["-e", 'process.stdout.write("x".repeat(2000000))']),
        ).outcome,
        "output-limit",
    );
});

test("explicit summary counts retain failures without double counting markers", () => {
    const result = (stdout) => ({
        stdout,
        status: 0,
        signal: null,
        error: null,
        deadlineExpired: false,
    });
    for (const [stdout, expected] of [
        [
            "Math methods test: 69 passed, 0 failed\n",
            { outcome: "reported-success", checks: 69, failures: 0 },
        ],
        ["Passed: 5/6\nFailed: 1/6\n", { outcome: "reported-failure", checks: 5, failures: 1 }],
        ["Passed: 4/6\nFailed: 2/6\n", { outcome: "reported-failure", checks: 4, failures: 2 }],
        ["Passed: 31/31\n", { outcome: "reported-success", checks: 31, failures: 0 }],
        [
            "PASS: one\nFAIL: two\nSuite tests: 1 passed, 1 failed\nSuite tests: 1 passed, 1 failed\n",
            { outcome: "reported-failure", checks: 1, failures: 1 },
        ],
        [
            "FAIL: one\nSuite tests: 2 passed, 0 failed\n",
            { outcome: "reported-failure", checks: 2, failures: 1 },
        ],
        [
            "Passed: 0/0\nFailed: 0/0\n",
            { outcome: "completed-without-checks", checks: 0, failures: 0 },
        ],
        ["Passed: 5/6\n", { outcome: "completed-without-checks", checks: 0, failures: 0 }],
        [
            "Passed: 7/6\nFailed: -1/6\nSuite tests: 9007199254740992 passed, 0 failed\n",
            { outcome: "completed-without-checks", checks: 0, failures: 0 },
        ],
        [
            "All tests passed!\nFailed to process error: expected example\n",
            { outcome: "completed-without-checks", checks: 0, failures: 0 },
        ],
    ]) {
        assert.deepEqual(classifyFixture(result(stdout)), expected, stdout);
    }
    for (const [status, outcome] of [
        [1, "runtime-error"],
        [2, "parse-error"],
        [70, "host-fault"],
    ]) {
        assert.equal(
            classifyFixture({ ...result("Suite tests: 69 passed, 0 failed\n"), status }).outcome,
            outcome,
        );
    }
    assert.equal(
        classifyFixture({ ...result("Passed: 7/7\n"), deadlineExpired: true }).outcome,
        "timeout",
    );
});

test("hyphenated check markers require exact prefixes and preserve failure precedence", () => {
    const result = (stdout) => ({
        stdout,
        status: 0,
        signal: null,
        error: null,
        deadlineExpired: false,
    });
    for (const [stdout, expected] of [
        [
            "PASS - basic getter\r\nPASS - basic setter\r\n",
            { outcome: "reported-success", checks: 2, failures: 0 },
        ],
        ["PASS - getter\nFAIL - setter\n", { outcome: "reported-failure", checks: 1, failures: 1 }],
        [
            "PASS - getter ✅\nFAIL - setter ❌\n",
            { outcome: "reported-failure", checks: 1, failures: 1 },
        ],
        [
            "PASS - one\nSuite tests: 1 passed, 0 failed\n",
            { outcome: "reported-success", checks: 1, failures: 0 },
        ],
        [
            "FAIL - one\nSuite tests: 9 passed, 0 failed\n",
            { outcome: "reported-failure", checks: 9, failures: 1 },
        ],
        [
            "example PASS - label\nexample FAIL - label\nPASS - \nFAIL - \nPASS -\nFAIL -\nPASS-like\nfail - lower\n",
            { outcome: "completed-without-checks", checks: 0, failures: 0 },
        ],
    ]) {
        assert.deepEqual(classifyFixture(result(stdout)), expected, stdout);
    }
    for (const [status, outcome] of [
        [1, "runtime-error"],
        [2, "parse-error"],
        [70, "host-fault"],
    ]) {
        assert.equal(
            classifyFixture({ ...result("PASS - one\nFAIL - two\n"), status }).outcome,
            outcome,
        );
    }
    assert.equal(
        classifyFixture({ ...result("PASS - one\n"), deadlineExpired: true }).outcome,
        "timeout",
    );
    assert.equal(
        classifyFixture({
            ...result("PASS - one\n"),
            error: { code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" },
        }).outcome,
        "output-limit",
    );
});

test("legacy selection includes nested fixtures and records original exclusions", async () => {
    await mkdir("build", { recursive: true });
    const root = await mkdtemp(resolve("build/legacy-selection-"));
    try {
        await mkdir(join(root, "nested"));
        await mkdir(join(root, "skipped"));
        for (const name of ["a.js", "temp_x.js", "nested/b.js", "skipped/c.js", "notes.txt"]) {
            await writeFile(join(root, name), "");
        }
        const selection = await selectFixtures(root);
        assert.deepEqual(selection.selected, [join(root, "a.js"), join(root, "nested/b.js")]);
        assert.deepEqual(selection.excluded, [join(root, "skipped/c.js"), join(root, "temp_x.js")]);
    } finally {
        await rm(root, { recursive: true });
    }
});
