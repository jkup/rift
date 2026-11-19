import { join, dirname, delimiter } from "node:path";
import { existsSync } from "node:fs";
import { writeFile, readFile } from "node:fs/promises";
import { scriptcPath } from "../scriptc-path.mjs";
import { runNativeCommand } from "../native-build-runner.mjs";
import { completed, probeVerdict } from "../probe-verdict.mjs";
import { sha256 } from "./input.mjs";

async function linkerEnvironment(root) {
    const local = join(root, "build/windows-toolchains/zig/zig-x86_64-windows-0.16.0/zig.exe");
    const env = { ...process.env };
    let zig = "zig";
    if (process.platform === "win32" && process.arch === "x64" && existsSync(local)) {
        zig = local;
        const pathKey = Object.keys(env).find((key) => key.toUpperCase() === "PATH") ?? "PATH";
        env[pathKey] = dirname(local) + delimiter + (env[pathKey] ?? "");
    }
    const version = await runNativeCommand(zig, ["version"], { env, windowsHide: true });
    if (!completed(version) || version.stdout.trim() !== "0.16.0") {
        throw new Error(
            "The pinned compiler needs Zig 0.16.0. Put it on PATH; see toolchain/scriptc/README.md.",
        );
    }
    return { env, zig };
}

export async function buildDriver(root, directory) {
    const compiler = scriptcPath(root);
    const { env, zig } = await linkerEnvironment(root);
    const command = join(
        directory,
        process.platform === "win32" ? "rift-test262.exe" : "rift-test262",
    );
    const entry = "src/script-observation-driver.ts";
    const started = performance.now();
    const build = await runNativeCommand(
        compiler,
        ["build", entry, "--tier", "static-only", "--no-keep-llvm", "-o", command],
        { cwd: root, env, windowsHide: true },
    );
    const coverage = await runNativeCommand(compiler, ["coverage", entry], {
        cwd: root,
        env,
        windowsHide: true,
    });
    const success = { status: 0, signal: null, error: null, stdout: "" };
    const verdict = probeVerdict({ build, coverage, node: success, native: success });
    const report = {
        compiler,
        zig,
        entry,
        build,
        coverage,
        verdict,
        elapsedMs: performance.now() - started,
    };
    await writeFile(join(directory, "build.json"), JSON.stringify(report, null, 2));
    if (verdict !== "PASS") {
        throw new Error(`Native ${verdict}; see ${join(directory, "build.json")}`);
    }
    return { command, sha256: sha256(await readFile(command)), elapsedMs: report.elapsedMs };
}
