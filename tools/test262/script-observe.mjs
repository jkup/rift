import { spawn, execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir, lstat, realpath } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual as equal } from "node:util";
import { parseDocument } from "yaml";
import {
    sha256,
    blobHash,
    verifyBytes,
    transform,
    planCorpus,
    localBytes,
    frozenManifest,
    REVISION,
} from "./input.mjs";
import { parseScriptDriverResult } from "./script-driver-result.mjs";
import { assertScriptContext, inspectScriptEnvelope } from "./script-result.mjs";
const root = fileURLToPath(new URL("../..", import.meta.url));
const plans = new WeakMap();
const controlRegistrySha256 = "df69deab63fbd0869ea0ea6477b714c23a8ecb9a60cc65e1d5dae34a0144252a";
const preflightControlsSha256 = "9e4050f35d65f12841fb354381f9814b5c629f23d781ebfb6b7dae3786c3c9ba";
const fixed = {
    sourceUnits: 100000,
    parseDepth: 128,
    steps: 100000,
    calls: 64,
    evaluationDepth: 256,
    wallMs: 10000,
    outputBytes: 1048576,
};
const decode = (bytes) => new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
const need = (ok, why) => {
    if (!ok) {
        throw Error(why);
    }
};
function freeze(x) {
    if (x && typeof x === "object") {
        for (const v of Object.values(x)) {
            freeze(v);
        }
        Object.freeze(x);
    }
    return x;
}
async function save(path, value) {
    await writeFile(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
}
async function noAlias(path) {
    let p = resolve(path);
    while (true) {
        need(!(await lstat(p)).isSymbolicLink(), "path-alias");
        const next = dirname(p);
        if (next === p) {
            break;
        }
        p = next;
    }
    need((await realpath(path)).toLowerCase() === resolve(path).toLowerCase(), "path-alias");
}
async function absent(path) {
    try {
        await lstat(path);
    } catch (e) {
        if (e.code === "ENOENT") {
            return;
        }
        throw e;
    }
    throw Error("preexisting-result");
}
async function walk(dir, accept = () => true) {
    const out = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        need(!entry.isSymbolicLink(), "path-alias");
        if (entry.isDirectory()) {
            out.push(...(await walk(path, accept)));
        } else if (entry.isFile() && accept(path)) {
            out.push(path);
        }
    }
    return out.sort();
}
async function digestFiles(files) {
    const parts = [];
    for (const path of [...new Set(files)].sort()) {
        await noAlias(path);
        parts.push([path, sha256(await readFile(path))]);
    }
    return { sha256: sha256(JSON.stringify(parts)), files: parts };
}
async function closure(lane) {
    const source = await digestFiles([
        ...(await walk(join(root, "src"), (p) => p.endsWith(".ts"))),
        join(root, "test/script-observation.ts"),
        ...(await walk(join(root, "test/fixtures/script-observation"))),
        ...(await walk(join(root, "test/fixtures/harness-bundle"))),
        join(root, "package.json"),
        join(root, "package-lock.json"),
        join(root, "tsconfig.json"),
        join(root, "tools/build-native.mjs"),
        join(root, "tools/probe-verdict.mjs"),
    ]);
    const adapter = await digestFiles(
        ["script-observe.mjs", "script-driver-result.mjs", "script-result.mjs", "input.mjs"]
            .map((p) => join(root, "tools/test262", p))
            .concat([process.execPath], await walk(join(root, "node_modules/yaml"))),
    );
    const driver = join(
        root,
        lane === "node"
            ? "build/node/src/host/script-observation-driver.js"
            : "build/native/script-observation-driver.exe",
    );
    const control = join(
        root,
        lane === "node"
            ? "build/node/test/script-observation.js"
            : "build/native/script-observation.exe",
    );
    const built = await digestFiles(
        lane === "node"
            ? [
                  process.execPath,
                  ...(await walk(join(root, "build/node/src"), (p) => p.endsWith(".js"))),
                  control,
              ]
            : [driver, control],
    );
    return {
        source,
        adapter,
        built,
        driver,
        control,
        executable: lane === "node" ? process.execPath : driver,
    };
}
function limitsOf(limits) {
    need(limits && typeof limits === "object" && !Array.isArray(limits), "limits");
    need(
        Object.keys(limits).every((k) => Object.hasOwn(fixed, k)),
        "limits",
    );
    const r = { ...fixed, ...limits };
    need(
        Object.values(r).every((n) => Number.isSafeInteger(n) && n >= 0) && r.wallMs <= 2147483647,
        "limits",
    );
    for (const k of ["sourceUnits", "parseDepth", "evaluationDepth"]) {
        need(r[k] === fixed[k], "fixed-engine-limit");
    }
    return r;
}
function unit(bytes, path, role, n, variant = "raw", expectedBlob = blobHash(bytes)) {
    const original = verifyBytes(bytes, expectedBlob),
        transformed = role === "test" ? transform(bytes, variant) : Buffer.from(bytes),
        text = decode(transformed);
    return {
        unit: {
            id: "u" + n,
            ordinal: n,
            role,
            path,
            blob: original.blob,
            sourceSha256: original.sha256,
            transformedSha256: sha256(transformed),
            byteLength: bytes.length,
            sourceUnits: text.length,
        },
        text,
    };
}
function bind(units, texts, limits, variant, action, preflightId, other = false) {
    const request = {
        requestVersion: 2,
        nonce: randomUUID(),
        mode: "script-observation",
        variant,
        units,
        realms: other
            ? [
                  { id: "test", profile: "script" },
                  { id: "other", profile: "script" },
              ]
            : [{ id: "test", profile: "script" }],
        limits,
        preflightId,
        action,
    };
    return {
        nonce: request.nonce,
        requestSha256: sha256(JSON.stringify(request)),
        mode: request.mode,
        variant,
        units,
        realms: request.realms,
        preflightId,
        action,
        limits,
        sources: texts.map((transformedText, n) => ({ unitId: units[n].id, transformedText })),
    };
}
function contextFor(binding, identity, build, policySha256, metadata = null, blockers = []) {
    const test = binding.units.at(-1);
    return {
        identity: {
            schemaVersion: 2,
            runId: randomUUID(),
            mode: "script-observation",
            corpusRevision: REVISION,
            manifestSha256: identity.manifestSha256,
            path: test.path,
            blob: test.blob,
            sourceSha256: test.sourceSha256,
            variant: binding.variant,
            goal: "Script",
            lane: identity.lane,
            engineCommit: identity.commit,
            engineBuildSha256: build.built.sha256,
            adapterSha256: build.adapter.sha256,
            policySha256,
            dirtySourceSha256: build.source.sha256,
        },
        inputs: {
            units: binding.units,
            transformedSourceSha256: test.transformedSha256,
            profileId: "rift-script-observation-v2",
            capabilityLedgerSha256: null,
            host: process.version,
            platform: process.platform + "/" + process.arch,
            toolchain: "scriptc-0.4.7/typescript-7.0.2",
            limits: binding.limits,
            requestSha256: binding.requestSha256,
            preflightId: binding.preflightId,
            realms: binding.realms,
            ruleRegistrySha256: null,
        },
        expectedNegative: metadata?.negative ?? null,
        blockers,
    };
}
async function artifacts(directory, binding) {
    const sources = [];
    for (let n = 0; n < binding.sources.length; n++) {
        const path = join(directory, "u" + n + ".js");
        await writeFile(path, Buffer.from(binding.sources[n].transformedText, "utf8"), {
            flag: "wx",
            mode: 0o400,
        });
        sources.push(path);
    }
    const result = join(directory, "child.json");
    await absent(result);
    return { sources, result };
}
function transportOnly(f) {
    return {
        process: f.process,
        outputBytes: f.outputBytes,
        outputLimit: f.outputLimit,
        capCount: f.capCount,
        capKilled: f.capKilled,
        crashBeforeCap: f.crashBeforeCap,
    };
}
function compose(context, binding, bytes, facts, stage = "driver", fault = null) {
    const p = facts.process;
    let observation = null,
        child = null;
    if (p.deadlineExpired) {
        observation = { kind: "timeout", wallMs: binding.limits.wallMs };
    } else if (
        facts.crashBeforeCap ||
        (!facts.capKilled && (p.signal !== null || (p.exitCode !== null && p.exitCode !== 0)))
    ) {
        observation = { kind: "host-fault", faultCode: "crash" };
    } else if (facts.outputBytes > facts.outputLimit) {
        observation = {
            kind: "resource-limit",
            guardCode: "output",
            count: facts.capCount,
            limit: facts.outputLimit,
        };
    } else if (fault) {
        observation = { kind: "host-fault", faultCode: fault };
    } else {
        try {
            need(p.exitCode === 0, "process");
            child = parseScriptDriverResult(bytes, binding);
        } catch {
            observation = { kind: "host-fault", faultCode: "protocol" };
        }
    }
    const evidence = {
        stage: child ? child.operation.stage : stage,
        operation: child?.operation ?? null,
        source: child?.source ?? null,
        testBodyEvaluated: child?.testBodyEvaluated ?? false,
        harnessValidated: child?.harnessValidated ?? false,
        preflightId: binding.preflightId,
        completedUnits: child?.completedUnits ?? [],
        inspection: child?.inspection ?? null,
        process: p,
        stdoutSha256: facts.stdoutSha256,
        stderrSha256: facts.stderrSha256,
        elapsedMs: facts.elapsedMs,
    };
    const record = {
        identity: context.identity,
        inputs: context.inputs,
        evidence,
        observation: child?.result ?? observation,
    };
    assertScriptContext(record, context, binding);
    need(
        equal(
            inspectScriptEnvelope(JSON.stringify(record), context, transportOnly(facts), binding),
            record,
        ),
        "transport-roundtrip",
    );
    return record;
}
async function processAttempt(saved, { signal } = {}) {
    const { context, binding, build, directory, paths, control, input } = saved;
    for (let n = 0; n < paths.sources.length; n++) {
        await noAlias(paths.sources[n]);
        need(
            sha256(await readFile(paths.sources[n])) === binding.units[n].transformedSha256,
            "source-drift",
        );
    }
    await absent(paths.result);
    await absent(paths.result + ".control.json");
    const facts = {
        process: { exitCode: null, signal: null, deadlineExpired: false },
        outputBytes: 0,
        outputLimit: binding.limits.outputBytes,
        capCount: null,
        capKilled: false,
        crashBeforeCap: false,
        elapsedMs: 0,
        stdoutSha256: null,
        stderrSha256: null,
    };
    if (signal?.aborted) {
        return { state: "unfinished", directory };
    }
    const args = [
        binding.mode,
        binding.action,
        binding.nonce,
        binding.requestSha256,
        binding.preflightId ?? "-",
        paths.result,
        String(binding.limits.steps),
        String(binding.limits.calls),
        ...binding.units.flatMap((u, n) => [u.id, u.role, paths.sources[n]]),
    ];
    const node = context.identity.lane === "node",
        entry = control ? build.control : build.driver;
    const prefix = node ? [entry] : [];
    if (control) {
        const inputPath = join(directory, "control-input.txt");
        await writeFile(inputPath, input + "\n", { flag: "wx", mode: 0o400 });
        prefix.push(control, inputPath);
    }
    const stdout = [],
        stderr = [],
        outHash = createHash("sha256"),
        errHash = createHash("sha256");
    let cancelled = false,
        spawnError = null,
        spawned = false;
    const start = performance.now();
    await new Promise((done) => {
        const child = spawn(node ? process.execPath : entry, [...prefix, ...args], {
            cwd: root,
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"],
        });
        const cancel = () => {
            cancelled = true;
            child.kill();
        };
        signal?.addEventListener("abort", cancel, { once: true });
        if (signal?.aborted) {
            cancel();
        }
        child.once("spawn", () => {
            spawned = true;
        });
        const timer = setTimeout(() => {
            facts.process.deadlineExpired = true;
            child.kill();
        }, binding.limits.wallMs);
        const capture = (list, hash, chunk) => {
            hash.update(chunk);
            const prior = facts.outputBytes;
            facts.outputBytes += chunk.length;
            // Retain at most the cap plus the first crossing chunk; counts still cover
            // all pipe bytes even after termination has been requested.
            if (prior <= facts.outputLimit) {
                list.push(chunk);
            }
            if (facts.capCount === null && facts.outputBytes > facts.outputLimit) {
                facts.capCount = facts.outputBytes;
                facts.crashBeforeCap =
                    child.signalCode !== null || (child.exitCode !== null && child.exitCode !== 0);
                if (!facts.crashBeforeCap) {
                    facts.capKilled = child.kill();
                }
            }
        };
        child.stdout.on("data", (chunk) => capture(stdout, outHash, chunk));
        child.stderr.on("data", (chunk) => capture(stderr, errHash, chunk));
        child.on("error", (e) => {
            spawnError = { code: e.code ?? null, message: e.message };
        });
        child.on("exit", (code, sig) => {
            if (facts.capCount === null && (sig !== null || code !== 0)) {
                facts.crashBeforeCap = true;
            }
        });
        child.on("close", (code, sig) => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", cancel);
            facts.process = {
                exitCode: sig === null ? code : null,
                signal: sig,
                deadlineExpired: facts.process.deadlineExpired,
            };
            done();
        });
    });
    facts.elapsedMs = performance.now() - start;
    const out = Buffer.concat(stdout),
        err = Buffer.concat(stderr);
    facts.stdoutSha256 = outHash.digest("hex");
    facts.stderrSha256 = errHash.digest("hex");
    await writeFile(join(directory, "stdout.bin"), out, { flag: "wx" });
    await writeFile(join(directory, "stderr.bin"), err, { flag: "wx" });
    await save(join(directory, "transport.json"), {
        ...transportOnly(facts),
        elapsedMs: facts.elapsedMs,
        stdoutSha256: facts.stdoutSha256,
        stderrSha256: facts.stderrSha256,
        spawnError,
        cancelled,
        spawned,
    });
    if (cancelled) {
        return { state: "unfinished", directory };
    }
    let bytes = null,
        report = null;
    try {
        await noAlias(paths.result);
        need((await lstat(paths.result)).size <= 65536, "result-size");
        bytes = await readFile(paths.result);
    } catch {}
    if (control) {
        try {
            await noAlias(paths.result + ".control.json");
            need((await lstat(paths.result + ".control.json")).size <= 65536, "control-size");
            const text = decode(await readFile(paths.result + ".control.json"));
            const doc = parseDocument(text, { uniqueKeys: true, schema: "json", strict: true });
            need(doc.errors.length === 0 && doc.warnings.length === 0, "control-json");
            report = JSON.parse(text);
        } catch {}
    }
    const record = compose(
        context,
        binding,
        bytes,
        facts,
        control && /^[BNI]\d\d$/.test(control) ? "harness" : "driver",
        spawnError ? "spawn" : null,
    );
    await save(join(directory, "record.json"), record);
    return { state: "complete", directory, record, facts, report };
}
async function preflight(base, harness, identity, build, limits, directory, input) {
    const frozen = JSON.parse(
        await readFile(join(root, "test/fixtures/script-observation/frozen.json"), "utf8"),
    );
    need(
        frozen.h7.length === 18 &&
            sha256(JSON.stringify({ h7: frozen.h7, input: frozen.preflightInput })) ===
                preflightControlsSha256,
        "preflight-controls-drift",
    );
    const rows = [];
    for (const row of [
        ...frozen.h7,
        {
            ...frozen.preflightInput,
            source: frozen.preflightInput.sources[input === "alpha" ? 0 : 1],
        },
    ]) {
        // The control is a harness occurrence; a dummy unentered test follows a
        // deliberate negative, so its phase/stage never borrows the corpus test.
        const list = [
            ...harness,
            unit(
                Buffer.from(row.source),
                "harness/control-" + row.id + ".js",
                "harness",
                harness.length,
            ),
            unit(
                Buffer.from(""),
                "test/preflight-" + row.id + ".js",
                "test",
                harness.length + 1,
                "strict",
            ),
        ];
        const binding = bind(
            list.map((x) => x.unit),
            list.map((x) => x.text),
            limits,
            "strict",
            "execute",
            null,
            row.id === "B09",
        );
        const context = contextFor(binding, identity, build, base.policySha256),
            dir = join(directory, "preflight-" + row.id);
        await mkdir(dir);
        const saved = {
            context,
            binding,
            build,
            directory: dir,
            paths: await artifacts(dir, binding),
            control: row.id,
            input,
        };
        await save(join(dir, "binding.json"), binding);
        await save(join(dir, "context.json"), context);
        const result = await processAttempt(saved);
        let valid = false;
        if (result.state === "complete") {
            const expected = {
                version: 1,
                nonce: binding.nonce,
                control: row.id,
                input,
                passed: true,
                observed: row.id === "I01" ? [input === "alpha" ? 7 : 11] : [],
                effects: "",
            };
            const o = result.record.observation;
            valid =
                equal(result.report, expected) &&
                (row.expected === "normal"
                    ? o.kind === "normal"
                    : o.kind === "throw" &&
                      (["number7", "runtime-number"].includes(row.expected)
                          ? o.original.valueKind === "number" && o.constructor.outcome === "absent"
                          : o.constructor.outcome === "available" &&
                            o.constructor.name === "Test262Error"));
        }
        if (
            !valid &&
            result.state === "complete" &&
            result.record.observation.kind === "normal" &&
            result.record.evidence.stage === "test"
        ) {
            result.record = compose(
                context,
                binding,
                null,
                result.facts,
                "harness",
                "preflight-control",
            );
            await save(join(dir, "preflight-failure.json"), result.record);
        }
        rows.push({ id: row.id, binding, context, result, valid });
        if (!valid) {
            await save(join(directory, "preflight.json"), {
                key: base,
                rows,
                passed: false,
                preflightId: null,
            });
            return { passed: false, rows, failure: result };
        }
    }
    const preflightId = sha256(
        JSON.stringify({
            key: base,
            rows: rows.map((r) => ({
                id: r.id,
                request: r.binding.requestSha256,
                record: r.result.record,
                transport: transportOnly(r.result.facts),
            })),
        }),
    );
    await save(join(directory, "preflight.json"), { key: base, rows, passed: true, preflightId });
    return { passed: true, preflightId };
}

export async function prepareScriptObservation(options) {
    // Snapshot every caller value before the first asynchronous operation.
    const o = structuredClone(options);
    need(o.mode === "script-observation", "mode");
    need(["execute", "parse-only"].includes(o.action), "action");
    need(["node", "native"].includes(o.lane), "lane");
    const limits = limitsOf(o.limits ?? {});
    await noAlias(o.archiveRoot);
    const { manifest, manifestSha256 } = await frozenManifest();
    let selection,
        v,
        harness = [],
        verified,
        driverControl = null,
        input = o.input ?? "alpha";
    need(["alpha", "beta"].includes(input), "control-input");
    if (o.control !== undefined) {
        const registryBytes = await readFile(
            join(root, "test/fixtures/script-observation/controls.json"),
        );
        need(sha256(registryBytes) === controlRegistrySha256, "controls-drift");
        const registry = JSON.parse(decode(registryBytes));
        const row = registry.rows.find((r) => r.id === o.control);
        need(row, "registered-control");
        need(o.variant === row.variant && o.action === row.action, "control-policy");
        driverControl = row.driver;
        const paths =
            row.variant === "raw"
                ? []
                : [
                      "harness/assert.js",
                      "harness/sta.js",
                      ...(row.repeated ? ["harness/sta.js"] : []),
                  ];
        for (const path of paths) {
            const bytes = await readFile(join(root, "test/fixtures/harness-bundle", path.slice(8)));
            harness.push(
                unit(
                    bytes,
                    path,
                    "harness",
                    harness.length,
                    "raw",
                    manifest.upstream.harnessBlobs[path],
                ),
            );
        }
        if (row.harnessSource) {
            harness.push(
                unit(
                    Buffer.from(row.harnessSource[input === "alpha" ? 0 : 1]),
                    "harness/control-source.js",
                    "harness",
                    harness.length,
                ),
            );
        }
        if (row.faultHarness) {
            harness.push(
                unit(
                    Buffer.from('if(typeof target!=="undefined")throw target;'),
                    "harness/control-fault.js",
                    "harness",
                    harness.length,
                ),
            );
        }
        const source = Buffer.from(row.sources[input === "alpha" ? 0 : 1]);
        verified = unit(
            source,
            "test/controls/" + row.id + ".js",
            "test",
            harness.length,
            row.variant,
        );
        v = {
            variant: row.variant,
            metadata: { negative: null },
            blockers: [{ status: "unsupported-profile", reasonCode: "registered-host-control" }],
        };
        selection = { kind: "registered-host-control", id: row.id, input, revision: REVISION };
    } else {
        selection = await planCorpus({
            root: o.corpusRoot,
            revision: o.revision,
            lane: o.lane,
            paths: [o.path],
        });
        const file = selection.files[0];
        v = file.variants?.find((v) => v.variant === o.variant);
        need(!file.inputError && v && v.goal === "Script", "selection");
        const original = await localBytes(o.corpusRoot, o.path);
        verified = unit(original, o.path, "test", v.harness.length, v.variant, v.blob);
        need(
            verified.unit.sourceSha256 === v.sourceSha256 &&
                verified.unit.transformedSha256 === v.transformedSourceSha256,
            "source-identity",
        );
        for (let n = 0; n < v.harness.length; n++) {
            const h = v.harness[n];
            const u = unit(
                await localBytes(o.corpusRoot, h.path, "harness/"),
                h.path,
                "harness",
                n,
                "raw",
                manifest.upstream.harnessBlobs[h.path],
            );
            need(u.unit.sourceSha256 === h.sha256, "harness-identity");
            harness.push(u);
        }
    }
    need(
        v.metadata.negative?.phase !== "parse" || o.action === "parse-only",
        "parse-negative-action",
    );
    const licensePath = join(root, "test/fixtures/harness-bundle/LICENSE");
    await noAlias(licensePath);
    const license = verifyBytes(
        await readFile(licensePath),
        "a56b038f0e01b05b004d92097d4601ba629afdf3",
    );
    need(
        license.sha256 === "4dd9244dfe8197c75348c4b24ab53d29d3b1cfad143ac76b5a3d8942aa354ce0",
        "license",
    );
    const build = await closure(o.lane),
        identity = {
            manifestSha256,
            lane: o.lane,
            commit: execFileSync("git", ["rev-parse", "HEAD"], {
                cwd: root,
                encoding: "utf8",
            }).trim(),
        };
    const policy = {
        version: 2,
        mode: o.mode,
        variant: o.variant,
        limits,
        profile: "rift-script-observation-v2",
        control: o.control ?? null,
        input: o.control === undefined ? null : input,
        sources: build.source.sha256,
        adapter: build.adapter.sha256,
        controlSha256: sha256(
            await readFile(join(root, "test/fixtures/script-observation/frozen.json")),
        ),
    };
    const policySha256 = sha256(JSON.stringify(policy));
    const directory = join(resolve(o.archiveRoot), randomUUID());
    await mkdir(directory, { mode: 0o700 });
    await writeFile(join(directory, "LICENSE"), await readFile(licensePath), { flag: "wx" });
    const key = {
        policySha256,
        source: build.source.sha256,
        build: build.built.sha256,
        adapter: build.adapter.sha256,
        profile: policy.profile,
        rule: null,
        capability: null,
        limits,
        lane: o.lane,
        revision: REVISION,
        harness: harness.map((h) => h.unit),
        control: policy.controlSha256,
    };
    await save(join(directory, "intent.json"), { state: "unfinished", selection, policy, key });
    const checked =
        o.variant === "raw"
            ? { passed: true, preflightId: null }
            : await preflight(
                  { policySha256, ...key },
                  harness,
                  identity,
                  build,
                  limits,
                  directory,
                  input,
              );
    // Full source/build/adapter closure is rechecked after controls and again at
    // launch; successful preflight cannot authorize a changed reload or engine.
    need(equal(await closure(o.lane), build), "preflight-build-drift");
    const list = [...harness, verified],
        binding = bind(
            list.map((x) => x.unit),
            list.map((x) => x.text),
            limits,
            v.variant,
            o.action,
            checked.passed ? checked.preflightId : null,
            driverControl === "registered-other" || driverControl?.startsWith("guest-other"),
        );
    const context = contextFor(binding, identity, build, policySha256, v.metadata, v.blockers);
    const plan = {
        state: checked.passed ? "ready" : "preflight-failed",
        directory,
        context,
        binding,
        build,
        paths: await artifacts(directory, binding),
        failure: checked.passed ? null : checked.failure,
        control: driverControl,
        input,
    };
    await save(join(directory, "plan.json"), plan);
    plans.set(plan, structuredClone(plan));
    return freeze(plan);
}
export async function validateScriptLaunch(plan) {
    const saved = plans.get(plan);
    need(saved && equal(plan, saved), "context");
    await noAlias(saved.directory);
    await absent(saved.paths.result);
    need(
        equal(await closure(saved.context.identity.lane), saved.build),
        "build-source-adapter-drift",
    );
    for (let n = 0; n < saved.paths.sources.length; n++) {
        await noAlias(saved.paths.sources[n]);
        need(
            sha256(await readFile(saved.paths.sources[n])) ===
                saved.binding.units[n].transformedSha256,
            "source-drift",
        );
    }
    need(equal(plan, saved), "context");
}
export async function launchScriptObservation(plan, { signal } = {}) {
    await validateScriptLaunch(plan);
    const saved = plans.get(plan);
    need(saved && equal(saved, plan), "context");
    plans.delete(plan);
    if (signal?.aborted) {
        return { state: "unfinished", directory: saved.directory };
    }
    if (saved.state === "preflight-failed") {
        return { state: "preflight-failed", directory: saved.directory, failure: saved.failure };
    }
    const result = await processAttempt(saved, { signal });
    await save(join(saved.directory, "completion.json"), result);
    return result;
}
