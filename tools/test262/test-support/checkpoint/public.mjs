import { readFixtureFileSync as readFileSync } from "../fixture-files.mjs";
import { corpusRoot, scratchRoot } from "../environment.mjs";
import { createHash as sourceHash } from "node:crypto";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import { writeFileSync, mkdirSync, cpSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const own = scratchRoot;
const run = mkdtempSync(join(own, "run-"));
const hash = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => JSON.parse(readFileSync(p));
const save = (p, v) => writeFileSync(join(run, p), JSON.stringify(v, null, 2) + "\n");
const results = [];
function record(id, detail = {}) {
    results.push({ id, ...detail });
    save("results.json", results);
}
const root = join(run, "isolated");
mkdirSync(root);
writeFileSync(
    join(run, "actual-source-identities.json"),
    JSON.stringify(
        ["tools/test262/script-plan.mjs", "tools/test262/script-ledger.mjs"].map((path) => ({
            path,
            sha256: createHashForSource(readFileSync(path)),
        })),
        null,
        2,
    ) + "\n",
);
function createHashForSource(bytes) {
    return sourceHash("sha256").update(bytes).digest("hex");
}

function copy(path) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    cpSync(path, join(root, path), { recursive: true });
}
for (const path of [
    "tools/test262/script-plan.mjs",
    "tools/test262/script-ledger.mjs",
    "tools/test262/input.mjs",
    "tools/test262/script-capabilities.mjs",
    "tools/test262/script-capabilities.json",
    "test/fixtures/test262-selection/manifest.json",
    "package.json",
    "package-lock.json",
    "node_modules/yaml",
]) {
    copy(path);
}
const plan = await import(pathToFileURL(join(root, "tools/test262/script-plan.mjs")));
const api = await import(pathToFileURL(join(root, "tools/test262/script-ledger.mjs")));
const input = await import(pathToFileURL(join(root, "tools/test262/input.mjs")));
const { manifest } = await input.frozenManifest();
const options = (lane) => ({
    root: corpusRoot,
    revision: input.REVISION,
    lane,
    paths: manifest.entries.map((e) => e.path),
});
const error = (prefix, code) => (e) => {
    assert.equal(Object.getPrototypeOf(e), Error.prototype);
    assert.equal(e.message, prefix + "/" + code);
    assert.deepEqual(Object.keys(e), []);
    return true;
};
const rejects = (promise, code) => assert.rejects(promise, error("script-ledger-store", code));
const ledgerError = (code) => error("script-ledger", code);
const reportRows = read("test/fixtures/tooling/ts-035e2b-p/report-literals.json");
const selections = {};
for (const lane of ["node", "native"]) {
    const selected = await plan.prepareScriptSelection(options(lane));
    const selection = plan.inspectScriptSelection(selected);
    selections[lane] = selection;
    assert.equal(selection.policy.id, "rift-script-blocked-v4");
    assert.equal(selection.policy.files.length, 242);
    const ledger = api.newScriptLedger(selected),
        ids = selection.files.flatMap((f) => f.slots ?? []).map((s) => s.id);
    assert.equal(ids.length, 60);
    const directory = join(run, "public-" + lane);
    const pendingCreate = api.createScriptLedgerStore(directory, ledger);
    assert.throws(() => api.appendScriptPolicy(ledger, ids[0]), ledgerError("owner"));
    const store = await pendingCreate;
    assert.deepEqual(await fs.readdir(directory), []);
    const pending = api.checkpointScriptLedger(store);
    assert.throws(() => api.inspectScriptLedger(ledger), ledgerError("owner"));
    await rejects(api.checkpointScriptLedger(store), "owner");
    let checkpoint = await pending;
    assert.equal(await api.checkpointScriptLedger(store), checkpoint);
    const initial = await fs.readFile(join(directory, "checkpoint-0.json"));
    const snapshot = JSON.parse(initial);
    assert.equal(snapshot.generation, 0);
    assert.equal(snapshot.previousSha256, null);
    assert.deepEqual(snapshot.ledger, api.inspectScriptLedger(ledger));
    assert.deepEqual(snapshot.report, api.reportScriptLedger(ledger));
    assert.equal(initial.toString(), JSON.stringify(snapshot, null, 2) + "\n");
    api.appendScriptPolicy(ledger, ids[1]);
    await rejects(api.reopenScriptLedger(checkpoint), "owner");
    const previous = checkpoint;
    checkpoint = await api.checkpointScriptLedger(store);
    await rejects(api.reopenScriptLedger(previous), "owner");
    const nextBytes = await fs.readFile(join(directory, "checkpoint-1.json"));
    assert.equal(JSON.parse(nextBytes).previousSha256, hash(initial));
    let reopened = await api.reopenScriptLedger(checkpoint);
    assert.throws(() => api.reportScriptLedger(ledger), ledgerError("owner"));
    await rejects(api.reopenScriptLedger(checkpoint), "owner");
    const rotated = await api.checkpointScriptLedger(store);
    assert.notEqual(rotated, checkpoint);
    assert.deepEqual(await fs.readFile(join(directory, "checkpoint-1.json")), nextBytes);
    api.appendScriptPolicy(reopened, ids[1], "  retained retry \t");
    for (const id of ids.filter((id) => id !== ids[1])) {
        api.appendScriptPolicy(reopened, id);
    }
    const report = api.reportScriptLedger(reopened);
    assert.equal(report.completed, 60);
    assert.equal(report.counts["unsupported-feature"], 19);
    assert.equal(report.counts["unsupported-profile"], 41);
    assert.equal(report.attempts, 61);
    assert.equal(report.exitCode, 1);
    assert.equal(report.executedVariants, 0);
    checkpoint = await api.checkpointScriptLedger(store);
    const finalBytes = await fs.readFile(join(directory, "checkpoint-2.json"));
    assert.equal(JSON.parse(finalBytes).previousSha256, hash(nextBytes));
    const tamper = JSON.parse(finalBytes);
    tamper.ledger.attempts[1].retryReason = "changed and rehashed";
    await fs.writeFile(
        join(directory, "checkpoint-2.json"),
        JSON.stringify(tamper, null, 2) + "\n",
    );
    await rejects(api.reopenScriptLedger(checkpoint), "bytes");
    await fs.writeFile(join(directory, "checkpoint-2.json"), finalBytes);
    assert.deepEqual(api.reportScriptLedger(reopened), report);
    // No append/cancel method invoked: missing entries and ordinals stay untouched.
    record("public-" + lane, {
        slots: 60,
        counts: report.counts,
        generations: 3,
        checks: [
            "create-lock",
            "checkpoint-lock",
            "no-op",
            "dirty",
            "stale",
            "revoke",
            "one-use",
            "rotated-no-op",
            "exact-chain",
            "tamper",
            "retry-original",
            "report-consistency",
        ],
    });
    for (const row of reportRows.filter((r) => r.selectionId === lane)) {
        const t = api.newScriptLedger(await plan.prepareScriptSelection(options(lane)));
        for (const a of row.attempts) {
            api.appendScriptPolicy(t, a.slotId, a.retryReason);
        }
        assert.deepEqual(api.reportScriptLedger(t), row.expected);
        assert.deepEqual(api.inspectScriptLedger(t).attempts, row.attempts);
    }
    record("inherited-full-literal-" + lane, {
        reports: reportRows.filter((r) => r.selectionId === lane).length,
    });
}
save("actual-selections.json", selections);
// Independent literal materialization: immutable prior expected reports and full
// histories; no values obtained from the proposed report implementation.
const legacy = [
    ...read("test/fixtures/tooling/ts-035e2b-p/design-selections.json").rows,
    ...read("test/fixtures/tooling/ts-035e2b-p/supplemental-literals.json").rows,
];
const rows = [
    ...reportRows,
    ...read("test/fixtures/tooling/ts-035e2b-p/supplemental-literals.json").reports,
];
const literals = [];
for (const [index, row] of rows.entries()) {
    const selected = structuredClone(legacy.find((s) => s.id === row.selectionId).selection);
    selected.policy = structuredClone(selections[selected.lane].policy);
    const ledger = {
        ledgerVersion: 2,
        kind: "script-policy-ledger",
        selection: selected,
        attempts: row.attempts,
    };
    const value = {
        checkpointVersion: 1,
        kind: "script-policy-checkpoint",
        generation: 0,
        previousSha256: null,
        ledger,
        report: row.expected,
    };
    const bytes = JSON.stringify(value, null, 2) + "\n";
    const path = `literal-${String(index).padStart(2, "0")}.json`;
    writeFileSync(join(run, path), bytes);
    literals.push({
        id: row.id,
        path,
        sha256: hash(bytes),
        byteLength: Buffer.byteLength(bytes),
        sourceSelection: row.selectionId,
    });
}
save("literal-manifest.json", literals);
record("complete-literals", { count: literals.length, authority: false });
// Exact byte and native errno probe, separately from the checkpoint model.
const probe = join(run, "filesystem");
await fs.mkdir(probe);
const temp = join(probe, "temp"),
    dest = join(probe, "final");
const handle = await fs.open(temp, "wx");
await handle.writeFile("complete\nbytes\u0000");
await handle.sync();
await handle.close();
await fs.link(temp, dest);
assert.deepEqual(await fs.readFile(dest), await fs.readFile(temp));
await assert.rejects(fs.link(temp, dest), (e) => e.code === "EEXIST");
await fs.unlink(temp);
assert.equal((await fs.stat(dest)).nlink, 1);
assert.equal(await fs.readFile(dest, "utf8"), "complete\nbytes\u0000");
record("filesystem-link", {
    complete: true,
    collision: "EEXIST",
    unchanged: true,
    cleanup: true,
    powerLoss: false,
});
for (const type of ["junction", "dir"]) {
    const alias = join(probe, "alias-" + type);
    try {
        await fs.symlink(probe, alias, type);
        const selected = await plan.prepareScriptSelection(options("node"));
        const t = api.newScriptLedger(selected);
        await rejects(api.createScriptLedgerStore(join(alias, "child"), t), "path");
        record("alias-" + type, { rejected: true });
    } catch (e) {
        if (e.code === "EPERM") {
            record("alias-" + type, { unavailable: e.code });
        } else {
            throw e;
        }
    }
}
console.log(JSON.stringify({ run, results: results.length, literals: literals.length }));
