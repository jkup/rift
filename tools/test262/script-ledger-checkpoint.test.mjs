import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { corpusRoot, scratchRoot } from "./test-support/environment.mjs";
const own = resolve("tools/test262/test-support/checkpoint");
mkdirSync(resolve("build"), { recursive: true });
const output = mkdtempSync(resolve("build/checkpoint-suite-"));
const results = [];
function run(name, args = []) {
    const r = spawnSync(process.execPath, [join(own, name + ".mjs"), ...args], {
        encoding: "utf8",
        maxBuffer: 32e6,
        timeout: 300000,
        env: { ...process.env, RIFT_TEST262_ROOT: corpusRoot, RIFT_TEST_OUTPUT_ROOT: scratchRoot },
    });
    writeFileSync(join(output, name + ".txt"), r.stdout + r.stderr);
    results.push({ name, status: r.status, signal: r.signal, error: r.error?.message ?? null });
    writeFileSync(join(output, "results.json"), JSON.stringify(results, null, 2) + "\n");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(r.signal, null);
    const last = r.stdout.trim().split("\n").at(-1);
    return JSON.parse(last);
}
test(
    "checkpoint implementation: public ownership, boundaries, complete literals, migrations and isolated faults",
    { timeout: 1200000 },
    () => {
        const actual = run("public");
        run("boundaries", [actual.run]);
        const migrated = run("migrations");
        assert.equal(migrated.completeSelections, 11);
        assert.equal(migrated.negativeControls, 4);
        run("literal-api", [migrated.run]);
        assert.equal(run("faults").controls, 22);
        const corrected = run("resolve-faults");
        assert.equal(corrected.scenarios, 3);
        assert.equal(corrected.repeatedCleanupFailures, 4);
        assert.equal(corrected.recoveries, 3);
        assert.equal(run("additional").additionalControls, 4);
        console.log("Checkpoint evidence: " + output);
    },
);
