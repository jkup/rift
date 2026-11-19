import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
    metadata,
    variants,
    transform,
    verifyBytes,
    blobHash,
    sha256,
    compareMetadata,
    blockers,
    safePath,
    localBytes,
    planCorpus,
    frozenManifest,
    REVISION,
    harnessPaths,
} from "./input.mjs";
import { fm } from "./fixtures.mjs";
const error = (code) => (e) => e.reasonCode === code;
const parse = (yaml) => metadata(fm(yaml));

test("I01 I02 production pin/selection cannot be replaced by synthetic bytes", async () => {
    const { manifest } = await frozenManifest();
    assert.equal(manifest.upstream.revision, REVISION);
    assert.equal(manifest.entries[0].blob, "74c1e27da8023494448f616d1796c3aaadcef17e");
    assert.throws(
        () => verifyBytes(Buffer.from(fm()), manifest.entries[0].blob),
        error("blob-mismatch"),
    );
    await assert.rejects(
        planCorpus({ root: ".", revision: REVISION, lane: "node", paths: ["test/synthetic.js"] }),
        error("selection-mismatch"),
    );
});
test("I03 I07 revision failure and retrieval preserve selected entry with unknown variants", async () => {
    const { manifest } = await frozenManifest();
    const paths = [manifest.entries[0].path];
    for (const [revision, reason] of [
        ["bad", "revision-mismatch"],
        [REVISION, "retrieval"],
    ]) {
        const p = await planCorpus({ root: "nonexistent-corpus", revision, lane: "node", paths });
        assert.equal(p.files.length, 1);
        assert.equal(p.files[0].variants, null);
        assert.deepEqual(p.files[0].inputError, {
            status: "harness-error",
            stage: "input",
            reasonCode: reason,
        });
    }
});
test("I04 I05 I06 exact synthetic Unicode/BOM/NUL and invalid UTF-8", () => {
    const bytes = Buffer.from("\ufeffa\r\nb\rc\u2028d\u2029\0");
    const original = Buffer.from(bytes);
    const result = verifyBytes(bytes, blobHash(bytes));
    assert.equal(result.source, "\ufeffa\r\nb\rc\u2028d\u2029\0");
    assert.equal(result.byteLength, 17);
    assert.deepEqual(bytes, original);
    assert.throws(
        () => verifyBytes(Buffer.from(result.source.replaceAll("\r", "\n")), result.blob),
        error("blob-mismatch"),
    );
    for (const bad of [
        Buffer.from([255]),
        Buffer.from([0xc0, 0x80]),
        Buffer.from([0xed, 0xa0, 0x80]),
    ]) {
        assert.throws(() => verifyBytes(bad, blobHash(bad)), error("invalid-utf8"));
    }
});
for (const [id, yaml] of [
    ["I08", "negative: ["],
    ["I09", "negative: {type: TypeError}"],
    [
        "I10",
        "negative: {phase: runtime, type: TypeError}\nnegative: {phase: runtime, type: RangeError}",
    ],
    ["I11", "flags: onlyStrict"],
    ["I20", "negative: {phase: resolution, type: ReferenceError}"],
]) {
    test(`${id} rejects metadata`, () => assert.throws(() => parse(yaml), error("metadata")));
}
test("I12 I13 metadata cardinality and missing description", () => {
    for (const text of ["/*---\nflags: []\n---*/", fm() + fm(), "1;", "/*---\ndescription: x"]) {
        assert.throws(() => metadata(text), error("metadata"));
    }
});
test("I14 metadata drift including order and null negative", () => {
    const m = parse("includes: [a.js, b.js]");
    assert.throws(
        () => compareMetadata(m, { flags: [], features: [], includes: ["b.js", "a.js"] }),
        error("manifest-metadata-mismatch"),
    );
    assert.throws(
        () => compareMetadata(parse("negative: {phase: parse, type: SyntaxError}"), {}),
        error("manifest-metadata-mismatch"),
    );
    compareMetadata(parse(""), { flags: [], features: [], includes: [], negative: null });
});
test("I15 all seven incompatible pairs", () => {
    for (const flags of [
        "onlyStrict,noStrict",
        "raw,onlyStrict",
        "raw,module",
        "module,noStrict",
        "module,onlyStrict",
        "raw,async",
        "CanBlockIsTrue,CanBlockIsFalse",
    ]) {
        assert.throws(() => parse(`flags: [${flags}]`), error("incompatible-flags"));
    }
});
test("I16 paths and symlink escape never read outside", async () => {
    for (const p of [
        "../outside.js",
        "/absolute.js",
        "https://bad/x.js",
        "C:/a.js",
        "a\\b.js",
        "a/../b.js",
        "./a.js",
        "a\0.js",
    ]) {
        assert.throws(() => safePath(`harness/${p}`, "harness/"), error("include-path"));
    }
    const base = await mkdtemp(join(tmpdir(), "rift-t262-"));
    try {
        await mkdir(join(base, "root"));
        await mkdir(join(base, "outside"));
        await writeFile(join(base, "outside", "secret.js"), "outside");
        await symlink(join(base, "outside"), join(base, "root", "harness"), "junction");
        await assert.rejects(
            localBytes(join(base, "root"), "harness/secret.js", "harness/"),
            error("include-path"),
        );
    } finally {
        await rm(base, { recursive: true, force: true });
    }
});
test("I17 missing include is an input error", async () => {
    await assert.rejects(
        localBytes(".", "harness/missing.js", "harness/"),
        error("include-missing"),
    );
});
test("I18 unknown flag and unknown execution fields fail closed", () => {
    assert.throws(() => parse("flags: [futureMode]"), error("unknown-flag"));
    for (const yaml of [
        "futurePolicy: x",
        "description: !custom hi",
        "info: &a hi\nauthor: *a",
        "negative: {phase: runtime, type: TypeError, extra: x}",
        "flags: [1]",
        "features: null",
        "locale: en",
    ]) {
        assert.throws(() => parse(yaml), error("metadata"));
    }
});
test("I19 unknown feature retains both variants", () => {
    const m = parse("features: [future-feature]");
    assert.deepEqual(variants(m), ["non-strict", "strict"]);
    for (const v of variants(m)) {
        assert.deepEqual(blockers(m, v)[0], {
            status: "unsupported-feature",
            reasonCode: "unrecognized-feature",
        });
    }
});
test("YAML supports folded prose, quoted strings, flow and legacy fields without execution", () => {
    const m = metadata(
        '/*---\ndescription: >\n  two lines\n  folded\nes5id: "10.4"\nnegative:\n  phase: parse\n  type: SyntaxError\n---*/',
    );
    assert.equal(m.description, "two lines folded\n");
    assert.equal(m.es5id, "10.4");
    assert.deepEqual(m.negative, { phase: "parse", type: "SyntaxError" });
    assert.equal(parse("es6id: 13.1").es6id, 13.1);
});
test("V01 V02 V03 V08 strict transforms and planning order", () => {
    assert.deepEqual(variants(parse("")), ["non-strict", "strict"]);
    assert.deepEqual(variants(parse("flags: [onlyStrict]")), ["strict"]);
    assert.deepEqual(variants(parse("flags: [noStrict]")), ["non-strict"]);
    assert.deepEqual(variants(parse("flags: [generated, onlyStrict]")), ["strict"]);
    const bytes = Buffer.from("\ufeff1;\r\n");
    assert.deepEqual(
        [...transform(bytes, "strict").subarray(0, 14)],
        [34, 117, 115, 101, 32, 115, 116, 114, 105, 99, 116, 34, 59, 10],
    );
    assert.deepEqual(transform(bytes, "strict").subarray(14), bytes);
    assert.deepEqual(transform(bytes, "non-strict"), bytes);
    assert.notEqual(sha256(transform(bytes, "strict")), sha256(bytes));
    assert.equal(blockers(parse("flags: [noStrict]"), "non-strict")[0].reasonCode, "sloppy-script");
});
test("V04 V05 raw retains metadata and bytes but zero harness", () => {
    const m = parse("flags: [raw, noStrict]\nincludes: [assert.js]");
    assert.deepEqual(variants(m), ["raw"]);
    assert.deepEqual(harnessPaths(m), []);
    assert.deepEqual(m.includes, ["assert.js"]);
    const bytes = Buffer.from("'use strict';\r\n1;");
    assert.deepEqual(transform(bytes, "raw"), bytes);
    assert.deepEqual(blockers(m, "raw")[0], {
        status: "unsupported-profile",
        reasonCode: "directive-script",
    });
});
test("V06 V07 V09 module async and strict all blocked", () => {
    const module = parse("flags: [module]");
    assert.deepEqual(variants(module), ["module"]);
    assert.deepEqual(blockers(module, "module")[0], {
        status: "unsupported-feature",
        reasonCode: "module",
    });
    const async = parse("flags: [async]");
    assert.deepEqual(variants(async), ["non-strict", "strict"]);
    for (const v of variants(async)) {
        assert.equal(blockers(async, v)[0].reasonCode, "async");
    }
    assert.deepEqual(blockers(parse("flags: [onlyStrict]"), "strict")[0], {
        status: "unsupported-profile",
        reasonCode: "strict-script-contract",
    });
});
test("V10 V11 environment and nondeterminism", () => {
    for (const yaml of ["flags: [CanBlockIsTrue]", "locale: [en]"]) {
        assert.deepEqual(blockers(parse(yaml), "strict")[0], {
            status: "unsupported-profile",
            reasonCode: "environment",
        });
    }
    const m = parse("flags: [non-deterministic]");
    assert.equal(variants(m).length, 2);
    assert.deepEqual(blockers(m, "strict")[0], {
        status: "unsupported-profile",
        reasonCode: "nondeterministic-policy",
    });
});
test("V12 comments do not invent feature blockers (execution deferred)", () => {
    const m = metadata(fm("", "/* with (x) */ 1;"));
    assert.deepEqual(
        blockers(m, "strict").map((x) => x.reasonCode),
        ["strict-script-contract", "harness-capabilities"],
    );
});
test("H01 ordered harness plan retains repeated includes; semantic effects deferred", () => {
    assert.deepEqual(harnessPaths(parse("includes: [a.js, b.js, a.js]")), [
        "harness/assert.js",
        "harness/sta.js",
        "harness/a.js",
        "harness/b.js",
        "harness/a.js",
    ]);
});
