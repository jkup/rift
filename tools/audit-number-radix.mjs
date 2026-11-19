import assert from "node:assert/strict";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { probeVerdict } from "./probe-verdict.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const evidence = new URL("../docs/validation/ts-032a/", import.meta.url);
const base = "9c39011d50f9acf2864f9ae0f360910f4165daac";
const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const baseline = (path) => git(["show", base + ":typescript/" + path]);
const preserved = [
    "test/cases.json",
    "tools/run-guests.mjs",
    "fixtures/assistance/radix-formatter-options/oracle.mjs",
    "docs/validation/ts-032p/corpus.txt",
    "docs/validation/ts-032p/vectors.json",
];
for (const path of preserved) {
    assert.equal(readFileSync(root + path, "utf8").replaceAll("\r\n", "\n"), baseline(path));
}
const oldBuild = baseline("tools/build-native.mjs");
const currentBuild = readFileSync(root + "tools/build-native.mjs", "utf8").replaceAll("\r\n", "\n");
assert.equal(currentBuild.replace(', ["test/number-radix.ts", "number-radix"]', ""), oldBuild);
for (const path of ["src/number-radix.ts", "src/number-radix-internal.ts"]) {
    const source = readFileSync(root + path, "utf8");
    assert.doesNotMatch(
        source,
        /\.(?:toString|toFixed|toPrecision)\s*\(|parseFloat\s*\(|parseInt\s*\(/,
    );
    assert.doesNotMatch(source, /Number\((?!\(bits|s % b)/);
}
const changed = git(["diff", "--name-only", base]).trim().split("\n");
const owned = [
    "typescript/TASKS.md",
    "typescript/tools/build-native.mjs",
    "typescript/tools/test-number-radix.mjs",
    "typescript/tools/audit-number-radix.mjs",
    "typescript/src/number-radix.ts",
    "typescript/src/number-radix-internal.ts",
    "typescript/test/number-radix.ts",
];
// Coordinator committed its assignment record at b772d50 while this sole
// implementation writer worked. It is outside our ownership and untouched.
const coordinatorPath = "typescript/COORDINATION.md";
assert.equal(git(["diff", "HEAD", "--", coordinatorPath]), "");
for (const path of changed) {
    assert.ok(
        owned.includes(path) ||
            path === coordinatorPath ||
            path.startsWith("typescript/docs/validation/ts-032a/"),
        "unexpected tracked change " + path,
    );
}
const old = JSON.parse(readFileSync(root + "docs/validation/ts-021p/results.json"));
const decimals = old.rows.filter((row) => row[2] === "10");
assert.equal(decimals.length, 18);
const source = decimals.map((row) => row[1]).join("\n") + "\n";
writeFileSync(new URL("decimal-controls.txt", evidence), source);
const runs = [];
const invoke = (command, args) => {
    const r = spawnSync(command, args, { cwd: root, encoding: "utf8", timeout: 120000 });
    return {
        command,
        args,
        status: r.status,
        signal: r.signal,
        error: r.error?.message ?? null,
        stdout: r.stdout ?? "",
        stderr: r.stderr ?? "",
    };
};
const decimalSource = root + "docs/validation/ts-021p/decimal.ts";
const decimalExe = root + "build/native/ts032a-decimal.exe";
const compiler = root + "node_modules/scriptc/bin/scriptc.exe";
const build = invoke(compiler, ["build", decimalSource, "--tier", "static-only", "-o", decimalExe]);
const coverage = invoke(compiler, ["coverage", decimalSource]);
const success = { status: 0, signal: null, error: null, stdout: "" };
const verdict = probeVerdict({ build, coverage, node: success, native: success });
writeFileSync(
    new URL("decimal-build-results.json", evidence),
    JSON.stringify({ build, coverage, verdict }, null, 2),
);
assert.equal(verdict, "PASS");
for (const lane of ["node", "native"]) {
    for (const [id, token, , expectedText] of decimals) {
        const command = lane === "node" ? process.execPath : decimalExe;
        const args = lane === "node" ? [decimalSource, token] : [token];
        const result = invoke(command, args);
        runs.push({ lane, id, ...result });
        writeFileSync(new URL("decimal-results.json", evidence), JSON.stringify(runs, null, 2));
        assert.equal(result.status, 0);
        assert.equal(result.signal, null);
        assert.equal(result.error, null);
        assert.equal(result.stdout, expectedText + "\n");
    }
    const guests = JSON.parse(readFileSync(root + `build/guest-${lane}-results.json`));
    assert.equal(guests.length, 212);
    assert.ok(guests.every((row) => row.verdict === "PASS"));
    copyFileSync(
        root + `build/guest-${lane}-results.json`,
        new URL(`guest-${lane}-results.json`, evidence),
    );
}
const builds = JSON.parse(readFileSync(root + "build/native-build-results.json"));
assert.equal(builds.length, 37);
assert.ok(builds.every((row) => row.verdict === "PASS"));
const backend = JSON.parse(readFileSync(new URL("backend-build-results.json", evidence)));
assert.equal(backend.verdict, "PASS");
const report = {
    base,
    preserved,
    oldGates: 36,
    newGates: 1,
    guestCasesPerLane: 212,
    decimalControlsPerLane: 18,
    changedTrackedFiles: changed,
    sourceHashes: Object.fromEntries(
        ["src/number-radix.ts", "src/number-radix-internal.ts", "test/number-radix.ts"].map(
            (path) => [
                path,
                createHash("sha256")
                    .update(readFileSync(root + path))
                    .digest("hex"),
            ],
        ),
    ),
};
writeFileSync(new URL("preservation.json", evidence), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
