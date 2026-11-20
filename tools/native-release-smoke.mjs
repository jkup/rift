import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cliCases } from "./cli-cases.mjs";

export function smokeVerdict(result, expected) {
    if (result.error || result.signal || result.status !== (expected.status ?? 0)) {
        return "STATUS-FAIL";
    }
    const stdout = (result.stdout ?? "").replaceAll("\r\n", "\n");
    const stderr = (result.stderr ?? "").replaceAll("\r\n", "\n");
    return stdout === (expected.stdout ?? "") && stderr === (expected.stderr ?? "")
        ? "PASS"
        : "OUTPUT-FAIL";
}

export function smokeNativeRelease(executable, cwd) {
    mkdirSync(join(cwd, "build/guest-fixtures"), { recursive: true });
    writeFileSync(
        join(cwd, "build/guest-fixtures/cli-time-zone.js"),
        "console.log(new Date(2024,2,10,2,30).toISOString());",
    );
    const cases = [
        ...cliCases,
        {
            name: "packaged-counter",
            args: ["examples/counter.js"],
            expected: { stdout: "total 36\nnext 14\nsame object true\n" },
        },
        { name: "inline", args: ["-e", "console.log(6 * 7);"], expected: { stdout: "42\n" } },
        {
            name: "promise-checkpoint",
            args: ["-e", "Promise.resolve(42).then(x => console.log(x)); console.log('sync');"],
            expected: { stdout: "sync\n42\n" },
        },
        {
            name: "weak-map",
            args: [
                "-e",
                "let key = {}; let map = new WeakMap(); map.set(key, 42); console.log(map.get(key));",
            ],
            expected: { stdout: "42\n" },
        },
        {
            name: "uncaught-throw",
            args: ["-e", "throw 'stop';"],
            expected: { status: 1, stderr: "<eval>:1:1: runtime Uncaught: stop\n" },
        },
    ];
    return cases.map(({ name, args, expected }) => {
        // The extracted binary must run without Node, ScriptC or Zig on PATH.
        const result = spawnSync(executable, args, {
            cwd,
            env: { ...process.env, PATH: "" },
            encoding: "utf8",
            timeout: 30000,
            maxBuffer: 1024 * 1024,
        });
        const verdict = smokeVerdict(result, expected);
        return {
            name,
            args,
            expected,
            verdict,
            status: result.status,
            signal: result.signal,
            error: result.error?.message ?? null,
            stdout: result.stdout,
            stderr: result.stderr,
        };
    });
}
