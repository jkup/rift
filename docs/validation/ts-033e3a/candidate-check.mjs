import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const directory = "docs/validation/ts-033e3a/";
const results = [];
for (const [file, input] of [["a", "seed 7"], ["b", "other 11"]]) {
    const r = spawnSync(process.execPath, ["build/node/test/script-function-materialization.js", "fixtures/script-function-materialization/" + file + ".txt"], { encoding: "utf8", timeout: 30000 });
    results.push({ file, status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout, stderr: r.stderr });
    const expected = ["F01", "F02", "F03", "F04", "F05", "F06", "F07", "F08", "F09", "F10 P01", "F11", "F12", "N01", "N02", "N03", "N04", "N05", "S05", "INPUT " + input].map(s => s + " PASS\n").join("");
    assert.equal(r.status, 0); assert.equal(r.stdout, expected); assert.equal(r.stderr, "");
}
writeFileSync(directory + "candidate-node-results.json", JSON.stringify(results, null, 2) + "\n");
console.log("Candidate two-input Node controls pass; native acceptance remains blocked.");
