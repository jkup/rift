import assert from "node:assert/strict";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { blockers } from "../../../tools/test262/input.mjs";
const root = resolve(import.meta.dirname, "../../.."), here = import.meta.dirname, base = "6638b2b";
const git = (...args) => execFileSync("git", args, { cwd: resolve(root, ".."), encoding: "utf8" }).trimEnd();
const allowed = ["TASKS.md", "docs/feature-inventory.md", "docs/script-function-materialization.md", "tools/build-native.mjs",
    "src/script-record.ts", "src/runtime.ts", "src/realm.ts", "src/builtins/function.ts", "src/evaluator.ts", "src/script-environment.ts",
    "src/parser.ts", "src/script-declarations.ts", "test/script-environment.ts", "test/script-function-materialization.ts"].map(p => "typescript/" + p);
const owned = p => allowed.includes(p) || p.startsWith("typescript/docs/validation/ts-033e3a/") || p.startsWith("typescript/fixtures/script-function-materialization/");
const coordinator = p => p === "typescript/COORDINATION.md";
const changes = git("diff", "--name-only", base).split("\n").filter(Boolean);
const untracked = git("ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean);
assert.ok(changes.every(p => owned(p) || coordinator(p)), changes.join("\n")); assert.ok(untracked.every(owned), untracked.join("\n"));
const oldBuild = git("show", base + ":typescript/tools/build-native.mjs");
assert.equal(readFileSync(join(root, "tools/build-native.mjs"), "utf8").replaceAll("\r\n", "\n").trimEnd(), oldBuild.replace('["test/script-environment.ts", "script-environment"]]', '["test/script-environment.ts", "script-environment"], ["test/script-function-materialization.ts", "script-function-materialization"]]'));
const builds = JSON.parse(readFileSync(join(root, "build/native-build-results.json")));
const oldBuilds = JSON.parse(git("show", base + ":typescript/docs/validation/ts-033e2/native-build-results.json"));
assert.equal(oldBuilds.length, 44); assert.equal(builds.length, 45);
assert.deepEqual(builds.slice(0, 44).map(x => x.entry), oldBuilds.map(x => x.entry));
const coverage = [];
for (const row of builds) {
    assert.equal(row.verdict, "PASS");
    for (const result of [row.build, row.coverage]) { assert.equal(result.status, 0); assert.equal(result.signal, null); assert.equal(result.error, null); }
    // Independently inspect the raw separate report, not the build/verdict label.
    const report = row.coverage.stdout;
    const analyzed = /statements analyzed\s+(\d+)/.exec(report), compiled = /compile statically\s+(\d+)\s+\(100%\)/.exec(report);
    assert.ok(analyzed && compiled); assert.equal(analyzed[1], compiled[1]); assert.ok(Number(analyzed[1]) > 0);
    assert.ok(report.includes("fully static — all analyzed statements compile to native code."));
    assert.ok(!/in dynamic tier\s+[1-9]\d*/.test(report));
    coverage.push({ entry: row.entry, static: Number(compiled[1]), dynamic: 0 });
}
for (const lane of ["node", "native"]) {
    const records = JSON.parse(readFileSync(join(root, `build/guest-${lane}-results.json`)));
    const old = JSON.parse(git("show", base + `:typescript/docs/validation/ts-033e2/guest-${lane}-results.json`));
    assert.equal(records.length, 212); assert.deepEqual(records, old);
    copyFileSync(join(root, `build/guest-${lane}-results.json`), join(here, `guest-${lane}-results.json`));
}
for (const file of ["native-build-results.json", "probe-results.json"]) copyFileSync(join(root, "build", file), join(here, file));
const manifest = JSON.parse(readFileSync(join(root, "fixtures/assistance/test262-starter-corpus/manifest.json")));
const variants = manifest.entries.flatMap(e => e.variants.map(variant => ({ id: e.id, variant, blockers: blockers({ flags: e.flags, features: e.features, negative: e.negative ?? null, locale: [] }, variant, e.id) })));
assert.equal(variants.length, 60); assert.ok(variants.every(v => v.blockers.length > 0));
const protectedFiles = git("ls-tree", "-r", "--name-only", base).split("\n").filter(p => !owned(p) && !coordinator(p));
assert.ok(!changes.some(p => protectedFiles.includes(p)));
// The original failed driver and compiler evidence remain byte-identical.
const retained = ["candidate-driver.ts.txt", "candidate-compiler-results.json", "candidate.patch.json", "initial-driver.ts.txt", "initial-coverage.txt", "reduction-results.json", "frozen-matrix.md", "frozen-expectations.md"];
for (const file of retained) assert.equal(readFileSync(join(here, file), "utf8").replaceAll("\r\n", "\n").trimEnd(), git("show", "bdf684d:typescript/docs/validation/ts-033e3a/" + file));
writeFileSync(join(here, "preservation.json"), JSON.stringify({ base, changedTracked: changes, coordinatorOwnedExceptions: changes.filter(coordinator), protectedFiles: protectedFiles.length, guestCasesPerLane: 212, oldGates: 44, newGates: 1, coverage, retained, variants }, null, 2) + "\n");
console.log("PASS:212 exact records/lane;44 old gates+1;" + protectedFiles.length + " protected files;60 blocked;original failure evidence retained");
