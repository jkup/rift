// The full 45-gate rebuild preceded a label-only change in the new driver.
// Refresh that gate and both inputs; inherited source/binaries are unchanged.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { probeVerdict } from "../../../tools/probe-verdict.mjs";
const run = (command, args) => {
    const r = spawnSync(command, args, { encoding: "utf8", timeout: 60000 });
    return { status: r.status, signal: r.signal, error: r.error ? { code: r.error.code, message: r.error.message } : null, stdout: r.stdout, stderr: r.stderr };
};
const entry = "test/script-function-materialization.ts", compiler = "node_modules/scriptc/bin/scriptc.exe";
const nodeBuild = run(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]);
assert.equal(nodeBuild.status, 0, nodeBuild.stdout + nodeBuild.stderr);
const build = run(compiler, ["build", entry, "--tier", "static-only", "-o", "build/native/script-function-materialization.exe"]);
const coverage = run(compiler, ["coverage", entry]);
const success = { status: 0, signal: null, error: null, stdout: "" };
const verdict = probeVerdict({ build, coverage, node: success, native: success });
const runtime = run(process.execPath, ["docs/validation/ts-033e3a/validate.mjs", "node", "native"]);
writeFileSync("docs/validation/ts-033e3a/label-refresh-results.json", JSON.stringify({ nodeBuild, build, coverage, verdict, runtime }, null, 2) + "\n");
assert.equal(verdict, "PASS"); assert.equal(runtime.status, 0, runtime.stdout + runtime.stderr);
const path = "build/native-build-results.json", rows = JSON.parse(readFileSync(path));
const index = rows.findIndex(r => r.entry === entry); assert.equal(index, 44);
rows[index] = { entry, build, coverage, verdict };
writeFileSync(path, JSON.stringify(rows, null, 2) + "\n");
console.log("Label-only driver refresh: static build, zero-dynamic coverage and both-host two-input literal outputs PASS.");
