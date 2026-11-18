import {Worker, isMainThread, parentPort} from 'node:worker_threads';
import {readFileSync, writeFileSync, appendFileSync, mkdtempSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join, relative} from 'node:path';
import {findTestFiles, runSingleTest, TEST262_DIR} from './cpp-direct-core.mjs';

if (!isMainThread) {
  const scratch = mkdtempSync('/var/tmp/rift-cpp-test262-');
  parentPort.on('message', file => {
    const started = Date.now();
    try {
      const bytes = readFileSync(file);
      const result = runSingleTest(file, join(scratch, 'test.js'));
      parentPort.postMessage({path: relative(TEST262_DIR, file), sha256: createHash('sha256').update(bytes).digest('hex'), ...result, elapsedMs: Date.now() - started});
    } catch (error) {
      parentPort.postMessage({path: relative(TEST262_DIR, file), status: 'runner-error', reason: String(error), elapsedMs: Date.now() - started});
    }
  });
} else {
  const files = findTestFiles().sort();
  const selection = JSON.stringify(files.map(file => relative(TEST262_DIR, file)));
  if (readFileSync('cpp-selection.json', 'utf8') !== selection) throw new Error('selection changed');
  writeFileSync('cpp-direct-results.jsonl', '', {flag: 'wx'});
  const summary = {label: 'Historical runner classifications, not corrected conformance claims', selected: files.length, completed: 0, counts: {}, startedAt: new Date().toISOString(), complete: false};
  let next = 0;
  function save() { writeFileSync('cpp-direct-progress.json', JSON.stringify(summary, null, 2)); }
  save();
  await Promise.all(Array.from({length: 2}, () => new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url));
    worker.on('error', reject);
    function dispatch() {
      if (next < files.length) worker.postMessage(files[next++]);
      else worker.terminate().then(resolve, reject);
    }
    worker.on('message', result => {
      appendFileSync('cpp-direct-results.jsonl', JSON.stringify(result) + '\n');
      summary.completed++;
      summary.counts[result.status] = (summary.counts[result.status] ?? 0) + 1;
      if (summary.completed % 500 === 0) { save(); console.log(JSON.stringify(summary)); }
      dispatch();
    });
    dispatch();
  })));
  summary.complete = true;
  summary.finishedAt = new Date().toISOString();
  save();
  console.log(JSON.stringify(summary));
}
