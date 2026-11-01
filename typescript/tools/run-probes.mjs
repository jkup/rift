// Runs every probe in two lanes and compares them:
//   node:   tsc output executed by Node
//   native: scriptc --tier static-only executable
// A probe passes only when it builds natively and both lanes agree on stdout
// and exit status. stderr is reported but not compared.
//
// Usage: node tools/run-probes.mjs [probe-name...]

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const EXE = process.platform === "win32" ? ".exe" : "";
// The scriptc package ships its native CLI as bin/scriptc.exe on every platform.
const scriptc = join(ROOT, "node_modules", "scriptc", "bin", "scriptc.exe");
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
        stdout: r.stdout ?? "",
        stderr: r.stderr ?? "",
        ms: Math.round(performance.now() - started),
    };
}

const requested = process.argv.slice(2);
const probes = readdirSync(join(ROOT, "probes"))
    .filter((f) => f.endsWith(".ts") && f !== "hello.ts")
    .map((f) => basename(f, ".ts"))
    .filter((name) => requested.length === 0 || requested.includes(name));

const typecheck = run(process.execPath, [tscJs, "-p", "tsconfig.json"]);
if (typecheck.status !== 0) {
    console.error(typecheck.stdout, typecheck.stderr);
    process.exit(1);
}

mkdirSync(join(ROOT, "build", "native"), { recursive: true });
const results = [];
for (const name of probes) {
    const args = ARGS[name] ?? [];
    const node = run(process.execPath, [join(ROOT, "build", "node", "probes", name + ".js"), ...args]);
    const exe = join(ROOT, "build", "native", name + EXE);
    const build = run(scriptc, ["build", join("probes", name + ".ts"), "--tier", "static-only", "-o", exe]);
    const native = build.status === 0 ? run(exe, args) : null;
    // static-only forbids fallback demotions but still admits runtime-typed
    // values ("dynamic tier"); the coverage report is the stricter gate.
    const coverage = run(scriptc, ["coverage", join("probes", name + ".ts")]);
    const dynamic = /in dynamic tier\s+\d+/.test(coverage.stdout);

    let verdict;
    if (build.status !== 0) verdict = "BUILD-FAIL";
    else if (dynamic) verdict = "DYNAMIC";
    else if (native.status !== node.status) verdict = "EXIT-DIFF";
    else if (native.stdout !== node.stdout) verdict = "OUTPUT-DIFF";
    else verdict = "PASS";

    results.push({ name, verdict, node, build, native });
    console.log(`${verdict.padEnd(12)} ${name}  (build ${build.ms}ms)`);
}

// Full transcripts for inspection; build/ is ignored by git.
writeFileSync(join(ROOT, "build", "probe-results.json"), JSON.stringify(results, null, 2));
for (const r of results) {
    if (r.verdict === "PASS") continue;
    console.log(`\n=== ${r.name}: ${r.verdict}`);
    if (r.verdict === "BUILD-FAIL") {
        console.log((r.build.stdout + r.build.stderr).trim());
        continue;
    }
    if (r.verdict === "DYNAMIC") {
        console.log("  uses the dynamic tier; run `scriptc coverage --explain-dynamic` on it");
        continue;
    }
    const a = r.node.stdout.split("\n");
    const b = r.native.stdout.split("\n");
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] !== b[i]) console.log(`  line ${i + 1}\n    node:   ${a[i]}\n    native: ${b[i]}`);
    }
    if (r.native.status !== r.node.status) console.log(`  exit node=${r.node.status} native=${r.native.status} ${r.native.signal ?? ""}`);
    if (r.native.stderr) console.log("  native stderr:", r.native.stderr.trim().slice(0, 2000));
}
process.exitCode = results.every((r) => r.verdict === "PASS") ? 0 : 1;
