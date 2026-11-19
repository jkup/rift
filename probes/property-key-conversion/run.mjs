import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { completed, probeVerdict } from "../../tools/probe-verdict.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const out = join(root, "build", "property-key-conversion");
mkdirSync(out, { recursive: true });
function run(command, args) {
    const result = spawnSync(command, args, { cwd: root, encoding: "utf8", timeout: 120000 });
    return {
        command,
        args,
        status: result.status,
        signal: result.signal,
        error: result.error ? String(result.error) : null,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
    };
}
const source = "probes/property-key-conversion/numbers.ts";
const tsc = run(process.execPath, [
    "node_modules/typescript/bin/tsc",
    "--ignoreConfig",
    "--strict",
    "--target",
    "es2024",
    "--module",
    "nodenext",
    "--types",
    "node",
    "--outDir",
    out,
    source,
]);
const node = completed(tsc) ? run(process.execPath, [join(out, "numbers.js")]) : null;
const compiler = join(root, "node_modules/scriptc/bin/scriptc.exe");
const exe = join(out, process.platform === "win32" ? "numbers.exe" : "numbers");
const build = run(compiler, ["build", source, "--tier", "static-only", "-o", exe]);
const coverage = run(compiler, ["coverage", source]);
const native = completed(build) ? run(exe, []) : null;
let verdict = probeVerdict({ node, build, coverage, native });
if (!completed(tsc)) {
    verdict = "TYPECHECK-FAIL";
}
const report = {
    nodeVersion: process.version,
    scriptc: "0.4.7",
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
