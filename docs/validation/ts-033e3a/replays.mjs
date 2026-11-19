import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const results = [];
const commands = ["validate", "node-host-negatives", "reduce", "replay-e2", "replay-e1", "replay-plans", "replay-baseline", "replay-metadata", "replay-stress", "replay-global", "replay-bootstrap", "replay-d2"];
for (const name of commands) {
    const args = ["docs/validation/ts-033e3a/" + name + ".mjs"];
    if (name !== "node-host-negatives" && name !== "reduce") args.push("node", "native");
    const r = spawnSync(process.execPath, args, { encoding: "utf8", timeout: 600000, maxBuffer: 32 * 1024 * 1024 });
    results.push({ name, status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout, stderr: r.stderr });
    writeFileSync("docs/validation/ts-033e3a/replays-results.json", JSON.stringify(results, null, 2) + "\n");
    console.log(name + ": " + r.status);
    assert.equal(r.status, 0, r.stdout + r.stderr); assert.equal(r.signal, null); assert.equal(r.error, undefined);
}
