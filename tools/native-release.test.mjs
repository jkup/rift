import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
    cpSync,
    existsSync,
    mkdtempSync,
    mkdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
    checkedCommand,
    nativeBuildEnvironment,
    nativeTar,
    releaseName,
    releaseTarget,
    requireNativeLinker,
    requireZigVersion,
    sha256,
    verifyDownload,
    verifyGlibcBaseline,
} from "./native-release-support.mjs";
import { smokeVerdict } from "./native-release-smoke.mjs";

test("release archiver preserves bytes through absolute paths containing spaces", () => {
    const work = mkdtempSync(join(tmpdir(), "rift archive "));
    try {
        const source = join(work, "source");
        const extracted = join(work, "extracted");
        mkdirSync(source);
        mkdirSync(extracted);
        const bytes = Buffer.from([0, 10, 13, 255, 42]);
        writeFileSync(join(source, "fixture"), bytes);
        const windows = process.platform === "win32";
        const archive = join(work, windows ? "package.zip" : "package.tar.gz");
        const options = windows ? ["-a", "-cf"] : ["-czf"];
        checkedCommand(nativeTar, [...options, archive, "-C", source, "fixture"]);
        checkedCommand(nativeTar, ["-xf", archive, "-C", extracted]);
        assert.deepEqual(readFileSync(join(extracted, "fixture")), bytes);
    } finally {
        rmSync(work, { recursive: true, force: true });
    }
});

test("Linux archives reject a host-dependent or unknown glibc requirement", () => {
    assert.deepEqual(verifyGlibcBaseline("Name: GLIBC_2.2.5 Name: GLIBC_2.34 GLIBC_2.34"), [
        "GLIBC_2.2.5",
        "GLIBC_2.34",
    ]);
    for (const report of [
        "",
        "Name: GLIBC_2.38",
        "Name: GLIBC_3.0",
        "Name: GLIBC_ABI_DT_RELR",
        "Name: GLIBC_PRIVATE",
    ]) {
        assert.throws(() => verifyGlibcBaseline(report));
    }
});

test("Linux setup explains a missing host linker before expensive builds", () => {
    assert.throws(
        () =>
            requireNativeLinker("linux", () => {
                throw new Error("ENOENT");
            }),
        /apt-get install clang build-essential/,
    );
    const calls = [];
    const run = (command, args) => calls.push([command, args]);
    requireNativeLinker("win32", run);
    assert.deepEqual(calls, []);
    requireNativeLinker("linux", run);
    assert.deepEqual(calls, [["clang", ["--version"]]]);
});

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

test("Zig preflight accepts only the requested pin and explains command failures", () => {
    assert.equal(
        requireZigVersion("0.16.0", () => "0.16.0"),
        "0.16.0",
    );
    for (const version of ["0.17.0", "0.16.0-dev.1", ""]) {
        assert.throws(
            () => requireZigVersion("0.16.0", () => version),
            /require Zig 0\.16\.0 on PATH; found/,
        );
    }
    assert.throws(
        () => requireZigVersion("0.17.0", () => "0.16.0"),
        /require Zig 0\.17\.0 on PATH; found 0\.16\.0/,
    );
    for (const code of ["ENOENT", "ETIMEDOUT"]) {
        const cause = new Error(code);
        assert.throws(
            () =>
                requireZigVersion("0.16.0", () => {
                    throw cause;
                }),
            (error) => {
                assert.equal(error.cause, cause);
                assert.match(error.message, /Cannot run Zig 0\.16\.0 from PATH/);
                assert.match(error.message, /toolchain\/scriptc\/README\.md/);
                return true;
            },
        );
    }
});

test("native entry points reject a missing Zig before emitting or building", () => {
    const work = mkdtempSync(join(tmpdir(), "rift missing zig "));
    try {
        mkdirSync(join(work, "tools"));
        mkdirSync(join(work, "toolchain/scriptc"), { recursive: true });
        mkdirSync(join(work, "test/compiler"), { recursive: true });
        for (const name of [
            "test-compiler.mjs",
            "build-native.mjs",
            "native-release-support.mjs",
            "native-build-runner.mjs",
            "native-entry-manifest.mjs",
            "probe-verdict.mjs",
            "scriptc-path.mjs",
        ]) {
            cpSync(new URL(name, import.meta.url), join(work, "tools", name));
        }
        writeFileSync(
            join(work, "toolchain/scriptc/source.json"),
            JSON.stringify({ buildDependencies: { zig: "0.16.0" } }),
        );
        writeFileSync(join(work, "test/compiler/example.ts"), "");
        const compiler = join(work, "scriptc.exe");
        writeFileSync(compiler, "must not execute");
        const env = { ...nativeBuildEnvironment(), PATH: work, RIFT_SCRIPTC: compiler };
        for (const name of ["test-compiler.mjs", "build-native.mjs"]) {
            const result = spawnSync(process.execPath, [join(work, "tools", name)], {
                cwd: work,
                env,
                encoding: "utf8",
                timeout: 10000,
                killSignal: "SIGKILL",
                windowsHide: true,
            });
            assert.equal(result.error, undefined, name);
            assert.equal(result.status, 1, name);
            assert.match(result.stderr, /Zig 0\.16\.0.*PATH/, name);
            assert.equal(result.stdout, "", name);
            assert.equal(existsSync(join(work, "build")), false, name);
        }
    } finally {
        rmSync(work, { recursive: true, force: true });
    }
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
    assert.equal(releaseTarget("darwin", "x64"), "darwin-x64");
    assert.equal(releaseTarget("darwin", "arm64"), "darwin-arm64");
    assert.throws(() => releaseTarget("darwin", "ia32"));
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
