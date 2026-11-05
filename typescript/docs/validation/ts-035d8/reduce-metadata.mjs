import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {parseBoundedScriptPreparation} from '../../../build/node/src/parser.js';
const rows=JSON.parse(readFileSync('docs/validation/ts-035d8-p/future-controls.json')).metadataRows;
const affected=rows.filter(r=>r.expected.kind==='complete');assert.equal(affected.length,9);
const result=affected.map(r=>{const actual=parseBoundedScriptPreparation(r.unit,{source:{text:''},body:[],scopes:new Map(),declarations:new Map(),assignmentNameEligible:new Map()});assert.equal(r.unit.id,'same');assert.equal(r.expected.unit.id,'valid-ready');assert.equal(actual.unit.id,'same');const proposed=structuredClone(r.expected);proposed.unit.id=r.unit.id;assert.deepEqual(actual,proposed);return {variant:r.variant,negative:r.negative,request:r.unit,expected:r.expected,actual,proposed};});
writeFileSync('docs/validation/ts-035d8/metadata-reduction.json',JSON.stringify({status:'Pending coordinator review; no fixture or validator correction applied',affected:result},null,2)+'\n');console.log('Nine frozen ready metadata rows differ only by request unit ID; correction pending review');
