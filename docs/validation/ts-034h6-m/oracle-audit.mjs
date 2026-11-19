import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,source=readFileSync(here+'/../../../test/harness-map-default.ts','utf8');
const frozen=JSON.parse(readFileSync(here+'/frozen/frozen-traces.json'));
const terminal={'normal []':'empty','normal [payload]':'value','callback TypeError':'callback','language TypeError':'invalid','unsupported map-species':'custom','exact abrupt':'abrupt','language RangeError':'range','normal [hole]':'hole'};
for(const t of frozen.traces){const line=source.split('\n').find(l=>l.includes('{id:"'+t.id+'",'));assert.ok(line);const expected=`{id:"${t.id}",columns:${JSON.stringify(t.columns)},effects:${JSON.stringify(t.effectsAfterTick)},terminal:"${terminal[t.terminal]}",calls:${t.minimumCalls}}`;assert.ok(line.includes(expected),t.id);}
assert.ok(source.includes('total=throwing?7:8,columns=throwing?[1,1,7,1,1,14,20]:[1,1,7,1,1,14,21,1]'));
assert.ok(source.includes('!throwing&&done>=7&&'));assert.ok(source.includes('!throwing&&done>=8)'));assert.ok(source.includes('limit>=3&&limit<7'));
const matrix=JSON.parse(readFileSync(here+'/frozen/matrix.json'));assert.equal(matrix.rows.length,54);
const prefixes=JSON.parse(readFileSync(here+'/frozen/prefix-controls.json')),calls=JSON.parse(readFileSync(here+'/frozen/call-controls.json'));assert.equal(prefixes.controls.length,308);assert.equal(calls.controls.length,224);
const report={traces:14,frozenSemanticRows:54,frozenPrefixes:308,frozenCallControls:224,parsedGetterAmendment:'approved; return8/throw7; instantiation4-5/body6-7',driverSha256:createHash('sha256').update(source).digest('hex'),claim:'source comparison, not runtime mutation proof'};
writeFileSync(here+'/oracle-audit.json',JSON.stringify(report,null,2)+'\n');console.log('PASS original 14 literal schedules and approved parsed-getter amendment');
