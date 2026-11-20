import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import {
    checkedCommand,
    nativeBuildEnvironment,
    releaseName,
    releaseTarget,
    sha256,
    verifyDownload,
} from "./native-release-support.mjs";
import { smokeVerdict } from "./native-release-smoke.mjs";

test("native setup keeps Windows PATH and discards ambient compiler overrides", () => {
    assert.deepEqual(
        nativeBuildEnvironment({
            Path: "tools",
            SCRIPTC_CC: "other",
            CC: "other",
            AR: "other",
            ZIG_LIB_DIR: "other",
            RIFT_SCRIPTC: "selected",
            HOME: "home",
        }),
        { PATH: "tools", RIFT_SCRIPTC: "selected", HOME: "home" },
    );
});

test("release names cannot escape output directories or become shell options", () => {
    for (const version of [
        "../escape",
        "a/b",
        "a\\b",
        "-flag",
        "",
        "x y",
        "$(id)",
        "a".repeat(81),
    ]) {
        assert.throws(() => releaseName(version, "linux-x64"));
    }
    assert.equal(releaseName("v0.1.0-preview.1", "linux-x64"), "rift-v0.1.0-preview.1-linux-x64");
    assert.throws(() => releaseTarget("darwin", "x64"));
    assert.throws(() => releaseTarget("linux", "arm64"));
    assert.equal(releaseTarget("win32", "x64"), "win32-x64");
});

test("download verification rejects changed archives and independent integrity mismatches", () => {
    const bytes = Buffer.from("pinned asset");
    const integrity = "sha512-" + createHash("sha512").update(bytes).digest("base64");
    verifyDownload(bytes, sha256(bytes), integrity);
    assert.throws(
        () => verifyDownload(Buffer.from("changed"), sha256(bytes), integrity),
        /SHA-256/,
    );
    assert.throws(() => verifyDownload(bytes, sha256(bytes), "sha512-invalid"), /integrity/);
});

test("release commands fail on exits, launch errors and timeouts", () => {
    assert.equal(checkedCommand(process.execPath, ["-e", "console.log('ok')"]), "ok");
    assert.throws(() => checkedCommand(process.execPath, ["-e", "process.exit(3)"]), /failed/);
    assert.throws(() => checkedCommand("rift-nonexistent-release-command", []), /failed/);
    assert.throws(
        () =>
            checkedCommand(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
                timeout: 50,
            }),
        /failed/,
    );
});

test("smoke verdict checks status, signals, errors and both output streams", () => {
    const success = { status: 0, signal: null, error: null, stdout: "42\r\n", stderr: "" };
    const expected = { stdout: "42\n" };
    assert.equal(smokeVerdict(success, expected), "PASS");
    for (const patch of [{ status: 1 }, { signal: "SIGTERM" }, { error: new Error("timeout") }]) {
        assert.equal(smokeVerdict({ ...success, ...patch }, expected), "STATUS-FAIL");
    }
    assert.equal(smokeVerdict({ ...success, stdout: "wrong" }, expected), "OUTPUT-FAIL");
    assert.equal(smokeVerdict({ ...success, stderr: "unexpected" }, expected), "OUTPUT-FAIL");
    assert.equal(
        smokeVerdict(
            { ...success, status: 2, stdout: "", stderr: "parse\n" },
            { status: 2, stderr: "parse\n" },
        ),
        "PASS",
    );
});

test("release entry points show help without downloading or compiling", () => {
    for (const script of ["tools/setup-native-toolchain.mjs", "tools/package-native.mjs"]) {
        const result = spawnSync(process.execPath, [script, "--help"], { encoding: "utf8" });
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /Usage:/);
    }
});
