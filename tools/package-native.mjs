import {
    cpSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    renameSync,
    writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scriptcPath } from "./scriptc-path.mjs";
import { runNativeCommand } from "./native-build-runner.mjs";
import { probeVerdict } from "./probe-verdict.mjs";
import {
    checkedCommand,
    fileHash,
    releaseName,
    releaseTarget,
    requireNativeLinker,
} from "./native-release-support.mjs";
import { smokeNativeRelease } from "./native-release-smoke.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const [version, requestedDirectory, ...extra] = process.argv.slice(2);
if (!version || version === "--help" || extra.length) {
    console.log("Usage: npm run package:native -- <version> [output-directory]");
    process.exit(version === "--help" ? 0 : 64);
}
const target = releaseTarget();
const name = releaseName(version, target);
const destination = resolve(requestedDirectory ?? join(root, "build/releases"));
const extension = process.platform === "win32" ? ".zip" : ".tar.gz";
const archive = join(destination, name + extension);
for (const path of [archive, archive + ".sha256", join(destination, name + ".json")]) {
    if (existsSync(path)) {
        throw new Error(`Refusing to overwrite ${path}`);
    }
}
function git(args) {
    return checkedCommand("git", args, { cwd: root });
}
const revision = git(["rev-parse", "HEAD"]);
function requireCleanRevision() {
    if (git(["status", "--porcelain"]) || git(["rev-parse", "HEAD"]) !== revision) {
        throw new Error("Release packaging requires a clean checkout fixed at one commit");
    }
}
requireCleanRevision();
const compiler = scriptcPath(root);
const pin = JSON.parse(readFileSync(join(root, "toolchain/scriptc/source.json"), "utf8"));
const zig = checkedCommand("zig", ["version"]);
if (zig !== pin.buildDependencies.zig) {
    throw new Error(`Release builds require Zig ${pin.buildDependencies.zig}, found ${zig}`);
}
requireNativeLinker();
mkdirSync(destination, { recursive: true });
const work = mkdtempSync(join(destination, ".native-release-"));
const bundle = join(work, name);
mkdirSync(bundle);
const executable = join(bundle, process.platform === "win32" ? "rift.exe" : "rift");
const report = { version, revision, target, compilerSha256: fileHash(compiler), zig, pin };
const reportPath = join(work, "validation.json");
function saveReport() {
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
}

function copyFile(source, path) {
    const destinationPath = join(bundle, path);
    mkdirSync(dirname(destinationPath), { recursive: true });
    cpSync(source, destinationPath);
}

function copyNotices(directory, prefix) {
    for (const entry of readdirSync(directory, { withFileTypes: true, recursive: true })) {
        if (entry.isFile() && /^(LICENSE|COPYING|NOTICE|THIRD_PARTY|README)/i.test(entry.name)) {
            const source = join(entry.parentPath, entry.name);
            copyFile(source, join(prefix, relative(directory, source)));
        }
    }
}

function stageDocumentation() {
    for (const path of [
        "LICENSE",
        "README.md",
        "CONTRIBUTING.md",
        "THIRD_PARTY_NOTICES.md",
        "examples/counter.js",
        "toolchain/scriptc/LICENSE",
        "toolchain/scriptc/source.json",
        "toolchain/scriptc/README.md",
        "tools/test262/README.md",
        "test/fixtures/harness-bundle/LICENSE",
    ]) {
        copyFile(join(root, path), path);
    }
    cpSync(join(root, "docs"), join(bundle, "docs"), { recursive: true });
    const metadata = JSON.parse(readFileSync(compiler + ".json", "utf8"));
    const runtime = resolve(dirname(compiler), metadata.runtime_sources);
    copyNotices(runtime, "licenses/scriptc-runtime");
    // Keep inline attribution from the derived runtime units as well.
    for (const path of ["src/scr_musl.c", "src/scr_ieee754.c"]) {
        copyFile(join(runtime, path), join("licenses/scriptc-runtime", path));
    }
    const zigEnv = checkedCommand("zig", ["env"]);
    const match = /\.lib_dir\s*=\s*("(?:[^"\\]|\\.)*")/.exec(zigEnv);
    if (!match) {
        throw new Error("Cannot locate Zig runtime notices");
    }
    const zigLib = resolve(JSON.parse(match[1]));
    copyNotices(join(zigLib, "compiler_rt"), "licenses/zig-compiler-rt");
    copyFile(join(zigLib, "../LICENSE"), "licenses/zig-LICENSE");
    if (process.platform === "win32") {
        copyFile(join(zigLib, "libc/mingw/COPYING"), "licenses/mingw-COPYING");
    }
    const run = process.platform === "win32" ? ".\\rift.exe" : "./rift";
    writeFileSync(
        join(bundle, "README.txt"),
        `Rift ${version} (${target})\nSource: https://github.com/jkup/rift/commit/${revision}\n\n` +
            `Extract the entire archive, open a terminal in this directory, then run:\n` +
            `  ${run} examples/counter.js\n  ${run} -e "console.log(6 * 7);"\n  ${run} --help\n\n` +
            "No Node.js, npm, ScriptC or Zig installation is required to run Rift.\n" +
            "The executable interprets scripts; it does not provide Node or browser APIs.\n" +
            "See docs/architecture.md for supported features and limits.\n" +
            "See LICENSE, THIRD_PARTY_NOTICES.md and licenses/ for third-party notices.\n" +
            "manifest.json records the source and executable hashes and validation scope.\n",
    );
}

function archiveAndVerify() {
    const temporary = join(work, name + extension);
    const options = process.platform === "win32" ? ["-a", "-cf"] : ["-czf"];
    checkedCommand("tar", [...options, temporary, "-C", work, name]);
    const unpack = mkdtempSync(join(work, "relocated package "));
    checkedCommand("tar", ["-xf", temporary, "-C", unpack]);
    const extracted = join(unpack, name);
    const relocated = join(extracted, basename(executable));
    if (fileHash(relocated) !== report.executableSha256) {
        throw new Error("Archived executable hash mismatch");
    }
    report.smoke = smokeNativeRelease(relocated, extracted);
    saveReport();
    if (report.smoke.some((result) => result.verdict !== "PASS")) {
        throw new Error(`Extracted package smoke tests failed; inspect ${reportPath}`);
    }
    requireCleanRevision();
    renameSync(temporary, archive);
    writeFileSync(archive + ".sha256", `${fileHash(archive)}  ${basename(archive)}\n`, {
        flag: "wx",
    });
    writeFileSync(join(destination, name + ".json"), JSON.stringify(report, null, 2) + "\n", {
        flag: "wx",
    });
    console.log(
        `Packaged ${archive}\n${report.smoke.length} extracted-binary checks passed; no skips.`,
    );
}

try {
    // Fresh probes precede the CLI build. Their failure prevents any release asset.
    checkedCommand(process.execPath, [join(root, "tools/test-compiler.mjs")], {
        cwd: root,
        stdio: "inherit",
    });
    report.probes = JSON.parse(readFileSync(join(root, "build/probe-results.json"), "utf8"));
    report.build = await runNativeCommand(
        compiler,
        ["build", "src/cli.ts", "--tier", "static-only", "--no-keep-llvm", "-o", executable],
        { cwd: root },
    );
    report.coverage = await runNativeCommand(compiler, ["coverage", "src/cli.ts"], { cwd: root });
    const success = { status: 0, signal: null, error: null, stdout: "" };
    report.verdict = probeVerdict({
        build: report.build,
        coverage: report.coverage,
        node: success,
        native: success,
    });
    saveReport();
    if (report.verdict !== "PASS") {
        throw new Error(`Native CLI ${report.verdict}; inspect ${reportPath}`);
    }
    stageDocumentation();
    report.executableSha256 = fileHash(executable);
    writeFileSync(
        join(bundle, "manifest.json"),
        JSON.stringify(
            {
                version,
                revision,
                target,
                executableSha256: report.executableSha256,
                compilerSha256: report.compilerSha256,
                compilerSource: pin,
                zig,
                validation:
                    "Ten compiler probes, static-only CLI build, zero-dynamic coverage, and extracted CLI smoke tests. Not full guest or Test262 conformance.",
            },
            null,
            2,
        ) + "\n",
    );
    archiveAndVerify();
} catch (error) {
    report.error = error.message;
    saveReport();
    throw error;
}
