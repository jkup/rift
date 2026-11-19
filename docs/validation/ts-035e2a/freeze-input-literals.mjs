// One-time expected projections from the already-frozen successful selection.
// This does not call the production API or read generated fault results.
import {json,save,evidence} from './support.mjs';
import {resolve} from 'node:path';
const base=(await json(resolve(evidence,'selection-literals.json')))[0].selection;
const rows=[];
for(const [reason,known] of [['retrieval',false],['include-missing',true],
  ['include-missing',true],['blob-mismatch',true],['blob-mismatch',false]]) {
  const row=structuredClone(base);row.files=row.files.slice(0,1);
  row.files[0].inputError={status:'harness-error',stage:'input',reasonCode:reason};
  if(known)for(const slot of row.files[0].slots){slot.harness=[];slot.harnessState='input-failed';}
  else row.files[0].slots=null;
  rows.push(row);
}
await save('input-literals.json',rows);
