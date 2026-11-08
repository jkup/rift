import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { frozenManifest, blobHash, safePath, REVISION } from './input.mjs';
import { corpusRoot } from './test-support/environment.mjs';

if (process.argv.length > 3) throw new Error('usage: prepare-corpus.mjs [existing-test262-directory]');
const sourceRoot = process.argv[2];
const { manifest } = await frozenManifest();
const files = [
  ...manifest.entries.map(entry => ({ path: entry.path, blob: entry.blob })),
  ...Object.entries(manifest.upstream.harnessBlobs).map(([path, blob]) => ({ path, blob })),
];

// Verify every input before writing any corpus file. Existing differing bytes
// are an error: setup must not conceal a damaged corpus used by a failed test.
const verified = [];
for (const file of files) {
  safePath(file.path, file.path.startsWith('harness/') ? 'harness/' : 'test/');
  let bytes;
  if (sourceRoot) {
    bytes = await readFile(resolve(sourceRoot, file.path));
  } else {
    const url = `https://raw.githubusercontent.com/tc39/test262/${REVISION}/${file.path}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${file.path}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (blobHash(bytes) !== file.blob) throw new Error(`test262 blob mismatch: ${file.path}`);
  const target = resolve(corpusRoot, file.path);
  try {
    const existing = await readFile(target);
    if (!existing.equals(bytes)) throw new Error(`existing corpus differs: ${file.path}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  verified.push({ target, bytes });
}
for (const { target, bytes } of verified) {
  await mkdir(dirname(target), { recursive: true });
  try {
    await writeFile(target, bytes, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST' || !(await readFile(target)).equals(bytes)) throw error;
  }
}
console.log(`Verified ${verified.length} pinned test262 files at ${corpusRoot}`);
