// One-time production capture; validation never regenerates expectations.
import assert from 'node:assert/strict';
import { prepareScriptSelection, inspectScriptSelection } from '../../../tools/test262/script-plan.mjs';
import { frozenManifest, REVISION } from '../../../tools/test262/input.mjs';
import { corpusRoot, json, save } from './support.mjs';
const { manifest } = await frozenManifest();
const paths = manifest.entries.map(e => e.path);
const accepted = await json('docs/validation/ts-035e2-p/corpus-literals.json');
const rows = [];
for (const lane of ['node', 'native']) {
  for (const revision of [REVISION, 'wrong', ' ']) {
    const selection = inspectScriptSelection(await prepareScriptSelection({root:corpusRoot, revision, lane, paths}));
    if (revision === REVISION) assert.deepEqual(selection.files, accepted.find(r => r.lane === lane).selection.files);
    else for (const file of selection.files) {
      assert.equal(file.slots, null);
      assert.deepEqual(file.inputError, {status:'harness-error',stage:'input',reasonCode:'revision-mismatch'});
    }
    rows.push({lane,revision,selection});
  }
}
await save('selection-literals.json',rows);
console.log('Frozen six complete production projections; accepted both-lane slots match.');
