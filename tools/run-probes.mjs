// Runs every probe in two lanes and compares them:
//   node:   tsc output executed by Node
//   native: scriptc --tier static-only executable
// A probe passes only with verified static coverage, expected exit statuses,
// and matching stdout. stderr is retained but not compared.
//
// Usage: node tools/run-probes.mjs [probe-name...]

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { completed, probeVerdict } from "./probe-verdict.mjs";
import { scriptcPath } from "./scriptc-path.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXE = process.platform === "win32" ? ".exe" : "";
const scriptc = scriptcPath(ROOT);
const tscJs = join(ROOT, "node_modules", "typescript", "bin", "tsc");

// Guest-facing arguments for probes that need them.
const ARGS = {
    host: [join(ROOT, "probes", "fixtures", "sample.js")],
    memory: ["200000"],
};

function run(command, args) {
    const started = performance.now();
    const r = spawnSync(command, args, { cwd: ROOT, encoding: "utf8", timeout: 600_000 });
    return {
        status: r.status,
        signal: r.signal,
        error: r.error ? { code: r.error.code, message: r.error.message } : null,
        stdout: r.stdout ?? "",
        stderr: r.stderr ?? "",
        ms: Math.round(performance.now() - started),
    };
}

const requested = process.argv.slice(2);
const available = readdirSync(join(ROOT, "probes"))
    .filter((f) => f.endsWith(".ts") && f !== "hello.ts")
    .map((f) => basename(f, ".ts"));
const unknown = requested.filter((name) => !available.includes(name));
if (unknown.length > 0) {
    console.error(`Unknown probes: ${unknown.join(", ")}`);
    process.exit(1);
}
const probes = available.filter((name) => requested.length === 0 || requested.includes(name));
if (probes.length === 0) {
    console.error("No probes selected.");
    process.exit(1);
}

const typecheck = run(process.execPath, [tscJs, "-p", "tsconfig.json"]);
if (!completed(typecheck)) {
    console.error(typecheck);
    process.exit(1);
}

mkdirSync(join(ROOT, "build", "native"), { recursive: true });
const results = [];
for (const name of probes) {
    const args = ARGS[name] ?? [];
    const node = run(process.execPath, [
        join(ROOT, "build", "node", "probes", name + ".js"),
        ...args,
    ]);
    const exe = join(ROOT, "build", "native", name + EXE);
    const build = run(scriptc, [
        "build",
        join("probes", name + ".ts"),
        "--tier",
        "static-only",
        "-o",
        exe,
    ]);
    const native = completed(build) ? run(exe, args) : null;
    // static-only forbids fallback demotions but still admits runtime-typed
    // values ("dynamic tier"); the coverage report is the stricter gate.
    const coverage = run(scriptc, ["coverage", join("probes", name + ".ts")]);
    const expectedStatus = name === "host" ? 3 : 0;
    const verdict = probeVerdict({ build, coverage, node, native, expectedStatus });

    results.push({
        name,
        compiler: scriptc,
        verdict,
        expectedStatus,
        node,
        build,
        coverage,
        native,
    });
    console.log(`${verdict.padEnd(12)} ${name}  (build ${build.ms}ms)`);
}

// Full transcripts for inspection; build/ is ignored by git.
writeFileSync(join(ROOT, "build", "probe-results.json"), JSON.stringify(results, null, 2));
for (const r of results) {
    if (r.verdict === "PASS") {
        continue;
    }
    console.log(`\n=== ${r.name}: ${r.verdict}`);
    console.log(`  expected execution status: ${r.expectedStatus}`);
    for (const lane of ["build", "coverage", "node", "native"]) {
        const result = r[lane];
        if (!result) {
            continue;
        }
        console.log(`  ${lane}: status=${result.status} signal=${result.signal ?? "none"}`);
        if (result.error) {
            console.log(`  ${result.error.code}: ${result.error.message}`);
        }
        if (result.stdout) {
            console.log(result.stdout.trim().slice(0, 2000));
        }
        // Linker diagnostics often end with the useful error after a long command.
        if (result.stderr) {
            console.log(result.stderr.trim().slice(-4000));
        }
    }
}
process.exitCode = results.every((r) => r.verdict === "PASS") ? 0 : 1;
