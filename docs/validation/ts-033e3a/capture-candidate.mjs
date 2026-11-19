import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, copyFileSync } from "node:fs";
const directory = "docs/validation/ts-033e3a/";
const files = ["src/script-record.ts", "src/runtime.ts", "src/realm.ts", "src/builtins/function.ts", "src/evaluator.ts", "src/script-environment.ts", "src/parser.ts", "src/script-declarations.ts", "test/script-environment.ts"];
function run(command, args) {
    const r = spawnSync(command, args, { encoding: "utf8", timeout: 60000 });
    return { status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout, stderr: r.stderr };
}
const e2 = [];
for (const lane of ["node", "native"]) for (const input of ["seed", "other"]) {
    const args = ["fixtures/script-environment/" + input + ".txt"];
    const result = lane === "node" ? run(process.execPath, ["build/node/test/script-environment.js", ...args]) : run("build/ts-033e3a/environment.exe", args);
    const expected = ["L01", "L02", "L03", "L04", "T01", "T02", "T03", "C01", "C02", "C03", "C04", "INPUT " + input + " " + (input === "seed" ? "7" : "11")].map(s => s + " PASS\n").join("");
    assert.equal(result.status, 0); assert.equal(result.stdout, expected); assert.equal(result.stderr, "");
    e2.push({ lane, input, ...result });
}
writeFileSync(directory + "candidate-e2-results.json", JSON.stringify(e2, null, 2) + "\n");
const compiler = "node_modules/scriptc/bin/scriptc.exe";
const results = { e2Coverage: run(compiler, ["coverage", "test/script-environment.ts"]),
    e2Build: run(compiler, ["build", "test/script-environment.ts", "--tier", "static-only", "-o", "build/ts-033e3a/environment.exe"]),
    candidateCoverage: run(compiler, ["coverage", "test/script-function-materialization.ts"]),
    candidateBuild: run(compiler, ["build", "test/script-function-materialization.ts", "--tier", "static-only", "-o", "build/ts-033e3a/candidate.exe"]) };
writeFileSync(directory + "candidate-compiler-results.json", JSON.stringify(results, null, 2) + "\n");
assert.equal(results.e2Build.status, 0);
assert.ok(results.e2Coverage.stdout.includes("fully static"));
assert.equal(results.candidateBuild.status, 1);
assert.ok(results.candidateCoverage.stdout.includes("SC2002") && results.candidateCoverage.stdout.includes("SC2003"));
writeFileSync(directory + "candidate.patch.json", JSON.stringify(execFileSync("git", ["diff", "--", ...files], { encoding: "utf8" })) + "\n");
copyFileSync("test/script-function-materialization.ts", directory + "candidate-driver.ts.txt");
for (const input of ["a", "b"]) copyFileSync("fixtures/script-function-materialization/" + input + ".txt", directory + "candidate-input-" + input + ".txt");
writeFileSync(directory + "candidate-files.json", JSON.stringify(files, null, 2) + "\n");
console.log("Captured candidate, exact E2 outputs, positive static gate and negative-control blockers.");
