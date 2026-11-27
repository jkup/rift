import { join, dirname, delimiter, resolve } from "node:path";
import { writeFile, readFile } from "node:fs/promises";
import { scriptcPath } from "../scriptc-path.mjs";
import { runNativeCommand } from "../native-build-runner.mjs";
import { probeVerdict } from "../probe-verdict.mjs";
import { checkedCommand, requireZigVersion } from "../native-release-support.mjs";
import { sha256 } from "./input.mjs";

async function toolchainZigDirectory(compiler) {
    const path = resolve(dirname(compiler), "../rift-toolchain.json");
    let manifest;
    try {
        manifest = JSON.parse(await readFile(path, "utf8"));
    } catch (cause) {
        if (cause.code === "ENOENT") {
            return null;
        }
        throw new Error(`Cannot read toolchain manifest: ${path}`, { cause });
    }
    if (typeof manifest?.zigDirectory !== "string" || !manifest.zigDirectory.trim()) {
        throw new Error(`Invalid Zig directory in toolchain manifest: ${path}`);
    }
    return resolve(dirname(path), manifest.zigDirectory);
}

export async function linkerEnvironment(
    root,
    compiler,
    source = process.env,
    run = checkedCommand,
) {
    const pin = JSON.parse(await readFile(join(root, "toolchain/scriptc/source.json"), "utf8"));
    const directory = await toolchainZigDirectory(compiler);
    const env = { ...source };
    let zig = "zig";
    if (directory !== null) {
        zig = join(directory, process.platform === "win32" ? "zig.exe" : "zig");
        const pathKeys = Object.keys(env).filter((key) =>
            process.platform === "win32" ? key.toUpperCase() === "PATH" : key === "PATH",
        );
        const previousPath = env[pathKeys[0]] ?? "";
        for (const key of pathKeys) {
            delete env[key];
        }
        env.PATH = previousPath ? directory + delimiter + previousPath : directory;
    }
    requireZigVersion(pin.buildDependencies.zig, (_command, args, options) =>
        run(zig, args, { ...options, env }),
    );
    return { env, zig };
}

export async function buildDriver(root, directory) {
    const compiler = scriptcPath(root);
    const { env, zig } = await linkerEnvironment(root, compiler);
    const command = join(
        directory,
        process.platform === "win32" ? "rift-test262.exe" : "rift-test262",
    );
    const entry = "src/host/script-observation-driver.ts";
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
