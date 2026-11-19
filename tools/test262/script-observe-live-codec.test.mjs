import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseScriptDriverResult } from "./script-driver-result.mjs";
import {
    parseScriptEnvelope,
    assertScriptContext,
    inspectScriptEnvelope,
} from "./script-result.mjs";
const runs = JSON.parse(await readFile("docs/validation/ts-035c/integration-latest.json"));
// The saved records retain their original checkout paths. The root-layout move
// relocated local build artifacts; resolve only that known archive prefix here.
// Bindings, observations and the saved evidence itself remain unchanged.
function archivedPath(path) {
    const normalized = path.replaceAll("\\", "/");
    const marker = "/typescript/build/";
    const at = normalized.lastIndexOf(marker);
    return at < 0 ? path : resolve("build", normalized.slice(at + marker.length));
}
for (const lane of ["node", "native"]) {
    test(lane + " actual child/full-envelope bytes and closed mutation neighbors", async () => {
        const rows = runs.filter(
            (r) =>
                r.lane === lane &&
                r.record &&
                !["host-fault", "timeout"].includes(r.record.observation.kind),
        );
        assert.ok(rows.length >= 50);
        for (const row of rows) {
            const directory = archivedPath(row.directory);
            const p = JSON.parse(await readFile(join(directory, "plan.json"))),
                bytes = await readFile(archivedPath(p.paths.result)),
                child = parseScriptDriverResult(bytes, p.binding),
                record = row.record;
            assert.deepEqual(parseScriptEnvelope(JSON.stringify(record), p.binding), record);
            assert.deepEqual(assertScriptContext(record, p.context, p.binding), record);
            const f = JSON.parse(await readFile(join(directory, "transport.json"))),
                t = {
                    process: f.process,
                    outputBytes: f.outputBytes,
                    outputLimit: f.outputLimit,
                    capCount: f.capCount,
                    capKilled: f.capKilled,
                    crashBeforeCap: f.crashBeforeCap,
                };
            assert.deepEqual(
                inspectScriptEnvelope(JSON.stringify(record), p.context, t, p.binding),
                record,
            );
            for (const edit of [
                (c) => (c.nonce = "stale"),
                (c) => (c.requestSha256 = "a".repeat(64)),
                (c) => (c.operation.unitId = "u999"),
                (c) => (c.operation.realmId = "unknown"),
                (c) => (c.completedUnits = ["u0", "u0"]),
                (c) => (c.preflightId = "forged"),
                (c) => (c.testBodyEvaluated = !c.testBodyEvaluated),
                (c) => (c.classification = { status: "pass" }),
            ]) {
                const c = structuredClone(child);
                edit(c);
                assert.throws(() =>
                    parseScriptDriverResult(Buffer.from(JSON.stringify(c)), p.binding),
                );
            }
            for (const edit of [
                (v) => (v.evidence.operation.unitId = "u999"),
                (v) => (v.evidence.preflightId = "forged"),
                (v) => (v.evidence.completedUnits = ["u0", "u0"]),
                (v) => (v.evidence.testBodyEvaluated = !v.evidence.testBodyEvaluated),
                (v) => (v.classification = { status: "pass" }),
            ]) {
                const v = structuredClone(record);
                edit(v);
                assert.throws(() => parseScriptEnvelope(JSON.stringify(v), p.binding));
            }
            for (const edit of [
                (b) => delete b.limits.steps,
                (b) => b.limits.calls++,
                (b) => (b.variant = "non-strict"),
                (b) => (b.sources[0].transformedText += ";"),
                (b) => b.sources.reverse(),
                (b) => b.sources.push(b.sources[0]),
            ]) {
                const b = structuredClone(p.binding);
                edit(b);
                if (JSON.stringify(b) === JSON.stringify(p.binding)) {
                    continue;
                }
                assert.throws(() => parseScriptDriverResult(bytes, b));
                assert.throws(() => parseScriptEnvelope(JSON.stringify(record), b));
            }
            if (child.result.kind === "normal") {
                assert.deepEqual(child.result, { kind: "normal" });
            } else {
                const c = structuredClone(child);
                c.result.diagnostic = "ReferenceError: forged text";
                const accepted = parseScriptDriverResult(Buffer.from(JSON.stringify(c)), p.binding);
                assert.deepEqual(
                    { ...accepted.result, diagnostic: undefined },
                    { ...child.result, diagnostic: undefined },
                );
            }
        }
    });
}
