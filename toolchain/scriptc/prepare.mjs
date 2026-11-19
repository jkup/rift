import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmdirSync,
    unlinkSync,
    writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [repository, destination, ...extra] = process.argv.slice(2);
if (!repository || !destination || extra.length) {
    throw new Error("Usage: node toolchain/scriptc/prepare.mjs <upstream-checkout> <source.tar>");
}
const directory = dirname(fileURLToPath(import.meta.url));
const pin = JSON.parse(readFileSync(join(directory, "source.json"), "utf8"));
const patch = join(directory, pin.patch);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (sha256(readFileSync(patch)) !== pin.patchSha256) {
    throw new Error("Compiler patch hash mismatch");
}
const archive = resolve(destination),
    manifest = archive + ".json";
if (existsSync(archive) || existsSync(manifest)) {
    throw new Error("Destination already exists");
}
mkdirSync(dirname(archive), { recursive: true });
const temporary = mkdtempSync(join(dirname(archive), ".scriptc-source-"));
const index = join(temporary, "index");
const env = { ...process.env, GIT_INDEX_FILE: index };
function git(args) {
    return execFileSync("git", ["-C", resolve(repository), "-c", "core.autocrlf=false", ...args], {
        env,
        encoding: "utf8",
        maxBuffer: 4 << 20,
    });
}
try {
    git(["read-tree", pin.baseRevision]);
    git(["apply", "--cached", "--check", patch]);
    git(["apply", "--cached", patch]);
    const tree = git(["write-tree"]).trim();
    if (tree !== pin.sourceTree) {
        throw new Error(`Unexpected compiler source tree: ${tree}`);
    }
    git(["archive", "--format=tar", `--output=${archive}`, tree]);
    writeFileSync(
        manifest,
        JSON.stringify({ ...pin, archiveSha256: sha256(readFileSync(archive)) }, null, 2) + "\n",
        { flag: "wx" },
    );
    console.log(archive);
} finally {
    if (existsSync(index)) {
        unlinkSync(index);
    }
    rmdirSync(temporary);
}
