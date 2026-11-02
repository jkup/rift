import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { planCorpus, sha256, REVISION } from './input.mjs';
import { terminalRecord } from './result.mjs';
import { newLedger, appendAttempt, persist, report } from './ledger.mjs';

export async function prepareSelection(selection) {
  const adapterSha256 = sha256(Buffer.concat(await Promise.all(['input.mjs', 'result.mjs', 'ledger.mjs', 'plan.mjs']
    .map(file => readFile(new URL(file, import.meta.url))))));
  const runId = randomUUID();
  for (const file of selection.files) for (const v of file.variants ?? []) {
    v.resultContext = { identity: { schemaVersion: 1, runId, mode: 'conformance',
      corpusRevision: REVISION, manifestSha256: selection.manifestSha256,
      path: v.path, blob: v.blob, sourceSha256: v.sourceSha256, variant: v.variant,
      goal: v.goal, lane: v.lane, engineCommit: null, engineBuildSha256: null,
      adapterSha256, policySha256: adapterSha256, dirtySourceSha256: null,
    }, inputs: { harness: v.harness, transformedSourceSha256: v.transformedSourceSha256,
      profileId: 'rift-current-blocked', capabilityLedgerSha256: null,
      host: process.version, platform: `${process.platform}/${process.arch}`, toolchain: null,
      limits: { sourceUnits: null, parseDepth: null, steps: null, calls: null,
        evaluationDepth: null, wallMs: null, outputBytes: null },
    }, expectedNegative: v.metadata.negative, blockers: file.inputError ? [] : v.blockers };
  }
  return selection;
}

export function preflightRecords(selection) {
  return selection.files.flatMap(file => (file.variants ?? []).map(v => ({ id: v.id,
    record: terminalRecord(v.resultContext.identity, v.resultContext.inputs,
    { stage: file.inputError ? 'input' : 'preflight', harnessValidated: false, bodyEvaluated: false,
      unit: v.path, location: null, process: { exitCode: null, signal: null, deadlineExpired: false },
      stdoutSha256: null, stderrSha256: null, elapsedMs: null,
    }, { kind: 'not-run', reasonCode: file.inputError?.reasonCode ?? v.blockers[0].reasonCode },
    v.metadata.negative, file.inputError ? [] : v.blockers),
  })));
}

export async function main(args) {
  if (args.length !== 5 || !['node', 'native'].includes(args[2])) {
    throw new Error('Usage: node tools/test262/plan.mjs ROOT REVISION node|native PATHS.json OUTPUT_DIRECTORY');
  }
  const [root, revision, lane, pathsFile, output] = args;
  const paths = JSON.parse(await readFile(pathsFile, 'utf8'));
  // A run owns a fresh directory. Reusing a destination must never overwrite
  // an initial failure or masquerade as an explicit retry of the prior ledger.
  await mkdir(output);
  const selection = await planCorpus({ root, revision, lane, paths });
  await prepareSelection(selection);
  const ledger = newLedger(selection);
  // Preserve the complete selection before recording any terminal outcome.
  await persist(resolve(output, 'ledger.json'), ledger);
  for (const { id, record } of await preflightRecords(selection)) appendAttempt(ledger, id, record);
  await persist(resolve(output, 'ledger.json'), ledger);
  const summary = report(ledger);
  await persist(resolve(output, 'report.json'), summary);
  return summary.exitCode;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(error => {
    console.error(error.message); process.exitCode = 2;
  });
}
