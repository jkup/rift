// Real Rift execution only. Synthetic source bytes are labelled separately from
// the pinned corpus. Run after both builds: node .../observation.integration.mjs
import test, { after } from "node:test";
import assert from "node:assert/strict";
import {
    mkdir,
    readFile,
    writeFile,
    mkdtemp,
    symlink,
    link,
    readdir,
    copyFile,
    lstat,
} from "node:fs/promises";
import childProcess, { spawnSync } from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { resolve, join } from "node:path";
import { blobHash, sha256, transform } from "./input.mjs";
import { prepareObservation, launchObservation, validateLaunch } from "./observe.mjs";
const archiveRoot = resolve("build/observations");
await mkdir(archiveRoot, { recursive: true });
const artifacts = [];
after(async () => {
    if (!process.argv[2]) {
        return;
    }
    const evidenceRoot = resolve(process.argv[2]);
    // Evidence is append-only as well: a rerun must choose a new destination.
    await mkdir(evidenceRoot);
    const manifest = [];
    for (let i = 0; i < artifacts.length; i++) {
        const directory = artifacts[i];
        const target = join(evidenceRoot, String(i).padStart(2, "0"));
        await mkdir(target, { recursive: true });
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            if (entry.isFile()) {
                await copyFile(join(directory, entry.name), join(target, entry.name));
            }
        }
        manifest.push({ directory, archive: target });
    }
    await writeFile(join(evidenceRoot, "manifest.json"), JSON.stringify(manifest, null, 2));
});
const unit = "test/synthetic.js";
function options(lane, source, mode = "parser-observation", variant = "non-strict", limits = {}) {
    const sourceBytes = Buffer.from(source);
    const v = {
        id: "synthetic-" + lane,
        path: unit,
        lane,
        variant,
        goal: "Script",
        blob: blobHash(sourceBytes),
        sourceSha256: sha256(sourceBytes),
        transformedSourceSha256: sha256(transform(sourceBytes, variant)),
        metadata: { negative: null },
        harness: [{ path: "harness/assert.js", blob: "b".repeat(40), sha256: "a".repeat(64) }],
        blockers: [{ status: "unsupported-profile", reasonCode: "synthetic-profile" }],
    };
    return {
        selection: {
            revision: "b".repeat(40),
            manifestSha256: "a".repeat(64),
            files: [{ path: unit, inputError: null, variants: [v] }],
        },
        variantId: v.id,
        sourceBytes,
        mode,
        archiveRoot,
        limits,
    };
}
async function run(lane, source, mode = "parser-observation", variant = "non-strict", limits = {}) {
    const plan = await prepareObservation(options(lane, source, mode, variant, limits));
    const result = await launchObservation(plan);
    artifacts.push(result.directory);
    assert.equal(result.state, "complete");
    assert.equal(result.record.identity.lane, lane);
    assert.equal(result.record.evidence.harnessValidated, false);
    assert.deepEqual(result.record.inputs.harness, []);
    assert.equal(Object.hasOwn(result.record, "classification"), false);
    assert.equal(result.record.evidence.process.exitCode, 0);
    assert.equal(result.record.evidence.process.signal, null);
    assert.equal(result.record.evidence.process.deadlineExpired, false);
    return {
        ...result,
        stdout: await readFile(join(result.directory, "stdout.bin"), "utf8"),
        plan,
    };
}
// Test-only observer for cancellation lifecycle stages. It forwards observe.mjs's
// exact spawn call and returns the same ChildProcess, adding only listeners for the
// real 'spawn' event and the child's own first stdout line. Production code is unchanged.
async function observingSpawn(body) {
    const original = childProcess.spawn,
        children = [];
    let resolveFirst;
    children.first = new Promise((r) => {
        resolveFirst = r;
    });
    childProcess.spawn = (...args) => {
        const child = original(...args);
        let text = "";
        const started = new Promise((resolveStarted, rejectStarted) => {
            child.once("error", rejectStarted);
            child.stdout.on("data", (chunk) => {
                text += chunk;
                if (text.includes("started")) {
                    resolveStarted();
                }
            });
        });
        const spawned = new Promise((resolveSpawned, rejectSpawned) => {
            child.once("spawn", resolveSpawned);
            child.once("error", rejectSpawned);
        });
        started.catch(() => {});
        spawned.catch(() => {});
        children.push({ child, spawned, started });
        resolveFirst(children[0]);
        return child;
    };
    syncBuiltinESMExports();
    try {
        return await body(children);
    } finally {
        childProcess.spawn = original;
        syncBuiltinESMExports();
    }
}
const exists = (path) =>
    lstat(path).then(
        () => true,
        (e) => {
            if (e.code === "ENOENT") {
                return false;
            }
            throw e;
        },
    );
async function assertUnfinished(plan, result) {
    artifacts.push(result.directory);
    assert.equal(result.state, "unfinished");
    assert.equal(result.directory, plan.directory);
    assert.equal(Object.hasOwn(result, "record"), false);
    const saved = JSON.parse(await readFile(join(plan.directory, "attempt.json"), "utf8"));
    assert.equal(saved.state, "unfinished");
    assert.equal(Object.hasOwn(saved, "record"), false);
    assert.equal(await exists(plan.resultPath), false);
    // A cancelled plan is consumed: it cannot be relaunched into a terminal record.
    await assert.rejects(launchObservation(plan), /context/);
}
// Cancels only after observe.mjs's own child has spawned and evaluated its first line.
async function cancelLaunchedChild(lane) {
    const plan = await prepareObservation(
        options(lane, "console.log('started'); while(true){}", "body-observation", "non-strict", {
            steps: Number.MAX_SAFE_INTEGER,
        }),
    );
    const controller = new AbortController();
    return observingSpawn(async (children) => {
        const promise = launchObservation(plan, { signal: controller.signal });
        const closed = promise.then(
            () => "closed",
            () => "closed",
        );
        assert.equal(
            await Promise.race([children.first.then(() => "launched"), closed]),
            "launched",
        );
        const { child, spawned, started } = children[0];
        assert.equal(await Promise.race([spawned.then(() => "spawned"), closed]), "spawned");
        assert.equal(await Promise.race([started.then(() => "started"), closed]), "started");
        assert.equal(child.exitCode, null);
        assert.equal(child.signalCode, null);
        controller.abort();
        const result = await promise;
        assert.equal(children.length, 1);
        return { plan, result, child };
    });
}
async function assertLaunchedCancellation({ plan, result, child }) {
    await assertUnfinished(plan, result);
    const transport = JSON.parse(await readFile(join(plan.directory, "transport.json"), "utf8"));
    assert.equal(transport.cancelled, true);
    assert.equal(transport.spawnError, null);
    assert.equal(transport.process.deadlineExpired, false);
    assert.equal(transport.capCount, null);
    assert.equal(transport.capKilled, false);
    assert.equal(transport.process.exitCode, null);
    assert.equal(transport.process.signal, "SIGTERM");
    assert.equal(child.exitCode, null);
    assert.equal(child.signalCode, "SIGTERM");
    assert.equal(child.killed, true);
    assert.throws(() => process.kill(child.pid, 0), { code: "ESRCH" });
    const out = await readFile(join(plan.directory, "stdout.bin"));
    assert.equal(sha256(out), transport.stdoutSha256);
    assert.match(out.toString("utf8"), /^started\r?\n/);
}
async function assertNoLaunch(plan, result, children) {
    await assertUnfinished(plan, result);
    assert.equal(children.length, 0);
    // No child means no transport facts; the attempt holds only its prepared inputs.
    assert.deepEqual((await readdir(plan.directory)).sort(), ["attempt.json", "source.js"]);
}
for (const lane of ["node", "native"]) {
    test(`${lane} T21 preparation snapshots caller selection, nested metadata and source before yielding`, async () => {
        const input = options(lane, "return 1;", "parser-observation", "non-strict", {
            steps: 1234,
        });
        const variant = input.selection.files[0].variants[0];
        variant.metadata.negative = { phase: "parse", type: "SyntaxError" };
        const originalSelection = structuredClone(input.selection);
        const originalVariant = originalSelection.files[0].variants[0];
        const originalBytes = Buffer.from(input.sourceBytes);
        const pending = prepareObservation(input);
        // Literal independent-review reproducer plus all other retained metadata.
        variant.variant = "strict";
        variant.path = "test/mutated.js";
        variant.blob = "c".repeat(40);
        variant.sourceSha256 = "d".repeat(64);
        variant.transformedSourceSha256 = "e".repeat(64);
        variant.lane = lane === "node" ? "native" : "node";
        variant.metadata.negative.type = "TypeError";
        variant.blockers[0].reasonCode = "mutated-blocker";
        variant.harness[0].path = "harness/mutated.js";
        input.selection.revision = "f".repeat(40);
        input.selection.manifestSha256 = "f".repeat(64);
        input.sourceBytes.fill(32);
        input.limits.steps = 0;
        const plan = await pending;
        artifacts.push(plan.directory);
        assert.deepEqual(plan.selection, {
            revision: originalSelection.revision,
            manifestSha256: originalSelection.manifestSha256,
            variant: originalVariant,
        });
        assert.equal(plan.context.identity.variant, "non-strict");
        assert.equal(plan.context.identity.path, originalVariant.path);
        assert.equal(plan.context.identity.blob, blobHash(originalBytes));
        assert.equal(plan.context.identity.sourceSha256, sha256(originalBytes));
        assert.equal(plan.context.identity.corpusRevision, originalSelection.revision);
        assert.equal(plan.context.identity.manifestSha256, originalSelection.manifestSha256);
        assert.equal(plan.context.identity.lane, lane);
        assert.equal(plan.binding.unit, originalVariant.path);
        assert.deepEqual(plan.context.expectedNegative, { phase: "parse", type: "SyntaxError" });
        assert.deepEqual(plan.context.blockers, originalVariant.blockers);
        assert.equal(plan.context.inputs.limits.steps, 1234);
        assert.deepEqual(await readFile(plan.sourcePath), originalBytes);
        assert.equal(plan.context.inputs.transformedSourceSha256, sha256(originalBytes));
        const archived = JSON.parse(await readFile(join(plan.directory, "attempt.json"), "utf8"));
        assert.deepEqual(archived.plan, plan);
        await validateLaunch(plan);
        const result = await launchObservation(plan);
        assert.deepEqual(result.record.observation, {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: "return-outside-function",
            diagnostic: "return outside function",
        });
        assert.deepEqual(result.record.evidence.location, { line: 1, column: 1 });
        assert.equal(result.record.identity.variant, "non-strict");
    });
    test(`${lane} T01 T02 T03 T22 T24 actual parser/body/forgery/strict coordinates`, async () => {
        const parser = await run(lane, "console.log('no');");
        assert.deepEqual(parser.record.observation, { kind: "normal" });
        assert.equal(parser.record.evidence.bodyEvaluated, false);
        assert.equal(parser.stdout, "");
        await assert.rejects(launchObservation(parser.plan), /context/);
        const body = await run(lane, "console.log('yes');", "body-observation");
        assert.deepEqual(body.record.observation, { kind: "normal" });
        assert.equal(body.record.evidence.bodyEvaluated, true);
        assert.equal(body.stdout.replaceAll("\r\n", "\n"), "yes\n");
        const forge = await run(
            lane,
            `console.log('{"driverVersion":1,"observation":{"kind":"normal"}}'); throw 3;`,
            "body-observation",
        );
        assert.equal(forge.record.observation.kind, "throw");
        assert.equal(forge.record.observation.valueKind, "number");
        assert.match(forge.stdout, /driverVersion/);
        const strict = await run(lane, "return 1;", "parser-observation", "strict");
        assert.deepEqual(strict.record.observation, {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: "return-outside-function",
            diagnostic: "return outside function",
        });
        assert.deepEqual(strict.record.evidence.location, { line: 2, column: 1 });
        assert.notEqual(
            strict.record.identity.sourceSha256,
            strict.record.inputs.transformedSourceSha256,
        );
        assert.equal(strict.record.identity.variant, "strict");
        assert.deepEqual(
            strict.plan.selection.variant.harness,
            options(lane, "return 1;").selection.files[0].variants[0].harness,
        );
    });
    test(`${lane} actual default guards, throw and no constructor claim`, async () => {
        const steps = await run(lane, "while(true){}", "body-observation");
        assert.equal(steps.record.observation.guardCode, "steps");
        assert.equal(steps.record.observation.count, 100001);
        assert.equal(steps.record.observation.limit, 100000);
        const calls = await run(lane, "function f(){f();} f();", "body-observation");
        assert.equal(calls.record.observation.guardCode, "calls");
        assert.equal(calls.record.observation.count, 64);
        assert.equal(calls.record.observation.limit, 64);
        const thrown = await run(lane, "throw {name:'TypeError'};", "body-observation");
        assert.equal(thrown.record.observation.constructor.outcome, "unsupported");
    });
    test(`${lane} T17 T18 invalid argument and every numeric input fault`, async () => {
        const dir = await mkdtemp(join(archiveRoot, "arguments-"));
        const source = join(dir, "source.js");
        await writeFile(source, "console.log('MUST NOT RUN');");
        const entry = resolve(
            lane === "node"
                ? "build/node/src/observation-driver.js"
                : "build/native/observation-driver.exe",
        );
        const command = lane === "node" ? process.execPath : entry;
        const prefix = lane === "node" ? [entry] : [];
        const args = [
            "body-observation",
            source,
            unit,
            join(dir, "result.json"),
            "nonce",
            "100000",
            "64",
        ];
        const cases = [
            args.slice(1),
            [...args, "extra"],
            ["bad", ...args.slice(1)],
            [args[0], join(dir, "missing.js"), ...args.slice(2)],
        ];
        for (const at of [5, 6]) {
            for (const value of ["-1", "NaN", "1.5", "9007199254740992", ""]) {
                const bad = [...args];
                bad[at] = value;
                cases.push(bad);
            }
        }
        const records = [];
        for (const bad of cases) {
            const r = spawnSync(command, [...prefix, ...bad], { encoding: "utf8", timeout: 10000 });
            records.push({
                args: bad,
                status: r.status,
                signal: r.signal,
                stdout: r.stdout,
                stderr: r.stderr,
            });
            assert.equal(r.status, 70);
            assert.equal(r.signal, null);
            assert.equal(r.stdout, "");
        }
        await writeFile(join(dir, "faults.json"), JSON.stringify(records, null, 2));
        artifacts.push(dir);
    });
    test(`${lane} T23 T32 exact encoder roundtrip and observable getter effects excluded`, () => {
        const entry = resolve(
            lane === "node"
                ? "build/node/test/observation-serialization.js"
                : "build/native/observation-serialization.exe",
        );
        const r = spawnSync(
            lane === "node" ? process.execPath : entry,
            lane === "node" ? [entry] : [],
            { encoding: "utf8", timeout: 10000 },
        );
        assert.equal(r.status, 0, r.stderr ?? String(r.error));
        assert.equal(r.signal, null);
        const [poison, encoded] = r.stdout.trim().split(/\r?\n/).map(JSON.parse);
        assert.equal(poison.observation.constructor.outcome, "unsupported");
        assert.equal(poison.bodyEvaluated, true);
        assert.equal(
            encoded.observation.diagnostic,
            'quote" slash/ backslash\\ CR\rLF\nNUL\0 lone-high\ud800 lone-low\udfff pair😀 LS\u2028PS\u2029',
        );
    });
    test(`${lane} actual timeout and combined output cap terminate process and archive real counts`, async () => {
        const timeoutPlan = await prepareObservation(
            options(lane, "while(true){}", "body-observation", "non-strict", {
                steps: Number.MAX_SAFE_INTEGER,
                wallMs: 100,
            }),
        );
        const timed = await launchObservation(timeoutPlan);
        artifacts.push(timed.directory);
        assert.equal(timed.record.observation.kind, "timeout");
        assert.equal(timed.record.evidence.process.deadlineExpired, true);
        const capPlan = await prepareObservation(
            options(
                lane,
                "while(true){console.log('1234567890');}",
                "body-observation",
                "non-strict",
                { steps: Number.MAX_SAFE_INTEGER, outputBytes: 100 },
            ),
        );
        const capped = await launchObservation(capPlan);
        artifacts.push(capped.directory);
        assert.equal(capped.record.observation.kind, "resource-limit");
        assert.equal(capped.record.observation.guardCode, "output");
        assert.equal(capped.record.observation.limit, 100);
        assert.ok(capped.record.observation.count > 100);
        assert.equal(capped.record.observation.count, capped.facts.capCount);
        assert.ok(capped.facts.outputBytes >= capped.facts.capCount);
        assert.equal(capped.facts.capKilled, true);
        assert.deepEqual(capped.record.evidence.process, capped.facts.process);
    });
    test(`${lane} T30 prelaunch cancellation with an already-aborted signal spawns nothing`, async () => {
        const plan = await prepareObservation(
            options(lane, "console.log('started'); while(true){}", "body-observation"),
        );
        const controller = new AbortController();
        controller.abort();
        await observingSpawn(async (children) =>
            assertNoLaunch(
                plan,
                await launchObservation(plan, { signal: controller.signal }),
                children,
            ),
        );
    });
    test(`${lane} T30 prelaunch cancellation during launch validation spawns nothing`, async () => {
        // The retained ts-031c-b failure stage, made deterministic: the signal is live
        // when launch starts and aborts before validateLaunch can settle (it awaits I/O).
        const plan = await prepareObservation(
            options(lane, "console.log('started'); while(true){}", "body-observation"),
        );
        const controller = new AbortController();
        await observingSpawn(async (children) => {
            const promise = launchObservation(plan, { signal: controller.signal });
            assert.equal(controller.signal.aborted, false);
            controller.abort();
            await assertNoLaunch(plan, await promise, children);
        });
    });
    test(`${lane} T30 cancellation after actual child launch terminates the child`, async () => {
        await assertLaunchedCancellation(await cancelLaunchedChild(lane));
    });
}
test("T19 fixed caps are rejected before any launch", async () => {
    for (const key of ["sourceUnits", "parseDepth", "evaluationDepth"]) {
        await assert.rejects(
            prepareObservation(options("node", "1;", undefined, undefined, { [key]: 1 })),
            /limits/,
        );
    }
});
test("T21 every prepared Identity/Inputs mutation is rejected before launch", async () => {
    const plan = await prepareObservation(options("node", "1;"));
    for (const section of ["identity", "inputs"]) {
        for (const key of Object.keys(plan.context[section])) {
            const value = plan.context[section][key];
            plan.context[section][key] = "mutated";
            await assert.rejects(validateLaunch(plan), /context/);
            plan.context[section][key] = value;
        }
    }
    await validateLaunch(plan);
    const pending = validateLaunch(plan);
    plan.context.identity.engineCommit = "a".repeat(40);
    await assert.rejects(pending, /context/);
});
test("T30 cancellation retains unfinished archive without terminal success", async () => {
    // Aborts on the running child's own first output instead of a 100ms timer, which
    // under load could fire during validateLaunch (see the per-lane prelaunch tests).
    const cancelled = await cancelLaunchedChild("node");
    const { plan, result } = cancelled;
    assert.equal(result.state, "unfinished");
    const saved = JSON.parse(await readFile(join(plan.directory, "attempt.json"), "utf8"));
    assert.equal(saved.state, "unfinished");
    assert.equal(Object.hasOwn(saved, "record"), false);
    const transport = JSON.parse(await readFile(join(plan.directory, "transport.json"), "utf8"));
    assert.equal(transport.cancelled, true);
    await assertLaunchedCancellation(cancelled);
});
test("T31 preexisting result and symlink attempt roots rejected, prior bytes preserved", async () => {
    const plan = await prepareObservation(options("node", "1;"));
    await writeFile(plan.resultPath, "prior");
    await assert.rejects(validateLaunch(plan), /preexisting-result/);
    assert.equal(await readFile(plan.resultPath, "utf8"), "prior");
    for (const aliasKind of ["symlink", "hardlink"]) {
        const aliasPlan = await prepareObservation(options("node", "1;"));
        // Windows directory junctions exercise the same lstat link rejection without
        // requiring the OS privilege for creating a file symlink.
        if (aliasKind === "symlink") {
            await symlink(archiveRoot, aliasPlan.resultPath, "junction");
        } else {
            await link(aliasPlan.sourcePath, aliasPlan.resultPath);
        }
        await assert.rejects(validateLaunch(aliasPlan), /preexisting-result/);
        assert.equal(await readFile(aliasPlan.sourcePath, "utf8"), "1;");
    }
    const dir = await mkdtemp(join(archiveRoot, "alias-"));
    const alias = join(dir, "link");
    await symlink(archiveRoot, alias, "junction");
    await assert.rejects(
        prepareObservation({ ...options("node", "1;"), archiveRoot: alias }),
        /path-alias/,
    );
});
