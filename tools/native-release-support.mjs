import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function sha256(bytes) {
    return createHash("sha256").update(bytes).digest("hex");
}

export function checkedCommand(command, args, options = {}) {
    const result = spawnSync(command, args, {
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
    if (arch !== "x64" || !["linux", "win32"].includes(platform)) {
        throw new Error(`Native releases support linux-x64 and win32-x64, not ${platform}-${arch}`);
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
