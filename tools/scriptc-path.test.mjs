import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { scriptcPath } from "./scriptc-path.mjs";

test("compiler selection uses the built toolchain and honors explicit paths", (t) => {
    const root = mkdtempSync(join(tmpdir(), "rift-scriptc-path-"));
    const platform = `${process.platform}-${process.arch}`;
    const bin = join(root, "build/toolchain", platform, "bin");
    const compiler = join(bin, process.platform === "win32" ? "scriptc.exe" : "scriptc");
    mkdirSync(bin, { recursive: true });
    writeFileSync(compiler, "default");
    const custom = join(root, "custom compiler.exe");
    writeFileSync(custom, "candidate");
    t.after(() => {
        unlinkSync(custom);
        unlinkSync(compiler);
        for (const directory of [
            `build/toolchain/${platform}/bin`,
            `build/toolchain/${platform}`,
            "build/toolchain",
            "build",
            "",
        ]) {
            rmdirSync(join(root, directory));
        }
    });
    assert.equal(scriptcPath(root, {}), compiler);
    assert.equal(scriptcPath(root, { RIFT_SCRIPTC: custom }), custom);
    assert.equal(scriptcPath(root, { RIFT_SCRIPTC: "custom compiler.exe" }), custom);
    for (const setting of ["", "  ", "missing.exe", "."]) {
        assert.throws(
            () => scriptcPath(root, { RIFT_SCRIPTC: setting }),
            /RIFT_SCRIPTC|executable not found/,
        );
    }
});
