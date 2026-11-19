import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setImmediate } from "node:timers/promises";
import { completed } from "./probe-verdict.mjs";
import { runNativeCommand, mapConcurrent } from "./native-build-runner.mjs";

test("native command retains exact output and nonzero exit status", async () => {
    const result = await runNativeCommand(process.execPath, [
        "-e",
        "process.stdout.write('out');process.stderr.write('err');process.exitCode=7;",
    ]);
    assert.deepEqual(result, {
        status: 7,
        signal: null,
        error: null,
        stdout: "out",
        stderr: "err",
    });
    assert.equal(completed(result), false);
});

test("native command reports launch failures", async () => {
    const result = await runNativeCommand(join(tmpdir(), "rift-missing-" + randomUUID()), []);
    assert.equal(result.status, null);
    assert.equal(result.error.code, "ENOENT");
    assert.equal(completed(result), false);
});

test("native command timeout cannot be accepted as success", async () => {
    const result = await runNativeCommand(process.execPath, ["-e", "setInterval(()=>{},1000);"], {
        timeout: 50,
    });
    assert.equal(completed(result), false);
    assert.ok(result.error !== null || result.signal !== null);
});

test("native command output overflow cannot be accepted as success", async () => {
    const result = await runNativeCommand(
        process.execPath,
        ["-e", "process.stdout.write('x'.repeat(2048));"],
        { maxBuffer: 64 },
    );
    assert.equal(completed(result), false);
    assert.equal(result.error.code, "ERR_CHILD_PROCESS_STDIO_MAXBUFFER");
});

test("bounded workers execute every item once and retain input order", async () => {
    let active = 0,
        peak = 0;
    const seen = [];
    const results = await mapConcurrent([0, 1, 2, 3, 4, 5], 2, async (item) => {
        active++;
        peak = Math.max(peak, active);
        seen.push(item);
        await setImmediate();
        if (item === 0) {
            await setImmediate();
        }
        active--;
        return item * 2;
    });
    assert.equal(peak, 2);
    assert.equal(active, 0);
    assert.deepEqual(seen, [0, 1, 2, 3, 4, 5]);
    assert.deepEqual(results, [0, 2, 4, 6, 8, 10]);
});

test("invalid worker bounds reject before starting work", async () => {
    for (const jobs of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        await assert.rejects(
            mapConcurrent([1], jobs, () => assert.fail("unexpected work")),
            /positive safe integer/,
        );
    }
});

test("empty and oversized worker pools preserve the item set", async () => {
    assert.deepEqual(await mapConcurrent([], 2, () => assert.fail("unexpected work")), []);
    assert.deepEqual(await mapConcurrent([7], 100, async (item) => item), [7]);
    const result = await runNativeCommand(process.execPath, ["-e", "process.stdout.write('ok');"]);
    assert.equal(completed(result), true);
    assert.equal(result.stdout, "ok");
});
