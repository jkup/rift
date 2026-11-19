import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const directory = "docs/validation/ts-033e3a/";
function run(command, args) {
    const r = spawnSync(command, args, { encoding: "utf8", timeout: 60000 });
    return { status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout, stderr: r.stderr };
}
const results = [];
for (const [name, code] of [["forged-record", "SC2002"], ["forged-class", "SC1090"], ["foreign-union", "SC2003"]]) {
    const source = directory + name + ".ts";
    const row = { name, node: run(process.execPath, [source, "7"]),
        build: run("node_modules/scriptc/bin/scriptc.exe", ["build", source, "--tier", "static-only", "-o", "build/ts-033e3a/" + name + ".exe"]),
        coverage: run("node_modules/scriptc/bin/scriptc.exe", ["coverage", source]) };
    results.push(row);
    writeFileSync("docs/validation/ts-034h6-b/replays/e3a-reduction-results.json", JSON.stringify(results, null, 2) + "\n");
    assert.equal(row.node.status, 0); assert.equal(row.node.stdout, "false\n");
    assert.equal(row.node.stderr, ""); assert.equal(row.node.signal, null); assert.equal(row.node.error, null);
    assert.equal(row.build.status, 1); assert.equal(row.build.signal, null); assert.equal(row.build.error, null);
    assert.ok(row.build.stderr.includes(code), row.build.stderr);
    assert.equal(row.coverage.status, 0); assert.ok(row.coverage.stdout.includes(code), row.coverage.stdout);
    assert.ok(!row.coverage.stdout.includes("fully static"));
    console.log(name + ": Node rejects fake; pinned static build/coverage reject cast " + code);
}
