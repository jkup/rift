import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {classifyFixture, runFixture, selectFixtures} from './legacy-suite.mjs';

test('real process status overrides reported checks; silent completion is separate', async () => {
  for (const [source, expected] of [
    ['console.log("PASS: one")', 'reported-success'],
    ['console.log("PASS: one\\nFAIL: two")', 'reported-failure'],
    ['console.log("ordinary output")', 'completed-without-checks'],
    ['console.log("PASS: one");process.exitCode=1', 'runtime-error'],
    ['process.exitCode=2', 'parse-error'], ['process.exitCode=70', 'host-fault'],
    ['process.exitCode=66', 'host-fault'],
  ]) assert.equal(classifyFixture(await runFixture(process.execPath, ['-e', source])).outcome, expected);
});

test('launch failure, deadline and bounded output remain distinct', async () => {
  assert.equal(classifyFixture(await runFixture(resolve('build/absent-legacy-executable'), [])).outcome, 'host-fault');
  assert.equal(classifyFixture(await runFixture(process.execPath, ['-e', 'setInterval(()=>{},1000)'], 100)).outcome, 'timeout');
  assert.equal(classifyFixture(await runFixture(process.execPath, ['-e', 'process.stdout.write("x".repeat(2000000))'])).outcome, 'output-limit');
});

test('legacy selection includes nested fixtures and records original exclusions', async () => {
  await mkdir('build', {recursive: true});
  const root = await mkdtemp(resolve('build/legacy-selection-'));
  try {
    await mkdir(join(root, 'nested')); await mkdir(join(root, 'skipped'));
    for (const name of ['a.js', 'temp_x.js', 'nested/b.js', 'skipped/c.js', 'notes.txt'])
      await writeFile(join(root, name), '');
    const selection = await selectFixtures(root);
    assert.deepEqual(selection.selected, [join(root, 'a.js'), join(root, 'nested/b.js')]);
    assert.deepEqual(selection.excluded, [join(root, 'skipped/c.js'), join(root, 'temp_x.js')]);
  } finally { await rm(root, {recursive: true}); }
});
