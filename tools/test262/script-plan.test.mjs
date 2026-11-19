import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile,
    writeFile,
    mkdir,
    cp,
    rm,
    unlink,
    link,
    symlink,
    rename,
} from "node:fs/promises";
import { resolve, dirname, sep } from "node:path";
import { pathToFileURL } from "node:url";
import * as api from "./script-plan.mjs";
import { frozenManifest, REVISION, sha256, blobHash } from "./input.mjs";
import {
    evidence,
    scratchRoot,
    corpusRoot,
    json,
    frozen,
    sandbox,
} from "./test-support/plan-support.mjs";
const reportRoot = resolve("build/script-plan-tests");
await mkdir(reportRoot, { recursive: true });
const save = (name, value) =>
    writeFile(resolve(reportRoot, name), JSON.stringify(value, null, 2) + "\n");
const { prepareScriptSelection: prepare, inspectScriptSelection: inspect } = api;
const { manifest } = await frozenManifest();
const paths = manifest.entries.map((e) => e.path);
const options = () => ({ root: corpusRoot, revision: REVISION, lane: "node", paths: [paths[0]] });
const error = (code) => (e) => {
    assert.equal(Object.getPrototypeOf(e), Error.prototype);
    assert.equal(e.message, "script-plan/" + code);
    assert.deepEqual(Object.keys(e), []);
    return true;
};

// Preserve historical behavior while checking the current planner input closure.
async function ledgerPolicyLiteral(selection) {
    const value = structuredClone(selection),
        policy = value.policy;
    assert.equal(policy.id, "rift-script-blocked-v2");
    assert.equal(policy.files.length, 241);
    assert.equal(policy.closureSha256, sha256(JSON.stringify(policy.files)));
    assert.equal(policy.files.filter((f) => f.path === "tools/test262/script-plan.mjs").length, 1);
    assert.equal(
        policy.files.find((f) => f.path === "tools/test262/script-plan.mjs").sha256,
        "d1d8bd3a0eecb2336ccafea70fe5b08432932898a0f3763b2567d38a7feb9a62",
    );
    assert(!policy.files.some((f) => f.path === "tools/test262/script-ledger.mjs"));
    policy.files.push({ path: "tools/test262/script-ledger.mjs", sha256: "" });
    for (const file of policy.files) {
        let path;
        if (file.path === "@node") {
            path = process.execPath;
        } else if (file.path.startsWith("@yaml/")) {
            path = "node_modules/yaml/" + file.path.slice(6);
        } else {
            path = file.path;
        }
        file.sha256 = sha256(await readFile(path));
    }
    policy.files.sort((a, b) => {
        if (a.path < b.path) {
            return -1;
        } else if (a.path > b.path) {
            return 1;
        } else {
            return 0;
        }
    });
    assert.equal(policy.files.length, 242);
    policy.id = "rift-script-blocked-v4";
    policy.closureSha256 = sha256(JSON.stringify(policy.files));
    return value;
}

async function cleanup(root) {
    assert(resolve(root).startsWith(scratchRoot + sep + "plan-"));
    await rm(root, { recursive: true, force: true });
}

test("exact exports, argument descriptors and field validation invoke no accessors", async () => {
    assert.deepEqual(Object.keys(api).sort(), [
        "assertScriptSelectionCurrent",
        "inspectScriptSelection",
        "prepareScriptSelection",
    ]);
    for (const args of [
        [],
        [options(), {}],
        [null],
        [[]],
        [Object.create(null)],
        [new Date()],
        [{ ...options(), extra: 1 }],
    ]) {
        await assert.rejects(prepare(...args), error("arguments"));
    }
    let calls = 0;
    for (const field of ["root", "revision", "lane", "paths"]) {
        const value = options();
        Object.defineProperty(value, field, {
            get() {
                calls++;
                throw 0;
            },
        });
        await assert.rejects(prepare(value), error("arguments"));
    }
    const symbol = options();
    symbol[Symbol()] = 1;
    await assert.rejects(prepare(symbol), error("arguments"));
    for (const [key, values] of Object.entries({
        root: ["", null, 1],
        revision: ["", null, 1],
        lane: ["", null, "other"],
        paths: [[], null, {}, [""], [1], [paths[0], paths[0]], Array(1)],
    })) {
        for (const value of values) {
            await assert.rejects(prepare({ ...options(), [key]: value }), error("options"));
        }
    }
    for (const key of ["0", "keys", "every", Symbol.iterator]) {
        const value = [paths[0]];
        Object.defineProperty(value, key, {
            get() {
                calls++;
                throw 0;
            },
        });
        await assert.rejects(prepare({ ...options(), paths: value }), error("options"));
    }
    const exotic = [paths[0]];
    Object.setPrototypeOf(exotic, null);
    await assert.rejects(prepare({ ...options(), paths: exotic }), error("options"));
    assert.equal(calls, 0);
});

test("complete literal both-lane projections, revision preservation and independent byte closure", async () => {
    const literals = await Promise.all(
        (await json(resolve(evidence, "selection-literals.json"))).map(async (row) => ({
            ...row,
            selection: await ledgerPolicyLiteral(row.selection),
        })),
    );
    const observed = [];
    for (const row of literals) {
        const actual = inspect(
            await prepare({ root: corpusRoot, revision: row.revision, lane: row.lane, paths }),
        );
        assert.match(actual.runId, /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/);
        assert.notEqual(actual.runId, row.selection.runId);
        assert.deepEqual({ ...actual, runId: row.selection.runId }, row.selection);
        frozen(actual);
        assert.equal(actual.execution, null);
        assert.equal(actual.policy.closureSha256, sha256(JSON.stringify(actual.policy.files)));
        assert.equal(
            actual.authority.registrySha256,
            sha256(await readFile("tools/test262/script-capabilities.json")),
        );
        for (const file of actual.policy.files) {
            let path;
            if (file.path === "@node") {
                path = process.execPath;
            } else if (file.path.startsWith("@yaml/")) {
                path = "node_modules/yaml/" + file.path.slice(6);
            } else {
                path = file.path;
            }
            assert.equal(file.sha256, sha256(await readFile(path)), file.path);
        }
        observed.push(actual);
    }
    await save("fresh-selections.json", observed);
});

test("snapshot before await; caller unchanged; fresh tokens and detached frozen inspections", async () => {
    const caller = options(),
        before = structuredClone(caller),
        pending = prepare(caller);
    caller.root = "missing";
    caller.lane = "native";
    caller.revision = "wrong";
    caller.paths[0] = "unknown";
    const token = await pending,
        first = inspect(token),
        second = inspect(token);
    assert.equal(first.files[0].path, before.paths[0]);
    assert.equal(first.lane, before.lane);
    assert.equal(first.revision, before.revision);
    assert.equal(first.files[0].inputError, null);
    assert(!Object.isFrozen(caller));
    assert(!Object.isFrozen(caller.paths));
    assert.deepEqual(token, {});
    assert(Object.isFrozen(token));
    assert.equal(Object.getPrototypeOf(token), Object.prototype);
    assert.notEqual(first, second);
    assert.notEqual(first.files[0].slots[0].metadata, second.files[0].slots[0].metadata);
    assert.deepEqual(first, second);
    frozen(token);
    frozen(first);
    assert.throws(() => first.files[0].slots[0].debts.pop(), TypeError);
    const next = await prepare(before);
    assert.notEqual(next, token);
    assert.notEqual(inspect(next).runId, first.runId);
    for (const fake of [
        null,
        undefined,
        1,
        {},
        structuredClone(token),
        JSON.parse(JSON.stringify(token)),
        first,
    ]) {
        assert.throws(() => inspect(fake), error("token"));
    }
    assert.throws(() => inspect(), error("arguments"));
    assert.throws(() => inspect(token, 1), error("arguments"));
    const foreign = await import(
        pathToFileURL(resolve("tools/test262/script-plan.mjs")).href + "?foreign"
    );
    const foreignToken = await foreign.prepareScriptSelection(before);
    assert.throws(() => inspect(foreignToken), error("token"));
    assert.throws(() => foreign.inspectScriptSelection(token), error("token"));
});

test("selected path order, unknown and fixture rejection, retrieval and partial include denominator", async () => {
    for (const path of ["test/unknown.js", "test/a_FIXTURE.js", "../x.js"]) {
        await assert.rejects(prepare({ ...options(), paths: [path] }), error("selection"));
    }
    const reversed = inspect(await prepare({ ...options(), paths: [paths[1], paths[0]] }));
    assert.deepEqual(
        reversed.files.map((f) => f.path),
        [paths[1], paths[0]],
    );
    assert.deepEqual(
        reversed.files.flatMap((f) => f.slots).map((s) => s.ordinal),
        [0, 1, 2, 3],
    );
    const box = await sandbox();
    const rows = [];
    try {
        const root = resolve(box.root, "corpus"),
            file = resolve(root, paths[0]);
        await mkdir(dirname(file), { recursive: true });
        let selected = inspect(await prepare({ ...options(), root }));
        assert.equal(selected.files[0].slots, null);
        assert.equal(selected.files[0].inputError.reasonCode, "retrieval");
        rows.push(selected);
        await cp(resolve(corpusRoot, paths[0]), file);
        for (const phase of ["missing-first", "missing-second", "corrupt-second"]) {
            if (phase === "missing-second") {
                await mkdir(resolve(root, "harness"));
                await cp(
                    resolve(corpusRoot, "harness/assert.js"),
                    resolve(root, "harness/assert.js"),
                );
            }
            if (phase === "corrupt-second") {
                await writeFile(resolve(root, "harness/sta.js"), "bad");
            }
            selected = inspect(await prepare({ ...options(), root }));
            assert.equal(selected.files[0].slots.length, 2);
            assert.equal(
                selected.files[0].inputError.reasonCode,
                phase === "corrupt-second" ? "blob-mismatch" : "include-missing",
            );
            for (const slot of selected.files[0].slots) {
                assert.deepEqual(slot.harness, []);
                assert.equal(slot.harnessState, "input-failed");
                assert(slot.debts.some((d) => d.id === "runtime:coverage"));
            }
            rows.push(selected);
        }
        await writeFile(file, "bad metadata bytes");
        selected = inspect(await prepare({ ...options(), root }));
        assert.equal(selected.files[0].slots, null);
        assert.equal(selected.files[0].inputError.reasonCode, "blob-mismatch");
        rows.push(selected);
        const expected = await Promise.all(
            (await json(resolve(evidence, "input-literals.json"))).map(ledgerPolicyLiteral),
        );
        assert.deepEqual(
            rows.map((row, i) => ({ ...row, runId: expected[i].runId })),
            expected,
        );
        await save("input-fault-results.json", rows);
    } finally {
        await cleanup(box.root);
    }
});

test("all twelve ordered second-check traces execute planner logic with isolated faults", async () => {
    const literals = await json("docs/validation/ts-035e2-p/second-check-literals.json"),
        results = [];
    for (const lane of ["node", "native"]) {
        for (const row of literals) {
            const box = await sandbox();
            try {
                Object.assign(box.control, row.input);
                let token;
                if (row.expected.error) {
                    await assert.rejects(
                        async () => {
                            token = await box.api.prepareScriptSelection({ ...options(), lane });
                        },
                        error(row.expected.error.slice(12)),
                    );
                } else {
                    token = await box.api.prepareScriptSelection({ ...options(), lane });
                }
                assert.equal(!!token, row.expected.published);
                assert.deepEqual(box.control.trace, row.expected.trace, row.id);
                results.push({
                    id: row.id,
                    lane,
                    reachable: row.reachable,
                    actual: {
                        error: row.expected.error,
                        published: !!token,
                        trace: [...box.control.trace],
                    },
                });
            } finally {
                await cleanup(box.root);
            }
        }
    }
    await save("second-check-results.json", results);
});

test("malformed metadata after exact byte verification retains a null-slot file in copied corpus", async () => {
    const rows = [];
    for (const source of [
        "/*---\ndescription: broken\nflags: [\n---*/\n",
        "/*---\ndescription: metadata mismatch\nflags: [raw]\n---*/\n",
    ]) {
        const box = await sandbox(async (root, modules) => {
            const path = resolve(root, "fixtures/assistance/test262-starter-corpus/manifest.json");
            const manifestCopy = await json(path);
            manifestCopy.entries[0].blob = blobHash(Buffer.from(source));
            await writeFile(path, JSON.stringify(manifestCopy));
            const inputPath = resolve(modules, "input.mjs");
            const input = await readFile(inputPath, "utf8");
            assert.match(
                input,
                /const SELECTION_DIGEST\s*=\s*["']eefae56c3fda22bdd1a504744c56f296eb76b5200c3b614d2041af205f1b773f["']/,
            );
            await writeFile(
                inputPath,
                input.replace(
                    "eefae56c3fda22bdd1a504744c56f296eb76b5200c3b614d2041af205f1b773f",
                    sha256(JSON.stringify(manifestCopy)),
                ),
            );
            const target = resolve(root, "corpus", paths[0]);
            await mkdir(dirname(target), { recursive: true });
            await writeFile(target, source);
        });
        try {
            const selection = box.api.inspectScriptSelection(
                await box.api.prepareScriptSelection({
                    ...options(),
                    root: resolve(box.root, "corpus"),
                }),
            );
            assert.deepEqual(selection.files, [
                {
                    ordinal: 0,
                    path: paths[0],
                    manifestId: manifest.entries[0].id,
                    inputError: {
                        status: "harness-error",
                        stage: "input",
                        reasonCode: source.includes("broken")
                            ? "metadata"
                            : "manifest-metadata-mismatch",
                    },
                    slots: null,
                },
            ]);
            rows.push(selection.files);
        } finally {
            await cleanup(box.root);
        }
    }
    await save("metadata-fault-results.json", rows);
});

test("initial precedence, actual fixed registry bytes, post-authority drift and closure aliases", async () => {
    const results = [];
    for (const initial of ["authority", "closure", "selection", "debts"]) {
        const box = await sandbox();
        try {
            box.control.initial = initial;
            await assert.rejects(box.api.prepareScriptSelection(options()), error(initial));
            assert.deepEqual(box.control.trace, []);
            results.push({ initial, error: "script-plan/" + initial });
        } finally {
            await cleanup(box.root);
        }
    }
    for (const fault of [
        "registry-invalid",
        "registry-missing",
        "after-authority",
        "hardlink",
        "junction",
    ]) {
        const box = await sandbox();
        try {
            const registry = resolve(box.modules, "script-capabilities.json"),
                lock = resolve(box.root, "package-lock.json");
            let expected = "authority";
            if (fault === "registry-invalid") {
                await writeFile(registry, "{}");
            }
            if (fault === "registry-missing") {
                await unlink(registry);
            }
            if (fault === "after-authority") {
                box.control.closure = fault;
                expected = "drift";
            }
            if (fault === "hardlink") {
                await link(lock, resolve(box.root, "alias.json"));
                expected = "closure";
            }
            if (fault === "junction") {
                const yaml = resolve(box.root, "node_modules/yaml"),
                    target = resolve(box.root, "actual-yaml");
                await rename(yaml, target);
                await symlink(target, yaml, "junction");
                expected = "closure";
            }
            await assert.rejects(box.api.prepareScriptSelection(options()), error(expected));
            results.push({
                fault,
                error: "script-plan/" + expected,
                trace: [...box.control.trace],
            });
        } finally {
            await cleanup(box.root);
        }
    }
    await save("precedence-results.json", results);
});

test("complete closure comparison rejects changed file records even with unchanged claimed digest", async () => {
    const box = await sandbox();
    try {
        box.control.closure = "different";
        box.control.maskDigest = true;
        await assert.rejects(box.api.prepareScriptSelection(options()), error("drift"));
        assert.deepEqual(box.control.trace, [
            "authority-read",
            "authority-compare",
            "closure-read",
            "closure-compare",
        ]);
    } finally {
        await cleanup(box.root);
    }
});
