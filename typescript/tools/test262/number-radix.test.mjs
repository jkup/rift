import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {scratchRoot} from './test-support/environment.mjs';

test('radix formatter: complete exact oracle, controls and resource bounds in both hosts', () => {
  const output = mkdtempSync(join(scratchRoot, 'number-radix-'));
  const child = spawnSync(process.execPath, ['tools/test-number-radix.mjs'], {
    encoding: 'utf8', timeout: 600000, maxBuffer: 4 * 1024 * 1024,
    env: {...process.env, RIFT_RADIX_EVIDENCE: pathToFileURL(output + sep).href},
  });
  writeFileSync(join(output, 'run.log'), (child.stdout ?? '') + (child.stderr ?? ''));
  assert.equal(child.error, undefined);
  assert.equal(child.signal, null);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, '');
  const summary = JSON.parse(child.stdout);
  assert.deepEqual(JSON.parse(readFileSync(join(output, 'summary.json'), 'utf8')), summary);
  assert.equal(summary.frozenPairs, 13350);
  assert.equal(summary.totalPerLane, 14768);
  for (const lane of ['node', 'native']) {
    assert.equal(summary.lanes[lane].canonical, 14768);
    assert.equal(summary.lanes[lane].skips, 0);
    assert.equal(summary.lanes[lane].crashes, 0);
    assert.equal(summary.lanes[lane].timeouts, 0);
  }
});
