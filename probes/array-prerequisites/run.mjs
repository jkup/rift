import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { completed, probeVerdict } from "../../tools/probe-verdict.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const out = join(root, "build", "array-prerequisites");
mkdirSync(out, { recursive: true });
function run(command, args) {
    const r = spawnSync(command, args, { cwd: root, encoding: "utf8", timeout: 120000 });
    return {
        command,
        args,
        status: r.status,
        signal: r.signal,
        error: r.error ? String(r.error) : null,
        stdout: r.stdout ?? "",
        stderr: r.stderr ?? "",
    };
}
const source = "probes/array-prerequisites/dispatch.ts";
const tsc = run(process.execPath, [
    "node_modules/typescript/bin/tsc",
    "--ignoreConfig",
    "--strict",
    "--target",
    "es2024",
    "--module",
    "nodenext",
    "--outDir",
    out,
    source,
]);
const node = completed(tsc) ? run(process.execPath, [join(out, "dispatch.js")]) : null;
const compiler = join(root, "node_modules/scriptc/bin/scriptc.exe");
const exe = join(out, process.platform === "win32" ? "dispatch.exe" : "dispatch");
const build = run(compiler, ["build", source, "--tier", "static-only", "-o", exe]);
const coverage = run(compiler, ["coverage", source]);
const native = completed(build) ? run(exe, []) : null;
const expected = "dispatch: 7 expected assertions passed\n";
let verdict = probeVerdict({ node, build, coverage, native });
if (!completed(tsc)) {
    verdict = "TYPECHECK-FAIL";
}
if (
    verdict === "PASS" &&
    (node.stdout.replaceAll("\r\n", "\n") !== expected ||
        native.stdout.replaceAll("\r\n", "\n") !== expected)
) {
    verdict = "EXPECTED-OUTPUT-FAIL";
}
const report = {
    nodeVersion: process.version,
    expected,
    verdict,
    tsc,
    node,
    build,
    coverage,
    native,
};
writeFileSync(join(out, "results.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
process.exitCode = verdict === "PASS" ? 0 : 1;
