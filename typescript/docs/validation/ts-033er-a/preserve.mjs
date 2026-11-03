import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { blockers } from "../../../tools/test262/input.mjs";
const root = resolve(import.meta.dirname, "../../.."), here = import.meta.dirname, base = "ae9383a";
const git = (...args) => execFileSync("git", args, { cwd: resolve(root, ".."), encoding: "utf8" }).trimEnd();
const migration = readFileSync(join(root,"docs/validation/ts-033er-p/migration-files.md"),"utf8");
const hostFiles = [...migration.matchAll(/`(typescript\/test\/[^`]+)`/g)].map(m=>m[1]);
assert.equal(hostFiles.length,45);
const production = ["runtime.ts","array-object.ts","primitive-objects.ts","global-environment.ts","script-environment.ts","realm.ts","array-like.ts","array-map.ts","primitive-conversion.ts","builtins/object.ts","builtins/array.ts"].map(p=>"typescript/src/"+p);
const allowed = [...production,...hostFiles,...["TASKS.md","docs/feature-inventory.md","tools/build-native.mjs","test/property-accessors.ts"].map(p=>"typescript/"+p)];
const owned = p => allowed.includes(p) || p.startsWith("typescript/docs/validation/ts-033er-a/") || p.startsWith("typescript/fixtures/property-accessors/");
const coordinator = p => p === "typescript/COORDINATION.md";
const changes = git("diff", "--name-only", base).split("\n").filter(Boolean);
const untracked = git("ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean);
assert.ok(changes.every(p => owned(p) || coordinator(p)), changes.join("\n")); assert.ok(untracked.every(owned), untracked.join("\n"));
for (const row of JSON.parse(readFileSync(join(here,"final-source-hashes.json")))) assert.equal(createHash("sha256").update(readFileSync(join(root,"..",row.path))).digest("hex"),row.sha256,row.path);
const oldBuild = git("show", base + ":typescript/tools/build-native.mjs");
assert.equal(readFileSync(join(root, "tools/build-native.mjs"), "utf8").replaceAll("\r\n", "\n").trimEnd(), oldBuild.replace('["test/script-function-setup.ts", "script-function-setup"]]', '["test/script-function-setup.ts", "script-function-setup"], ["test/property-accessors.ts", "property-accessors"]]'));
const builds = JSON.parse(readFileSync(join(root, "build/native-build-results.json")));
const oldBuilds = JSON.parse(git("show", base + ":typescript/docs/validation/ts-033e3b/native-build-results.json"));
assert.equal(oldBuilds.length, 46); assert.equal(builds.length, 47);
assert.deepEqual(builds.slice(0, 46).map(x => x.entry), oldBuilds.map(x => x.entry));
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
    const old = JSON.parse(git("show", base + `:typescript/docs/validation/ts-033e3b/guest-${lane}-results.json`));
    assert.equal(records.length, 212); assert.deepEqual(records, old);
    copyFileSync(join(root, `build/guest-${lane}-results.json`), join(here, `guest-${lane}-results.json`));
}
for (const file of ["native-build-results.json", "probe-results.json"]) copyFileSync(join(root, "build", file), join(here, file));
const manifest = JSON.parse(readFileSync(join(root, "fixtures/assistance/test262-starter-corpus/manifest.json")));
const variants = manifest.entries.flatMap(e => e.variants.map(variant => ({ id: e.id, variant, blockers: blockers({ flags: e.flags, features: e.features, negative: e.negative ?? null, locale: [] }, variant, e.id) })));
assert.equal(variants.length, 60); assert.ok(variants.every(v => v.blockers.length > 0));
const protectedFiles = git("ls-tree", "-r", "--name-only", base).split("\n").filter(p => !owned(p) && !coordinator(p));
assert.ok(!changes.some(p => protectedFiles.includes(p)));
const retained = ["all E3B/E3A/E2/E1 historical evidence and source fixtures protected by base diff"];
for (const p of git("ls-tree","-r","--name-only",base,"typescript/docs/validation/ts-033er-a").split("\n").filter(Boolean)) assert.equal(readFileSync(join(root,"..",p),"utf8").replaceAll("\r\n","\n").trimEnd(),git("show",base+":"+p));
writeFileSync(join(here, "preservation.json"), JSON.stringify({ base, changedTracked: changes, coordinatorOwnedExceptions: changes.filter(coordinator), protectedFiles: protectedFiles.length, guestCasesPerLane: 212, oldGates: 46, newGates: 1, coverage, retained, variants }, null, 2) + "\n");
console.log("PASS:212 exact records/lane;46 old gates+1;" + protectedFiles.length + " protected files;60 blocked;original failure evidence retained");
