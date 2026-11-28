import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createOutputCapture } from "./observe.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const factsFor = (outputLimit) => ({ outputBytes: 0, outputLimit, capCount: null });

test("observation capture shares one cap while counting and hashing both complete streams", () => {
    const facts = factsFor(5);
    const capture = createOutputCapture(facts);
    assert.equal(capture.capture("stdout", Buffer.from("abc")), false);
    assert.equal(capture.capture("stderr", Buffer.from("de")), false);
    assert.equal(facts.capCount, null);
    assert.equal(capture.capture("stdout", Buffer.from("😀")), true);
    assert.equal(capture.capture("stderr", Buffer.from("tail")), false);
    assert.deepEqual(facts, { outputBytes: 13, outputLimit: 5, capCount: 9 });
    assert.deepEqual(capture.finish(), {
        stdout: Buffer.from("abc"),
        stderr: Buffer.from("de"),
        stdoutSha256: hash("abc😀"),
        stderrSha256: hash("detail"),
    });
});

test("oversized output retains a byte prefix without aliasing the incoming buffer", () => {
    const facts = factsFor(4);
    const capture = createOutputCapture(facts);
    const chunk = Buffer.from("ab😀".repeat(10000));
    const expectedHash = hash(chunk);
    assert.equal(capture.capture("stdout", chunk), true);
    chunk.fill(0);
    const result = capture.finish();
    assert.deepEqual(result.stdout, Buffer.from([97, 98, 240, 159]));
    assert.equal(result.stderr.length, 0);
    assert.equal(result.stdoutSha256, expectedHash);
    assert.equal(result.stderrSha256, hash(""));
    assert.equal(facts.outputBytes, 60000);
});

test("continued output after the cap stays bounded and preserves the first crossing count", () => {
    const facts = factsFor(16);
    const capture = createOutputCapture(facts);
    const chunk = Buffer.alloc(4096, 65);
    const completeHash = createHash("sha256");
    for (let i = 0; i < 2000; i++) {
        assert.equal(capture.capture("stdout", chunk), i === 0);
        completeHash.update(chunk);
    }
    const result = capture.finish();
    assert.deepEqual(result.stdout, Buffer.alloc(16, 65));
    assert.equal(result.stderr.length, 0);
    assert.equal(result.stdoutSha256, completeHash.digest("hex"));
    assert.equal(facts.outputBytes, 8192000);
    assert.equal(facts.capCount, 4096);
});

test("uncapped observation output and its hashes remain unchanged", () => {
    const facts = factsFor(100);
    const capture = createOutputCapture(facts);
    capture.capture("stdout", Buffer.from("hello\n"));
    capture.capture("stderr", Buffer.from("diagnostic\n"));
    const result = capture.finish();
    assert.equal(result.stdout.toString(), "hello\n");
    assert.equal(result.stderr.toString(), "diagnostic\n");
    assert.equal(result.stdoutSha256, hash(result.stdout));
    assert.equal(result.stderrSha256, hash(result.stderr));
    assert.equal(facts.capCount, null);
});
