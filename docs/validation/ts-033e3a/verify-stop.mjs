import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const directory = "docs/validation/ts-033e3a/";
const base = "6638b2b";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trimEnd();
const owned = p => p === "typescript/TASKS.md" || p === "typescript/docs/script-function-materialization.md" || p.startsWith("typescript/docs/validation/ts-033e3a/");
const coordinator = p => p === "typescript/COORDINATION.md";
const changed = git("diff", "--name-only", base).split("\n").filter(Boolean);
const untracked = git("ls-files", "--others", "--exclude-standard", "--full-name").split("\n").filter(Boolean);
assert.ok(changed.every(p => owned(p) || coordinator(p)), changed.join("\n"));
assert.ok(untracked.every(owned), untracked.join("\n"));
const tracked = git("ls-tree", "-r", "--name-only", "--full-tree", base).split("\n");
const protectedFiles = tracked.filter(p => !owned(p) && !coordinator(p));
const suites = [];
for (const name of ["typecheck", "test:runner"]) {
    const r = spawnSync("npm.cmd", ["run", name], { encoding: "utf8", shell: true, timeout: 60000 });
    suites.push({ name, status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout, stderr: r.stderr });
    assert.equal(r.status, 0); assert.equal(r.signal, null); assert.equal(r.error, undefined);
}
writeFileSync(directory + "restored-baseline-results.json", JSON.stringify({ base, changed, untracked, protectedFiles: protectedFiles.length, suites }, null, 2) + "\n");
console.log("PASS restored baseline: " + protectedFiles.length + " protected files; typecheck; runner20. No E3A native acceptance.");
