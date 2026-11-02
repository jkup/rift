import { randomUUID } from 'node:crypto';
import { open, rename, unlink } from 'node:fs/promises';
import { STATUSES, validateRecord } from './result.mjs';

export function newLedger(selection) {
  const planned = selection.files.flatMap(file => file.variants ?? []);
  if (new Set(planned.map(v => v.id)).size !== planned.length || planned.some(v => v.lane !== selection.lane)) throw new Error('selection');
  return { selection: structuredClone(selection), attempts: [] };
}
export function appendAttempt(ledger, id, record, retryReason = null) {
  validateRecord(record);
  const planned = ledger.selection.files.flatMap(f => f.variants ?? []).find(v => v.id === id);
  if (!planned || record.identity.mode !== 'conformance' ||
      ['path', 'lane', 'variant', 'goal', 'blob', 'sourceSha256'].some(k => record.identity[k] !== planned[k])) throw new Error('identity');
  for (const key of ['manifestSha256', 'revision']) {
    const identityKey = key === 'revision' ? 'corpusRevision' : key;
    if (ledger.selection[key] !== undefined && record.identity[identityKey] !== ledger.selection[key]) throw new Error('identity');
  }
  if (planned.transformedSourceSha256 !== undefined && record.inputs.transformedSourceSha256 !== planned.transformedSourceSha256) throw new Error('identity');
  if (planned.harness !== undefined && JSON.stringify(record.inputs.harness) !== JSON.stringify(planned.harness)) throw new Error('identity');
  const file = ledger.selection.files.find(f => f.variants?.some(v => v.id === id));
  if (planned.blockers?.length) {
    if (record.observation.kind !== 'not-run') throw new Error('profile-not-admitted');
    const expected = file.inputError ? [] : planned.blockers;
    if (JSON.stringify(record.classification.blockers) !== JSON.stringify(expected) ||
        record.classification.reasonCode !== (file.inputError?.reasonCode ?? expected[0].reasonCode)) throw new Error('identity');
  }
  const prior = ledger.attempts.filter(a => a.id === id);
  if (prior.length && (typeof retryReason !== 'string' || !retryReason.trim())) throw new Error('retry-policy');
  ledger.attempts.push({ id, attempt: prior.length + 1, retryReason, record: structuredClone(record) });
}

export function report(ledger) {
  const { selection, attempts } = ledger;
  const counts = Object.fromEntries(STATUSES.map(status => [status, 0]));
  const files = [];
  let plannedVariants = 0, completed = 0, executedVariants = 0, inputErrors = 0, passedFiles = 0;
  for (const file of selection.files) {
    if (file.variants === null) {
      inputErrors += 1;
      files.push({ path: file.path, statuses: null, inputError: file.inputError, passed: false });
      continue;
    }
    const statuses = [];
    for (const variant of file.variants) {
      plannedVariants++;
      // Initial outcomes are the headline. An explicit retry remains an attached
      // attempt, never a silent replacement or another denominator entry.
      const first = attempts.find(a => a.id === variant.id);
      const status = first?.record.classification.status ?? null;
      statuses.push({ variant: variant.variant, status });
      if (first) {
        completed++;
        counts[status]++;
        if (first.record.evidence.stage === 'test') executedVariants++;
      }
    }
    const passed = statuses.length > 0 && statuses.every(x => x.status === 'pass');
    if (passed) passedFiles++;
    files.push({ path: file.path, statuses, passed });
  }
  const complete = inputErrors === 0 && completed === plannedVariants;
  return { lane: selection.lane, selectedFiles: selection.files.length, plannedVariants,
    executedVariants, unplannedInputErrors: inputErrors, completed, missing: plannedVariants - completed,
    attempts: attempts.length, counts, passedFiles, files, excludedFixtures: selection.excludedFixtures,
    complete, passOverPlanned: complete ? { numerator: counts.pass, denominator: plannedVariants } : null,
    conditionalPass: counts.pass + counts.fail ? { numerator: counts.pass, denominator: counts.pass + counts.fail } : null,
    exitCode: !complete ? 2 : counts.pass === plannedVariants ? 0 : 1 };
}

// Create a new snapshot, flush it, then rename within the same directory. A
// cancellation leaves the previous snapshot and its unfinished entries intact.
export async function persist(path, value) {
  const temp = `${path}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await open(temp, 'wx');
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`);
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temp, path);
  } finally {
    if (handle) await handle.close();
    await unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}
