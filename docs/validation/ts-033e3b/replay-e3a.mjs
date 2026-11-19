import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
const root = resolve(import.meta.dirname, "../../.."), results = [];
try {
    for (const lane of process.argv.slice(2)) for (const [file, input] of [["a", "seed 7"], ["b", "other 11"]]) {
        assert.ok(["node", "native"].includes(lane));
        const args = ["fixtures/script-function-materialization/" + file + ".txt"];
        if (lane === "node") args.unshift("build/node/test/script-function-materialization.js");
        const r = spawnSync(lane === "node" ? process.execPath : join(root, "build/native/script-function-materialization.exe"), args, { cwd: root, encoding: "utf8", timeout: 30000 });
        results.push({ lane, input, status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout, stderr: r.stderr });
        const expected = ["F01", "F02", "F03", "F04", "F05", "F06", "F07 REPRESENTABLE", "F08", "F09 REPRESENTABLE", "F10 P01", "F11", "F12", "N01", "N02", "N03", "N04", "N05", "S05", "INPUT " + input].map(s => s + " PASS\n").join("");
        assert.equal(r.status, 0, r.stdout + r.stderr); assert.equal(r.signal, null); assert.equal(r.error, undefined);
        assert.equal(r.stderr, ""); assert.equal(r.stdout, expected);
        console.log(lane + " " + input + ": E3A runtime controls PASS (host-only casts excluded explicitly)");
    }
} finally { writeFileSync(join(import.meta.dirname, "e3a-host-results.json"), JSON.stringify(results, null, 2) + "\n"); }
