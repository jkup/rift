import { execFile, spawnSync } from "node:child_process";

export function runNativeCommandSync(command, args, options = {}) {
    return spawnSync(command, args, {
        encoding: "utf8",
        timeout: 600000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
        // spawnSync waits for exit even after its timeout; SIGTERM can be ignored.
        killSignal: "SIGKILL",
        ...options,
    });
}

export function runNativeCommand(command, args, options = {}) {
    return new Promise((resolve) => {
        execFile(
            command,
            args,
            {
                encoding: "utf8",
                timeout: 600000,
                maxBuffer: 1024 * 1024,
                windowsHide: true,
                // Deadlines and output caps must also stop tools that ignore SIGTERM.
                killSignal: "SIGKILL",
                ...options,
            },
            (error, stdout, stderr) => {
                let status = null;
                if (error === null) {
                    status = 0;
                } else if (typeof error.code === "number") {
                    status = error.code;
                }
                resolve({
                    status,
                    signal: error?.signal ?? null,
                    error:
                        error && typeof error.code !== "number"
                            ? { code: error.code, message: error.message }
                            : null,
                    stdout: stdout ?? "",
                    stderr: stderr ?? "",
                });
            },
        );
    });
}

export async function mapConcurrent(items, jobs, work) {
    if (!Number.isSafeInteger(jobs) || jobs < 1) {
        throw new Error("native build jobs must be a positive safe integer");
    }
    const results = new Array(items.length);
    let next = 0;
    let failed = false;
    let failure;
    async function worker() {
        while (!failed && next < items.length) {
            const index = next++;
            try {
                results[index] = await work(items[index], index);
            } catch (error) {
                if (!failed) {
                    failed = true;
                    failure = error;
                }
            }
        }
    }
    // Drain active work before reporting failure, so callers can safely clean up
    // or retry without workers still writing to the previous run's files.
    await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, worker));
    if (failed) {
        throw failure;
    }
    return results;
}
