import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { frozenManifest, blobHash } from './input.mjs';
import { corpusRoot, scratchRoot } from './test-support/environment.mjs';

const { manifest } = await frozenManifest();
const files = [
  ...manifest.entries.map(entry => ({ path: entry.path, blob: entry.blob })),
  ...Object.entries(manifest.upstream.harnessBlobs).map(([path, blob]) => ({ path, blob })),
];

function prepare(source, target) {
  return spawnSync(process.execPath, ['tools/test262/prepare-corpus.mjs', source], {
    encoding: 'utf8', timeout: 30000,
    env: { ...process.env, RIFT_TEST262_ROOT: target },
  });
}

test('corpus setup verifies pinned bytes, is repeatable, and refuses corrupt sources or destinations', () => {
  const directory = mkdtempSync(join(scratchRoot, 'corpus-setup-'));
  const target = join(directory, 'corpus with spaces');
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = prepare(corpusRoot, target);
    assert.equal(result.status, 0, result.stderr);
    for (const file of files) assert.equal(blobHash(readFileSync(join(target, file.path))), file.blob);
  }

  const corrupt = join(target, files.at(-1).path);
  writeFileSync(corrupt, 'corrupt input');
  const rejectedTarget = join(directory, 'must-not-be-created');
  const badSource = prepare(target, rejectedTarget);
  assert.equal(badSource.status, 1);
  assert.match(badSource.stderr, /test262 blob mismatch/);
  assert.equal(existsSync(rejectedTarget), false);

  const partialTarget = join(directory, 'partial-target');
  const existing = join(partialTarget, files.at(-1).path);
  mkdirSync(dirname(existing), { recursive: true });
  writeFileSync(existing, 'retain failed-run evidence');
  const badTarget = prepare(corpusRoot, partialTarget);
  assert.equal(badTarget.status, 1);
  assert.match(badTarget.stderr, /existing corpus differs/);
  assert.equal(readFileSync(existing, 'utf8'), 'retain failed-run evidence');
  assert.equal(existsSync(join(partialTarget, files[0].path)), false);
});
