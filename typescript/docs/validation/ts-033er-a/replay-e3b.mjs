import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
const root = resolve(import.meta.dirname, "../../.."), results = [];
try {
    for (const lane of process.argv.slice(2)) for (const [file, input] of [["a", "seed 7"], ["b", "other 11"]]) {
        assert.ok(["node", "native"].includes(lane));
        const args = ["fixtures/script-function-setup/" + file + ".txt"];
        if (lane === "node") args.unshift("build/node/test/script-function-setup.js");
        const r = spawnSync(lane === "node" ? process.execPath : join(root, "build/native/script-function-setup.exe"), args, { cwd: root, encoding: "utf8", timeout: 30000 });
        results.push({ lane, input, status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout, stderr: r.stderr });
        const expected = ["S01 P01 FUNCTION", "B01 P01 BLOCK", "G01 P01 GLOBAL", "S02", "S03 S07", "S04", "S06", "B02 B03", "G01 MARKER G02 G03", "P02 TICK BOUNDARY", "P03", "INPUT " + input].map(s => s + " PASS\n").join("");
        assert.equal(r.status, 0, r.stdout + r.stderr); assert.equal(r.signal, null); assert.equal(r.error, undefined);
        assert.equal(r.stderr, ""); assert.equal(r.stdout, expected);
        console.log(lane + " " + input + ": E3B setup controls PASS");
    }
} finally { writeFileSync(join(import.meta.dirname, "e3b-host-results.json"), JSON.stringify(results, null, 2) + "\n"); }
