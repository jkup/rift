import { spawn, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, lstat, realpath, readdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { sha256, verifyBytes, transform, safePath, planCorpus, localBytes } from "./input.mjs";
import { validateContext } from "./result.mjs";
import { persist } from "./ledger.mjs";
import { composeObservation } from "./driver-result.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const plans = new WeakMap();
export const DEFAULT_LIMITS = Object.freeze({
    sourceUnits: 100000,
    parseDepth: 128,
    evaluationDepth: 256,
    steps: 100000,
    calls: 64,
    wallMs: 10000,
    outputBytes: 1048576,
});

// Both pipe callbacks use the same byte counter. Keep the first crossing count,
// even when more buffered output arrives after the termination request.
export function countOutput(facts, chunk) {
    facts.outputBytes += chunk.length;
    if (facts.capCount !== null || facts.outputBytes <= facts.outputLimit) {
        return false;
    }
    facts.capCount = facts.outputBytes;
    return true;
}

async function noAlias(path) {
    let current = resolve(path);
    while (true) {
        const s = await lstat(current);
        if (s.isSymbolicLink()) {
            throw new Error("path-alias");
        }
        const parent = dirname(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }
    if ((await realpath(path)).toLowerCase() !== resolve(path).toLowerCase()) {
        throw new Error("path-alias");
    }
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
    throw new Error("preexisting-result");
}
async function buildIdentity(lane) {
    const entry = resolve(
        root,
        lane === "native"
            ? "build/native/observation-driver.exe"
            : "build/node/src/host/observation-driver.js",
    );
    const executable = lane === "node" ? process.execPath : entry;
    const files =
        lane === "native"
            ? [entry]
            : [
                  executable,
                  ...(await readdir(dirname(entry)))
                      .filter((x) => x.endsWith(".js"))
                      .sort()
                      .map((x) => join(dirname(entry), x)),
              ];
    const parts = [];
    for (const file of files) {
        await noAlias(file);
        parts.push([file, sha256(await readFile(file))]);
    }
    return {
        entry,
        executable,
        args: lane === "node" ? [entry] : [],
        hash: sha256(JSON.stringify(parts)),
    };
}
function engineIdentity() {
    const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
    const commit = git(["rev-parse", "HEAD"]);
    return { commit, dirty: git(["status", "--porcelain", "--untracked-files=all", "--", "src"]) };
}
async function sourceDigest() {
    const files = (await readdir(join(root, "src"))).filter((x) => x.endsWith(".ts")).sort();
    return sha256(
        JSON.stringify(
            await Promise.all(
                files.map(async (file) => [file, sha256(await readFile(join(root, "src", file)))]),
            ),
        ),
    );
}

// The selection is retained as evidence; its harness is REQUIRED metadata, never
// a claim that the observation driver loaded or validated those files.
export async function prepareObservation({
    selection,
    variantId,
    sourceBytes,
    mode,
    archiveRoot,
    limits = {},
}) {
    // Take ownership before any asynchronous work. The caller may mutate its
    // selection (including nested metadata) or byte buffer as soon as we yield.
    selection = structuredClone(selection);
    if (!Buffer.isBuffer(sourceBytes)) {
        throw new Error("source-identity");
    }
    sourceBytes = Buffer.from(sourceBytes);
    if (!["parser-observation", "body-observation"].includes(mode)) {
        throw new Error("mode");
    }
    const file = selection.files.find((f) => f.variants?.some((v) => v.id === variantId));
    const v = file?.variants.find((v) => v.id === variantId);
    if (
        !v ||
        file.inputError ||
        v.goal !== "Script" ||
        !["node", "native"].includes(v.lane) ||
        !["strict", "non-strict", "raw"].includes(v.variant)
    ) {
        throw new Error("selection");
    }
    safePath(v.path, "test/");
    const verified = verifyBytes(sourceBytes, v.blob);
    const transformed = transform(sourceBytes, v.variant);
    if (verified.sha256 !== v.sourceSha256 || sha256(transformed) !== v.transformedSourceSha256) {
        throw new Error("source-identity");
    }
    const configured = { ...DEFAULT_LIMITS, ...limits };
    if (
        Object.keys(configured).length !== Object.keys(DEFAULT_LIMITS).length ||
        Object.values(configured).some((x) => !Number.isSafeInteger(x) || x < 0) ||
        ["sourceUnits", "parseDepth", "evaluationDepth"].some(
            (k) => configured[k] !== DEFAULT_LIMITS[k],
        ) ||
        configured.wallMs > 2147483647
    ) {
        throw new Error("limits");
    }
    const build = await buildIdentity(v.lane);
    const engine = engineIdentity();
    const adapterSha256 = sha256(
        Buffer.concat(
            await Promise.all(
                ["observe.mjs", "driver-result.mjs", "input.mjs", "result.mjs", "ledger.mjs"].map(
                    (f) => readFile(new URL(f, import.meta.url)),
                ),
            ),
        ),
    );
    const context = validateContext({
        identity: {
            schemaVersion: 1,
            runId: randomUUID(),
            mode,
            corpusRevision: selection.revision,
            manifestSha256: selection.manifestSha256,
            path: v.path,
            blob: v.blob,
            sourceSha256: verified.sha256,
            variant: v.variant,
            goal: v.goal,
            lane: v.lane,
            engineCommit: engine.commit,
            engineBuildSha256: build.hash,
            adapterSha256,
            policySha256: sha256(
                JSON.stringify({ mode, limits: configured, profile: "rift-subset-observation-v1" }),
            ),
            dirtySourceSha256: engine.dirty ? await sourceDigest() : null,
        },
        inputs: {
            harness: [],
            transformedSourceSha256: sha256(transformed),
            profileId: "rift-subset-observation-v1",
            capabilityLedgerSha256: null,
            host: process.version,
            platform: `${process.platform}/${process.arch}`,
            toolchain: "scriptc-0.4.7/typescript-7.0.2",
            limits: configured,
        },
        expectedNegative: v.metadata.negative,
        blockers: v.blockers,
    });
    await noAlias(archiveRoot);
    const directory = join(resolve(archiveRoot), randomUUID());
    await mkdir(directory, { mode: 0o700 });
    const plan = {
        context,
        binding: { nonce: randomUUID(), mode, unit: v.path },
        directory,
        sourcePath: join(directory, "source.js"),
        resultPath: join(directory, "child.json"),
        build,
        selection: structuredClone({
            revision: selection.revision,
            manifestSha256: selection.manifestSha256,
            variant: v,
        }),
    };
    await writeFile(plan.sourcePath, transformed, { flag: "wx", mode: 0o400 });
    await absent(plan.resultPath);
    plans.set(plan, structuredClone(plan));
    await persist(join(directory, "attempt.json"), {
        kind: "observation-attempt",
        state: "unfinished",
        plan,
    });
    return plan;
}

export async function validateLaunch(plan) {
    const saved = plans.get(plan);
    if (!saved || !isDeepStrictEqual(plan, saved)) {
        throw new Error("context");
    }
    await noAlias(saved.directory);
    await noAlias(saved.sourcePath);
    await absent(saved.resultPath);
    if (
        sha256(await readFile(saved.sourcePath)) !== saved.context.inputs.transformedSourceSha256 ||
        !isDeepStrictEqual(await buildIdentity(saved.context.identity.lane), saved.build)
    ) {
        throw new Error("input-changed");
    }
    if (!isDeepStrictEqual(plan, saved)) {
        throw new Error("context");
    }
}

export async function launchObservation(plan, { signal } = {}) {
    await validateLaunch(plan);
    // A prepared plan can be launched only once, including cancellation/failure.
    const saved = plans.get(plan);
    if (!saved || !isDeepStrictEqual(plan, saved)) {
        throw new Error("context");
    }
    plans.delete(plan);
    const { context, binding, build, directory } = saved;
    if (signal?.aborted) {
        return { state: "unfinished", directory };
    }
    const started = performance.now();
    const stdout = [],
        stderr = [];
    const limits = context.inputs.limits;
    const facts = {
        process: { exitCode: null, signal: null, deadlineExpired: false },
        outputBytes: 0,
        outputLimit: limits.outputBytes,
        capCount: null,
        capKilled: false,
        crashBeforeCap: false,
        elapsedMs: 0,
        stdoutSha256: null,
        stderrSha256: null,
    };
    let cancelled = false,
        spawnError = null;
    await new Promise((resolveClose) => {
        const child = spawn(
            build.executable,
            [
                ...build.args,
                binding.mode,
                saved.sourcePath,
                binding.unit,
                saved.resultPath,
                binding.nonce,
                String(limits.steps),
                String(limits.calls),
            ],
            { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
        );
        const cancel = () => {
            cancelled = true;
            child.kill();
        };
        signal?.addEventListener("abort", cancel, { once: true });
        const timer = setTimeout(() => {
            facts.process.deadlineExpired = true;
            child.kill();
        }, limits.wallMs);
        const capture = (chunks, chunk) => {
            chunks.push(chunk);
            if (countOutput(facts, chunk)) {
                facts.crashBeforeCap =
                    (child.exitCode !== null && child.exitCode !== 0) || child.signalCode !== null;
                if (!facts.crashBeforeCap) {
                    facts.capKilled = child.kill();
                }
            }
        };
        child.stdout.on("data", (chunk) => capture(stdout, chunk));
        child.stderr.on("data", (chunk) => capture(stderr, chunk));
        child.on("error", (error) => {
            spawnError = { code: error.code, message: error.message };
        });
        child.on("exit", (code, sig) => {
            if (facts.capCount === null && (sig !== null || code !== 0)) {
                facts.crashBeforeCap = true;
            }
        });
        child.on("close", (code, sig) => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", cancel);
            facts.process.exitCode = sig === null ? code : null;
            facts.process.signal = sig;
            resolveClose();
        });
    });
    facts.elapsedMs = performance.now() - started;
    const out = Buffer.concat(stdout),
        err = Buffer.concat(stderr);
    facts.stdoutSha256 = sha256(out);
    facts.stderrSha256 = sha256(err);
    await writeFile(join(directory, "stdout.bin"), out, { flag: "wx" });
    await writeFile(join(directory, "stderr.bin"), err, { flag: "wx" });
    await persist(join(directory, "transport.json"), { ...facts, spawnError, cancelled });
    if (cancelled) {
        return { state: "unfinished", directory };
    }
    let bytes = null;
    try {
        await noAlias(saved.resultPath);
        bytes = await readFile(saved.resultPath);
    } catch {
        /* missing/unreadable is protocol */
    }
    const record = composeObservation(context, binding, bytes, facts);
    await persist(join(directory, "attempt.json"), {
        kind: "observation-attempt",
        state: "complete",
        plan: saved,
        record,
    });
    return { state: "complete", directory, record, facts };
}

export async function main(args) {
    if (args.length !== 8) {
        throw new Error(
            "Usage: observe ROOT REVISION PATH VARIANT node|native parser-observation|body-observation ARCHIVE LIMITS.json",
        );
    }
    const [corpusRoot, revision, path, variant, lane, mode, archiveRoot, limitsPath] = args;
    const selection = await planCorpus({ root: corpusRoot, revision, lane, paths: [path] });
    const v = selection.files[0].variants?.find((v) => v.variant === variant);
    if (!v) {
        throw new Error("variant");
    }
    const plan = await prepareObservation({
        selection,
        variantId: v.id,
        sourceBytes: await localBytes(corpusRoot, path),
        mode,
        archiveRoot,
        limits: JSON.parse(await readFile(limitsPath, "utf8")),
    });
    const result = await launchObservation(plan);
    console.log(result.directory);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    main(process.argv.slice(2)).catch((error) => {
        console.error(error.message);
        process.exitCode = 2;
    });
}
