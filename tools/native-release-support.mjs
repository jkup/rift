import { runNativeCommandSync } from "./native-build-runner.mjs";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// Git Bash's GNU tar treats drive letters as remote hosts and cannot create ZIPs.
// Windows ships bsdtar, which handles both native paths and ZIP archives.
export const nativeTar =
    process.platform === "win32" ? join(process.env.SystemRoot, "System32", "tar.exe") : "tar";

export function sha256(bytes) {
    return createHash("sha256").update(bytes).digest("hex");
}

export function checkedCommand(command, args, options = {}) {
    const result = runNativeCommandSync(command, args, {
        encoding: "utf8",
        timeout: 60 * 60 * 1000,
        maxBuffer: 16 * 1024 * 1024,
        ...options,
    });
    if (result.error || result.signal || result.status !== 0) {
        throw new Error(
            `${command} failed (${result.status ?? result.signal}): ${result.error?.message ?? ""}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
        );
    }
    return result.stdout?.trim() ?? "";
}

export function verifyDownload(bytes, expected, integrity) {
    if (sha256(bytes) !== expected) {
        throw new Error("Download SHA-256 mismatch");
    }
    if (
        integrity &&
        "sha512-" + createHash("sha512").update(bytes).digest("base64") !== integrity
    ) {
        throw new Error("Download npm integrity mismatch");
    }
}

export async function downloadVerified(url, destination, expected, integrity) {
    console.log(`Downloading ${url}`);
    const response = await fetch(url, { signal: AbortSignal.timeout(300000) });
    if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${url}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    verifyDownload(bytes, expected, integrity);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, bytes, { flag: "wx" });
}

export function releaseTarget(platform = process.platform, arch = process.arch) {
    const supported =
        platform === "darwin"
            ? ["arm64", "x64"].includes(arch)
            : arch === "x64" && ["linux", "win32"].includes(platform);
    if (!supported) {
        throw new Error(`Unsupported native release target: ${platform}-${arch}`);
    }
    return `${platform}-${arch}`;
}

export function releaseName(version, target) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(version)) {
        throw new Error("Release version must be a short filename-safe identifier");
    }
    return `rift-${version}-${target}`;
}

export function fileHash(path) {
    return sha256(readFileSync(path));
}

export function nativeBuildEnvironment(source = process.env) {
    const env = {};
    for (const [name, value] of Object.entries(source)) {
        const upper = name.toUpperCase();
        if (upper === "PATH") {
            env.PATH = value;
        } else if (
            !upper.startsWith("SCRIPTC_") &&
            !upper.startsWith("ZIG_") &&
            !["CC", "AR"].includes(upper)
        ) {
            env[name] = value;
        }
    }
    return env;
}

export function requireNativeLinker(platform = process.platform, run = checkedCommand) {
    if (platform !== "linux") {
        return;
    }
    try {
        run("clang", ["--version"]);
    } catch (cause) {
        throw new Error(
            "Linux native builds need Clang and C development tools. On Ubuntu: sudo apt-get install clang build-essential",
            { cause },
        );
    }
}

export function requireZigVersion(expected, run = checkedCommand) {
    const hint = "Select the pinned Zig directory; see toolchain/scriptc/README.md.";
    let version;
    try {
        version = run("zig", ["version"], {
            timeout: 10000,
            killSignal: "SIGKILL",
            windowsHide: true,
        });
    } catch (cause) {
        throw new Error(`Cannot run Zig ${expected} from PATH. ${hint}`, { cause });
    }
    if (version !== expected) {
        throw new Error(
            `Native builds require Zig ${expected} on PATH; found ${version || "empty version output"}. ${hint}`,
        );
    }
    return version;
}

export function verifyGlibcBaseline(output) {
    const requirements = [...new Set(output.match(/\bGLIBC_[A-Za-z0-9_.]+/g) ?? [])];
    if (requirements.length === 0) {
        throw new Error("Unknown glibc version report");
    }
    for (const requirement of requirements) {
        const match = /^GLIBC_(\d+)\.(\d+)(?:\.\d+)?$/.exec(requirement);
        if (!match || Number(match[1]) > 2 || (Number(match[1]) === 2 && Number(match[2]) > 34)) {
            throw new Error(`Linux release exceeds glibc 2.34 baseline: ${requirement}`);
        }
    }
    return requirements.sort();
}
