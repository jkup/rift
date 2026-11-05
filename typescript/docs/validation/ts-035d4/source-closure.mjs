import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const paths=['src/parser.ts','src/script-declarations.ts','src/script-observation.ts','src/script-observation-types.ts','src/script-observation-json.ts','tools/test262/script-driver-result.mjs','tools/test262/script-result.mjs','test/script-strict-parameter-dispatch.ts','tools/test262/script-strict-parameter-dispatch.test.mjs','docs/validation/ts-035d4-p/semantic-matrix.json','docs/validation/ts-035d4-p/wire-matrix.json','docs/validation/ts-035d4-p/future-controls.json'];
const rows=paths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
writeFileSync('docs/validation/ts-035d4/source-closure.json',JSON.stringify(rows,null,2)+'\n');
for(const path of ['fixtures/script-strict-parameter-dispatch/alpha.js','fixtures/script-strict-parameter-dispatch/beta.js'])assert.deepEqual(readFileSync(path),readFileSync(path.replace('fixtures/script-strict-parameter-dispatch','docs/validation/ts-035d4-p/inputs')));
console.log('Source closure and both exact runtime fixture bytes recorded');
