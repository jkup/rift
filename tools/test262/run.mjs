import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { availableParallelism } from "node:os";
import { parseArgs } from "node:util";
import { mapConcurrent } from "../native-build-runner.mjs";
import { discoverTests, inputStore, readPolicy } from "./runner-input.mjs";
import { defaultLimits, executeTest, checkHarness } from "./runner-execute.mjs";
import { buildDriver } from "./runner-build.mjs";
import { sha256 } from "./input.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const help = `Usage: npm run test262 -- [options]
Build the native driver, then execute a Test262 checkout.
  --corpus PATH        Checkout (default: ../test262, or RIFT_TEST262_ROOT)
  --filter TEXT        Select test paths containing TEXT
  --jobs N             Concurrent processes (default: CPUs, capped at 8)
  --timeout N          Per-test wall deadline in milliseconds (default: 10000)
  --output PATH        Parent for a unique run directory (default: build/test262-runs)
  --no-feature-skips   Attempt features listed in runner-policy.json
  --help              Show this message
Reports retain skipped variants in the denominator. Exit 0: all attempted tests
pass; 1: failures/unsupported/limits; 2: infrastructure, input, or interruption.
Use a full checkout for full-suite results; prepare-corpus.mjs supplies only 33 tests.`;

export function options(args) {
    const { values } = parseArgs({
        args,
        options: {
            corpus: { type: "string" },
            filter: { type: "string", default: "" },
            jobs: { type: "string", default: String(Math.min(8, availableParallelism())) },
            timeout: { type: "string", default: "10000" },
            output: { type: "string" },
            "no-feature-skips": { type: "boolean", default: false },
            help: { type: "boolean" },
        },
    });
    const jobs = Number(values.jobs);
    const timeout = Number(values.timeout);
    if (
        !Number.isSafeInteger(jobs) ||
        jobs < 1 ||
        !Number.isSafeInteger(timeout) ||
        timeout < 1 ||
        timeout > 2147483647
    ) {
        throw new Error("jobs and timeout must be positive integers; timeout <= 2147483647");
    }
    return {
        ...values,
        jobs,
        timeout,
        corpus: resolve(values.corpus ?? process.env.RIFT_TEST262_ROOT ?? join(root, "../test262")),
        output: resolve(values.output ?? join(root, "build/test262-runs")),
    };
}

export function summarize(rows) {
    const counts = {};
    for (const row of rows) {
        counts[row.status] = (counts[row.status] ?? 0) + 1;
    }
    const infrastructure = ["input-error", "harness-error", "crash", "cancelled"].some(
        (status) => counts[status],
    );
    const incomplete = rows.some((row) => !["pass", "skip"].includes(row.status));
    const unknownVariantFiles = rows.filter((row) => row.variant === null).length;
    return {
        selected: rows.length,
        knownVariants: rows.length - unknownVariantFiles,
        unknownVariantFiles,
        counts,
        exitCode: infrastructure ? 2 : Number(incomplete),
    };
}

async function runSelection(rows, execution, jobs) {
    let finished = 0;
    const started = performance.now();
    const progress = setInterval(() => {
        console.log(
            `${finished}/${rows.length} records complete (${((performance.now() - started) / 1000).toFixed(1)}s)`,
        );
    }, 5000);
    try {
        return await mapConcurrent(rows, jobs, async (row) => {
            const { inputs: _inputs, ...identity } = row;
            const result = row.status
                ? identity
                : { ...identity, ...(await executeTest(row, execution)) };
            finished++;
            return result;
        });
    } finally {
        clearInterval(progress);
    }
}

export async function main(args = process.argv.slice(2)) {
    const config = options(args);
    if (config.help) {
        console.log(help);
        return 0;
    }
    const started = performance.now();
    const discovered = await discoverTests(config.corpus);
    const paths = discovered.filter((path) => path.includes(config.filter));
    if (paths.length === 0) {
        throw new Error("No tests selected; check --corpus and --filter");
    }
    await mkdir(config.output, { recursive: true });
    const directory = await mkdtemp(join(config.output, "run-"));
    const sources = join(directory, "sources");
    await mkdir(sources);
    console.log(`Report directory: ${directory}`);
    const policy = await readPolicy();
    if (config["no-feature-skips"]) {
        policy.features = {};
    }
    const store = inputStore(config.corpus, sources);
    const rows = (
        await mapConcurrent(paths, config.jobs, (path) => store.prepare(path, policy))
    ).flat();
    const plan = rows.map(({ inputs, ...row }) => ({
        ...row,
        inputs: inputs?.map((input) => ({
            path: input.unit.path,
            sha256: input.unit.transformedSha256,
        })),
    }));
    await writeFile(join(directory, "selection.json"), JSON.stringify(plan));
    console.log(
        `Selected ${paths.length}/${discovered.length} files, ${rows.length} records. Building one native driver…`,
    );
    const build = await buildDriver(root, directory);
    const controller = new AbortController();
    const interrupt = () => controller.abort();
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", interrupt);
    try {
        const limits = { ...defaultLimits, wallMs: config.timeout };
        const execution = { command: build.command, directory, limits, signal: controller.signal };
        const controls = await checkHarness(store, execution);
        await writeFile(join(directory, "controls.json"), JSON.stringify(controls, null, 2));
        if (controls.some((control) => control.status !== "pass")) {
            throw new Error(`Harness controls failed; see ${join(directory, "controls.json")}`);
        }
        const executionStart = performance.now();
        const results = await runSelection(rows, execution, config.jobs);
        const executionMs = performance.now() - executionStart;
        const summary = summarize(results);
        const report = {
            version: 1,
            config,
            policy,
            build,
            discoveredFiles: discovered.length,
            selectedFiles: paths.length,
            selectionSha256: sha256(JSON.stringify(plan)),
            limits,
            ...summary,
            timing: { totalMs: performance.now() - started, buildMs: build.elapsedMs, executionMs },
            results,
        };
        await writeFile(join(directory, "report.json"), JSON.stringify(report, null, 2));
        console.log(
            `${JSON.stringify(summary.counts)}; ${executionMs.toFixed(0)}ms execution, ${config.jobs} workers`,
        );
        console.log(`Report: ${join(directory, "report.json")}`);
        return summary.exitCode;
    } finally {
        process.removeListener("SIGINT", interrupt);
        process.removeListener("SIGTERM", interrupt);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    try {
        process.exitCode = await main();
    } catch (error) {
        console.error(error.message);
        process.exitCode = 2;
    }
}
