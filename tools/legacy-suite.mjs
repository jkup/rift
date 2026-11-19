import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { resolve, relative, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mapConcurrent } from "./native-build-runner.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function runFixture(command, args, timeoutMs = 5000) {
    return new Promise((resolveResult) => {
        let deadlineExpired = false;
        const child = execFile(
            command,
            args,
            { encoding: "utf8", windowsHide: true, maxBuffer: 1024 * 1024 },
            (error, stdout, stderr) => {
                clearTimeout(timer);
                resolveResult({
                    status: error === null ? 0 : typeof error.code === "number" ? error.code : null,
                    signal: error?.signal ?? null,
                    error: error ? { code: error.code ?? null, message: error.message } : null,
                    deadlineExpired,
                    stdout,
                    stderr,
                });
            },
        );
        const timer = setTimeout(() => {
            deadlineExpired = true;
            child.kill();
        }, timeoutMs);
    });
}

export function classifyFixture(result) {
    const lines = result.stdout.split(/\r?\n/);
    let failures = lines.filter(
        (line) => line.includes("FAIL:") || line.includes("❌") || /^FAIL - \S/.test(line),
    ).length;
    let checks = lines.filter(
        (line) => line.includes("PASS:") || line.includes("✅") || /^PASS - \S/.test(line),
    ).length;
    for (let i = 0; i < lines.length; i++) {
        const summary = /^.+\btests?: (\d+) passed, (\d+) failed$/i.exec(lines[i]);
        if (summary) {
            const passed = Number(summary[1]),
                failed = Number(summary[2]);
            if (Number.isSafeInteger(passed + failed)) {
                checks = Math.max(checks, passed);
                failures = Math.max(failures, failed);
            }
        }
        const fraction = /^(Passed|Failed): (\d+)\/(\d+)$/.exec(lines[i]);
        if (!fraction) {
            continue;
        }
        const count = Number(fraction[2]),
            total = Number(fraction[3]);
        if (!Number.isSafeInteger(total) || count > total) {
            continue;
        }
        if (fraction[1] === "Failed") {
            failures = Math.max(failures, count);
        } else {
            const failed = /^Failed: (\d+)\/(\d+)$/.exec(lines[i + 1] ?? "");
            if (
                count === total ||
                (failed && Number(failed[2]) === total && count + Number(failed[1]) === total)
            ) {
                checks = Math.max(checks, count);
            }
        }
    }
    let outcome;
    if (result.error?.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
        outcome = "output-limit";
    } else if (result.deadlineExpired) {
        outcome = "timeout";
    } else if (result.signal || result.status === null || result.status === 70) {
        outcome = "host-fault";
    } else if (result.status === 2) {
        outcome = "parse-error";
    } else if (result.status === 1) {
        outcome = "runtime-error";
    } else if (result.status !== 0) {
        outcome = "host-fault";
    } else if (failures) {
        outcome = "reported-failure";
    } else {
        outcome = checks ? "reported-success" : "completed-without-checks";
    }
    return { outcome, checks, failures };
}

export async function selectFixtures(directory) {
    const selected = [],
        excluded = [];
    async function walk(current, skipped = false) {
        for (const entry of await readdir(current, { withFileTypes: true })) {
            const path = join(current, entry.name);
            if (entry.isDirectory()) {
                await walk(path, skipped || entry.name === "skipped");
            } else if (entry.isFile() && entry.name.endsWith(".js")) {
                (skipped || entry.name.startsWith("temp_") ? excluded : selected).push(path);
            }
        }
    }
    await walk(directory);
    return { selected: selected.sort(), excluded: excluded.sort() };
}

async function main(lane) {
    if (!["node", "native"].includes(lane) || process.argv.length !== 3) {
        throw new Error("usage: node tools/legacy-suite.mjs node|native");
    }
    const entry = resolve(
        root,
        lane === "node"
            ? "build/node/src/cli.js"
            : "build/native/rift" + (process.platform === "win32" ? ".exe" : ""),
    );
    const entrySha256 = hash(await readFile(entry));
    const testRoot = resolve(root, "fixtures/legacy");
    const selection = await selectFixtures(testRoot);
    await mkdir(resolve(root, "build"), { recursive: true });
    const output = await mkdtemp(resolve(root, "build/legacy-suite-" + lane + "-"));
    // Copy exact bytes so a concurrent fixture edit cannot change this run's inputs.
    const inputs = await Promise.all(
        selection.selected.map(async (path, index) => {
            const bytes = await readFile(path),
                snapshot = join(output, index + ".js");
            await writeFile(snapshot, bytes);
            return {
                path: relative(testRoot, path).replaceAll("\\", "/"),
                sha256: hash(bytes),
                snapshot,
            };
        }),
    );
    await writeFile(
        join(output, "selection.json"),
        JSON.stringify(
            {
                lane,
                entry,
                entrySha256,
                helperInjection: false,
                inputs,
                excluded: selection.excluded.map((path) =>
                    relative(testRoot, path).replaceAll("\\", "/"),
                ),
            },
            null,
            2,
        ) + "\n",
    );
    const rows = await mapConcurrent(inputs, 2, async (input, index) => {
        const result = await runFixture(
            lane === "node" ? process.execPath : entry,
            lane === "node" ? [entry, input.snapshot] : [input.snapshot],
        );
        const row = {
            path: input.path,
            sha256: input.sha256,
            ...classifyFixture(result),
            process: result,
        };
        await writeFile(join(output, index + ".json"), JSON.stringify(row, null, 2) + "\n");
        return row;
    });
    const counts = {};
    for (const row of rows) {
        counts[row.outcome] = (counts[row.outcome] ?? 0) + 1;
    }
    const report = {
        lane,
        entrySha256,
        selected: inputs.length,
        excluded: selection.excluded.length,
        description:
            "Historical JavaScript fixtures without injected helpers. Reported checks are not conformance results.",
        counts,
        rows,
    };
    await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({ output, selected: inputs.length, counts }));
    process.exitCode = rows.some(
        (row) => !["reported-success", "completed-without-checks"].includes(row.outcome),
    )
        ? 1
        : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    main(process.argv[2]).catch((error) => {
        console.error(error);
        process.exitCode = 2;
    });
}
