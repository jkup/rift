// Existing gates, unchanged; retain every subprocess result for the handoff.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const commands = [
    ["typecheck", ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]],
    ["runner", ["--test", "tools/probe-verdict.test.mjs"]],
    ["probes", ["tools/run-probes.mjs"]],
    ["guest-node", ["tools/run-guests.mjs", "node"]],
    ["build-native", ["tools/build-native.mjs"]],
    ["guest-native", ["tools/run-guests.mjs", "native"]],
];
const results = [];
for (const [name, args] of commands) {
    const r = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", timeout: 600000 });
    results.push({
        name,
        args,
        status: r.status,
        signal: r.signal,
        error: r.error ? String(r.error) : null,
        stdout: r.stdout ?? "",
        stderr: r.stderr ?? "",
    });
    console.log(name, r.status);
    writeFileSync(
        new URL("../../docs/validation/ts-005p/regressions.json", import.meta.url),
        JSON.stringify({ nodeVersion: process.version, results }, null, 2) + "\n",
    );
}
process.exitCode = results.every((r) => r.status === 0 && r.signal === null && r.error === null)
    ? 0
    : 1;
