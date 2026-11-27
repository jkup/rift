import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, delimiter } from "node:path";
import test from "node:test";
import { linkerEnvironment } from "./runner-build.mjs";
import { scriptcPath } from "../scriptc-path.mjs";

const version = "0.42.0";
const executable = process.platform === "win32" ? "scriptc.exe" : "scriptc";
const zigExecutable = process.platform === "win32" ? "zig.exe" : "zig";

async function fixture(t) {
    const root = await mkdtemp(join(tmpdir(), "rift linker "));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(join(root, "toolchain/scriptc"), { recursive: true });
    await writeFile(
        join(root, "toolchain/scriptc/source.json"),
        JSON.stringify({ buildDependencies: { zig: version } }),
    );
    const install = join(root, "build/toolchain", `${process.platform}-${process.arch}`);
    await mkdir(join(install, "bin"), { recursive: true });
    const compiler = join(install, "bin", executable);
    await writeFile(compiler, "unused compiler");
    return { root, install, compiler };
}

test("default toolchain selects manifest Zig for both verification and compiler PATH", async (t) => {
    const { root, install } = await fixture(t);
    await writeFile(
        join(install, "rift-toolchain.json"),
        JSON.stringify({ zigDirectory: "zig bundle" }),
    );
    const directory = join(install, "zig bundle");
    const pathKey = process.platform === "win32" ? "Path" : "PATH";
    const source = { [pathKey]: "original tools", SCRIPTC_TARGET: "preserved" };
    const calls = [];
    const result = await linkerEnvironment(
        root,
        scriptcPath(root, {}),
        source,
        (command, args, options) => {
            calls.push({ command, args, env: options.env });
            return version;
        },
    );
    assert.equal(result.zig, join(directory, zigExecutable));
    assert.equal(result.env.PATH, directory + delimiter + "original tools");
    assert.equal(result.env.SCRIPTC_TARGET, "preserved");
    assert.deepEqual(source, { [pathKey]: "original tools", SCRIPTC_TARGET: "preserved" });
    assert.deepEqual(calls, [{ command: result.zig, args: ["version"], env: result.env }]);
    if (process.platform === "win32") {
        assert.equal(Object.hasOwn(result.env, "Path"), false);
    }
});

test("custom compiler uses its own manifest instead of the default installation", async (t) => {
    const { root, install } = await fixture(t);
    await writeFile(join(install, "rift-toolchain.json"), "invalid default manifest");
    const compiler = join(root, "custom compiler/bin", executable);
    const directory = join(root, "custom Zig");
    await mkdir(dirname(compiler), { recursive: true });
    await writeFile(compiler, "unused compiler");
    await writeFile(
        join(root, "custom compiler/rift-toolchain.json"),
        JSON.stringify({ zigDirectory: directory }),
    );
    const selected = scriptcPath(root, { RIFT_SCRIPTC: compiler });
    const result = await linkerEnvironment(root, selected, {}, () => version);
    assert.equal(result.zig, join(directory, zigExecutable));
    assert.equal(result.env.PATH, directory);
});

test("manual installations use PATH and the repository pin", async (t) => {
    const { root, compiler } = await fixture(t);
    const source = { PATH: "manual tools" };
    const result = await linkerEnvironment(root, compiler, source, (command) => {
        assert.equal(command, "zig");
        return version;
    });
    assert.equal(result.zig, "zig");
    assert.deepEqual(result.env, source);
    assert.notEqual(result.env, source);
    await assert.rejects(
        linkerEnvironment(root, compiler, source, () => "0.16.0"),
        /require Zig 0\.42\.0 on PATH; found 0\.16\.0/,
    );
});

test("malformed toolchain manifests fail before running a command", async (t) => {
    const { root, compiler, install } = await fixture(t);
    for (const contents of ["{", "null", "{}", '{"zigDirectory":"  "}', '{"zigDirectory":42}']) {
        await writeFile(join(install, "rift-toolchain.json"), contents);
        await assert.rejects(
            linkerEnvironment(root, compiler, {}, () => assert.fail("unexpected command")),
            /toolchain manifest/,
        );
    }
});

test("an unavailable manifest-selected Zig does not fall back to another installation", async (t) => {
    const { root, compiler, install } = await fixture(t);
    await writeFile(
        join(install, "rift-toolchain.json"),
        JSON.stringify({ zigDirectory: "missing Zig" }),
    );
    const calls = [];
    const cause = new Error("ENOENT");
    await assert.rejects(
        linkerEnvironment(root, compiler, { PATH: "other Zig" }, (command) => {
            calls.push(command);
            throw cause;
        }),
        (error) => {
            assert.equal(error.cause, cause);
            assert.match(error.message, /Cannot run Zig 0\.42\.0/);
            return true;
        },
    );
    assert.deepEqual(calls, [join(install, "missing Zig", zigExecutable)]);
});
