import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const dir = "docs/validation/ts-033e3a/", compiler = "node_modules/scriptc/bin/scriptc.exe";
const run = (command, args) => {
    const r = spawnSync(command, args, { encoding: "utf8", timeout: 60000 });
    return { status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout, stderr: r.stderr };
};
const results = [];
const tsc = run(process.execPath, ["node_modules/typescript/bin/tsc", "--ignoreConfig", "--types", "node", "--target", "ES2024", "--module", "NodeNext", "--strict", "--skipLibCheck", "--outDir", "build/ts-033e3a/reachability-node", dir + "reachability-before.ts", dir + "reachability-after.ts"]);
assert.equal(tsc.status, 0, tsc.stdout + tsc.stderr);
writeFileSync("docs/validation/ts-034h5/replays/e3a-reachability-typecheck.json", JSON.stringify(tsc, null, 2) + "\n");
for (const variant of ["before", "after"]) {
    const source = dir + "reachability-" + variant + ".ts", exe = "build/ts-033e3a/reachability-" + variant + ".exe";
    const row = { variant, node: run(process.execPath, ["build/ts-033e3a/reachability-node/reachability-" + variant + ".js", "11"]), build: run(compiler, ["build", source, "--tier", "static-only", "-o", exe]), coverage: run(compiler, ["coverage", source]) };
    if (row.build.status === 0) row.native = run(exe, ["11"]);
    results.push(row);
    writeFileSync("docs/validation/ts-034h5/replays/e3a-reachability-results.json", JSON.stringify(results, null, 2) + "\n");
    assert.equal(row.node.status, 0); assert.equal(row.node.stdout, "11\n"); assert.equal(row.node.stderr, "");
    assert.equal(row.coverage.status, 0);
    if (variant === "before") {
        assert.equal(row.build.status, 1); assert.ok(row.build.stderr.includes("SC2009"));
        assert.match(row.coverage.stdout, /in dynamic tier\s+1/);
    } else {
        assert.equal(row.build.status, 0); assert.equal(row.native.status, 0); assert.equal(row.native.stdout, "11\n");
        assert.match(row.coverage.stdout, /compile statically\s+5\s+\(100%\)/);
        assert.ok(!row.coverage.stdout.includes("in dynamic tier"));
    }
}
console.log("Opaque-class reachability: type-only entry rejected; module import builds with zero dynamic tier.");
