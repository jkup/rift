import { readFixtureFileSync as readFileSync } from "./test-support/fixture-files.mjs";
import { join } from "node:path";
import { scratchRoot } from "./test-support/environment.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parseScriptDriverResult } from "./script-driver-result.mjs";
import { parseScriptEnvelope, assertScriptContext } from "./script-result.mjs";
const matrix = JSON.parse(readFileSync("test/fixtures/tooling/ts-035d2-p/wire-matrix.json"));
test("D2 real serializer bytes: both hosts, two runtime inputs, both closed codes", () => {
    const results = [];
    for (const row of matrix.rows) {
        const [lane, input, action, role, rule, diagnostic] = row.id.split("/");
        const args = [
            "test/fixtures/script-strict-rule-dispatch/" + input + ".js",
            input,
            "wire",
            action,
            role,
            rule,
            diagnostic,
            row.binding.requestSha256,
        ];
        const r = spawnSync(
            lane === "node" ? process.execPath : "build/native/script-strict-rule-dispatch.exe",
            lane === "node" ? ["build/node/test/script-strict-rule-dispatch.js", ...args] : args,
            { encoding: "utf8", timeout: 60000, maxBuffer: 4 * 1024 * 1024 },
        );
        results.push({
            id: row.id,
            productionEmission: row.productionEmission,
            status: r.status,
            signal: r.signal,
            stdout: r.stdout,
            stderr: r.stderr,
        });
        writeFileSync(
            join(scratchRoot, "script-strict-rule-wire-results.json"),
            JSON.stringify(results, null, 2) + "\n",
        );
        assert.equal(r.status, 0, row.id + ": " + r.stderr);
        assert.equal(r.signal, null);
        const bytes = r.stdout.trim();
        // oxlint-disable-next-line no-control-regex -- The protocol regression deliberately checks forbidden NUL bytes.
        assert.ok(!/[^\x00-\x7f]/.test(bytes));
        assert.equal(bytes, row.ascii, row.id + " exact ASCII serialization");
        assert.deepEqual(JSON.parse(bytes), row.child, row.id + " literal serialized result");
        assert.deepEqual(
            parseScriptDriverResult(Buffer.from(bytes), row.binding),
            row.child,
            row.id + " child decoder",
        );
        // Bind the independently decoded envelope to the actual producer's fields.
        const child = JSON.parse(bytes),
            envelope = structuredClone(row.envelope);
        for (const key of [
            "operation",
            "source",
            "testBodyEvaluated",
            "harnessValidated",
            "preflightId",
            "completedUnits",
            "inspection",
        ]) {
            envelope.evidence[key] = child[key];
        }
        envelope.observation = child.result;
        assert.deepEqual(
            parseScriptEnvelope(JSON.stringify(envelope), row.binding),
            row.envelope,
            row.id + " envelope decoder",
        );
        assert.deepEqual(assertScriptContext(envelope, row.context, row.binding), row.envelope);
    }
    assert.equal(results.length, 64);
});
test("D2 frozen mutations, closed schema, v1 exclusion and independent transport priority", () => {
    const r = spawnSync(
        process.execPath,
        ["test/fixtures/tooling/ts-035d2-p/verify-future-wire.mjs"],
        {
            encoding: "utf8",
            timeout: 60000,
            maxBuffer: 4 * 1024 * 1024,
        },
    );
    writeFileSync(join(scratchRoot, "script-strict-rule-wire-mutations.log"), r.stdout + r.stderr);
    assert.equal(r.status, 0, r.stderr);
});
