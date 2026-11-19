import { execFile } from "node:child_process";

export function runNativeCommand(command, args, options = {}) {
    return new Promise((resolve) => {
        execFile(
            command,
            args,
            { encoding: "utf8", timeout: 600000, maxBuffer: 1024 * 1024, ...options },
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
    async function worker() {
        while (next < items.length) {
            const index = next++;
            results[index] = await work(items[index], index);
        }
    }
    await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, worker));
    return results;
}
