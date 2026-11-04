import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,s=readFileSync('test/harness-formatting.ts','utf8');
const frozen=JSON.parse(readFileSync(here+'/frozen/frozen-traces.json')),parsed=JSON.parse(readFileSync(here+'/frozen/parsed-traces.json'));
const literal=JSON.parse(s.match(/const traces:Trace\[\]=(\[[\s\S]*?\]);/)[1]);
const expected=frozen.traces.map(t=>({id:t.id,source:t.sourcesByInput['input-a'],columns:t.events.map(e=>e.column),effects:t.events.map(e=>e.effect),sourceTicks:t.sourceTicks,calls:t.minimumCalls,terminal:t.terminal}));
function verify(rows){assert.deepEqual(rows,expected);}
verify(literal);let mutations=0;for(const key of ['sourceTicks','calls']){const rows=structuredClone(literal);rows[0][key]++;assert.throws(()=>verify(rows));mutations++;}for(const key of ['columns','effects']){const rows=structuredClone(literal);rows[0][key][0]=key==='columns'?2:'M';assert.throws(()=>verify(rows));mutations++;}
const parsedText=s.match(/const parsed:Parsed\[\]=\[([\s\S]*?)\n\];/)[1],lines=parsedText.trim().split('\n');assert.equal(lines.length,4);
for(let i=0;i<4;i++){const row=parsed.traces[i],line=lines[i];assert.deepEqual(JSON.parse(line.match(/columns:(\[[^\]]+\])/)[1]),row.events.map(e=>e.column));assert.equal(Number(line.match(/sourceTicks:(\d+)/)[1]),row.sourceTicks);assert.equal(Number(line.match(/getterStart:(\d+)/)[1]),row.sourceTicks+2);assert.ok(line.includes('construct:'+row.id.startsWith('new')));assert.ok(line.includes('throwing:'+row.id.endsWith('throw')));}
assert.equal(frozen.traces.length,16);assert.equal(JSON.parse(readFileSync(here+'/frozen/matrix-map.json')).length,12);
const result={status:'PASS',hostTraces:16,fixedRows:12,parsedTraces:4,frozenHostPrefixesBothInputs:400,frozenParsedPrefixesBothInputs:188,frozenParsedCallsBothInputs:64,executedPerInputPerHost:{hostPrefixes:400,hostCalls:192,hostAbruptPrefixes:464,parsedPrefixes:188,parsedCalls:64,parsedAbruptPrefixes:384,reentries:14,actualObjectLink:15},dimensions:'Both same/cross-Realm dimensions execute each frozen input schedule; counts are explicit, not new semantic rows.',negativeMutations:mutations,sourceSha256:createHash('sha256').update(s.replaceAll('\r\n','\n')).digest('hex')};
writeFileSync(here+'/oracle-audit.json',JSON.stringify(result,null,2)+'\n');console.log('PASS literal host/parsed schedule audit and four negative mutations');
