import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
    checkedCommand,
    downloadVerified,
    fileHash,
    nativeBuildEnvironment,
    releaseTarget,
    requireNativeLinker,
} from "./native-release-support.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const [upstream, requestedOutput, ...extra] = process.argv.slice(2);
if (!upstream || extra.length || upstream === "--help") {
    console.log(
        "Usage: npm run setup:native -- <upstream-scriptc-checkout> [new-output-directory]",
    );
    process.exit(upstream === "--help" ? 0 : 64);
}
const target = releaseTarget();
const pin = JSON.parse(readFileSync(join(root, "toolchain/scriptc/source.json"), "utf8"));
const downloads = JSON.parse(readFileSync(join(root, "toolchain/scriptc/downloads.json"), "utf8"));
const output = resolve(requestedOutput ?? join(root, "build/toolchain", target));
const work = output + "-build";
if (existsSync(output) || existsSync(work)) {
    throw new Error(`Use a new output directory; ${output} or ${work} already exists`);
}
if (Number(process.versions.node.split(".")[0]) < 24 || !process.env.npm_execpath) {
    throw new Error("Run through npm with Node 24 or later");
}
requireNativeLinker();
mkdirSync(work, { recursive: true });
const env = nativeBuildEnvironment();
function run(command, args, cwd = work) {
    console.log(`Running ${basename(command)} ${args.join(" ")}`);
    return checkedCommand(command, args, { cwd, env, stdio: "inherit" });
}

async function installZig() {
    const asset = downloads.zig[target];
    const archive = join(work, basename(new URL(asset.url).pathname));
    await downloadVerified(asset.url, archive, asset.sha256);
    run("tar", ["-xf", archive, "-C", work]);
    const directory = join(work, basename(archive).replace(/\.(zip|tar\.xz)$/, ""));
    const executable = join(directory, process.platform === "win32" ? "zig.exe" : "zig");
    if (checkedCommand(executable, ["version"]) !== pin.buildDependencies.zig) {
        throw new Error("Unexpected Zig version");
    }
    env.PATH = directory + delimiter + env.PATH;
    // Keep Zig's cache within the build workspace and out of shared user caches.
    env.ZIG_GLOBAL_CACHE_DIR = join(work, "zig-cache");
    return directory;
}

async function installHelper(source) {
    const windows = process.platform === "win32";
    const helper = pin.buildDependencies[windows ? "windowsLLVMHelper" : "linuxLLVMHelper"];
    const packageName = helper.name.slice("@scriptc/".length);
    const archive = join(work, "llvm.tgz");
    await downloadVerified(
        `https://registry.npmjs.org/${helper.name}/-/${packageName}-${helper.version}.tgz`,
        archive,
        helper.archiveSha256,
        helper.integrity,
    );
    const unpack = join(work, "llvm");
    mkdirSync(unpack);
    run("tar", ["-xf", archive, "-C", unpack]);
    const bin = join(unpack, "package/bin");
    const files = readdirSync(bin).filter((name) => !name.endsWith(".json"));
    if (!files.some((name) => fileHash(join(bin, name)) === helper.helperSha256)) {
        throw new Error("LLVM helper executable hash mismatch");
    }
    cpSync(bin, join(source, "packages", packageName, "bin"), { recursive: true });
}

const zigDirectory = await installZig();
const archive = join(work, "source.tar");
run(process.execPath, [join(root, "toolchain/scriptc/prepare.mjs"), resolve(upstream), archive]);
const source = join(work, "source");
mkdirSync(source);
// Extract only build inputs. Upstream test symlinks need Windows developer mode
// and are irrelevant to this compiler build; the verified archive retains them.
run("tar", [
    "-xf",
    archive,
    "-C",
    source,
    "--exclude=tests",
    "--exclude=docs",
    "--exclude=.claude",
]);
if (process.platform === "win32") {
    const git = checkedCommand("where.exe", ["git"]).split(/\r?\n/)[0];
    const unixTools = resolve(dirname(git), "../usr/bin");
    if (!existsSync(join(unixTools, "true.exe"))) {
        throw new Error("Git for Windows usr/bin/true.exe is required by upstream build scripts");
    }
    env.PATH += delimiter + unixTools;
}
const npm = process.env.npm_execpath;
const pnpm = [npm, "exec", "--yes", `--package=pnpm@${pin.buildDependencies.pnpm}`, "--", "pnpm"];
run(process.execPath, [...pnpm, "install", "--frozen-lockfile"], source);
run(process.execPath, [...pnpm, "-r", "--filter", "./packages/*", "run", "build"], source);
await installHelper(source);
const runtime = process.platform === "win32" ? "win32-x64-msvc" : "linux-x64-gnu";
run(process.execPath, [`packages/runtime-${runtime}/scripts/build.mjs`], source);
run(process.execPath, [`packages/runtime-${runtime}/scripts/verify.mjs`], source);
run(
    process.execPath,
    ["--max-old-space-size=8192", "--import", "tsx", "scripts/build-native-cli.mts", output],
    source,
);
writeFileSync(
    join(output, "rift-toolchain.json"),
    JSON.stringify({ target, pin, zigDirectory, sourceArchiveSha256: fileHash(archive) }, null, 2) +
        "\n",
    { flag: "wx" },
);
console.log(`Compiler ready: ${output}\nAdd ${zigDirectory} to PATH before native builds.`);
