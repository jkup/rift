// Explicit opt-in local-byte acceptance: node tools/test262/corpus.integration.mjs ROOT [EVIDENCE_DIR]
// No retrieval or guest execution. Not included in the offline test glob.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
    frozenManifest,
    planCorpus,
    localBytes,
    verifyBytes,
    metadata,
    compareMetadata,
    REVISION,
} from "./input.mjs";
import { preflightRecords, prepareSelection } from "./plan.mjs";
import { newLedger, appendAttempt, report, persist } from "./ledger.mjs";
const root = process.argv[2];
if (!root) {
    throw new Error("Explicit external corpus ROOT required");
}
const output = process.argv[3];
const { manifest } = await frozenManifest();

test("I01 I05 exact pinned 33 files and all 3 harness blobs; original bytes untouched", async () => {
    for (const e of manifest.entries) {
        const bytes = await localBytes(root, e.path);
        const before = Buffer.from(bytes);
        const result = verifyBytes(bytes, e.blob);
        compareMetadata(metadata(result.source), e);
        assert.deepEqual(bytes, before);
    }
    for (const [path, blob] of Object.entries(manifest.upstream.harnessBlobs)) {
        verifyBytes(await localBytes(root, path, "harness/"), blob);
    }
});
test("I02 I04 exact S01 corruption and U11 CR rewrite fail identity; I05 code points preserved", async () => {
    const s = manifest.entries.find((e) => e.id === "S01");
    const bytes = await localBytes(root, s.path);
    bytes[0] ^= 1;
    assert.throws(() => verifyBytes(bytes, s.blob), /blob-mismatch/);
    const u = manifest.entries.find((e) => e.id === "U11");
    const original = await localBytes(root, u.path);
    const text = verifyBytes(original, u.blob).source;
    for (const point of ["\r", "\u2028", "\u2029"]) {
        assert.ok(text.includes(point));
    }
    assert.deepEqual(Buffer.from(text, "utf8"), original);
    assert.throws(
        () => verifyBytes(Buffer.from(text.replaceAll("\r", "\n")), u.blob),
        /blob-mismatch/,
    );
});
test("I17 verified metadata retains pair when missing/corrupt default harness precedes profile skip", async () => {
    const temp = await mkdtemp(join(tmpdir(), "rift-corpus-"));
    const s = manifest.entries[0];
    try {
        await mkdir(dirname(join(temp, s.path)), { recursive: true });
        await writeFile(join(temp, s.path), await localBytes(root, s.path));
        let selection = await planCorpus({
            root: temp,
            revision: REVISION,
            lane: "node",
            paths: [s.path],
        });
        assert.equal(selection.files[0].variants.length, 2);
        assert.equal(selection.files[0].inputError.reasonCode, "include-missing");
        await prepareSelection(selection);
        let records = await preflightRecords(selection);
        assert.equal(records.length, 2);
        for (const { record } of records) {
            assert.equal(record.classification.status, "harness-error");
            assert.equal(record.classification.reasonCode, "include-missing");
            assert.equal(record.evidence.stage, "input");
            assert.equal(record.evidence.bodyEvaluated, false);
        }
        await mkdir(join(temp, "harness"));
        await writeFile(join(temp, "harness/assert.js"), "changed");
        selection = await planCorpus({
            root: temp,
            revision: REVISION,
            lane: "node",
            paths: [s.path],
        });
        assert.equal(selection.files[0].variants.length, 2);
        assert.equal(selection.files[0].inputError.reasonCode, "blob-mismatch");
    } finally {
        await rm(temp, { recursive: true, force: true });
    }
});
test("T12 verified local production ledgers retain 33/60 separately for both lanes, all blocked", async () => {
    if (output) {
        await mkdir(output, { recursive: true });
    }
    for (const lane of ["node", "native"]) {
        const selection = await planCorpus({
            root,
            revision: REVISION,
            lane,
            paths: manifest.entries.map((e) => e.path),
        });
        assert.equal(selection.files.length, 33);
        assert.deepEqual(
            selection.files
                .filter((f) => f.inputError)
                .map((f) => ({ id: f.id, error: f.inputError })),
            [],
        );
        await prepareSelection(selection);
        const ledger = newLedger(selection);
        if (output) {
            await persist(join(output, `${lane}-initial-ledger.json`), ledger);
        }
        for (const { id, record } of await preflightRecords(selection)) {
            appendAttempt(ledger, id, record);
        }
        const result = report(ledger);
        assert.equal(result.plannedVariants, 60);
        assert.equal(result.completed, 60);
        assert.equal(result.executedVariants, 0);
        assert.equal(result.counts.pass, 0);
        assert.equal(result.counts.fail, 0);
        assert.equal(result.counts["unsupported-feature"], 19);
        assert.equal(result.counts["unsupported-profile"], 41);
        assert.equal(result.unplannedInputErrors, 0);
        assert.equal(result.exitCode, 1);
        assert.deepEqual(result.passOverPlanned, { numerator: 0, denominator: 60 });
        assert.equal(result.conditionalPass, null);
        if (output) {
            await persist(join(output, `${lane}-ledger.json`), ledger);
            await persist(join(output, `${lane}-report.json`), result);
        }
    }
});
