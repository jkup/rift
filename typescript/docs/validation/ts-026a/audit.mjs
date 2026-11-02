import fs from 'node:fs';
import { probeVerdict } from '../../../tools/probe-verdict.mjs';
const directory='docs/validation/ts-026a/';
const builds=JSON.parse(fs.readFileSync(directory+'native-build-results.json','utf8'));
const baselineBuilds=JSON.parse(fs.readFileSync('docs/validation/ts-025a/readability/native-build-results.json','utf8'));
const success={status:0,signal:null,error:null,stdout:''};
const gates=builds.map(row=>({entry:row.entry, verdict:probeVerdict({...row,node:success,native:success}), staticStatements:Number(row.coverage.stdout.match(/compile statically\s+(\d+)/)?.[1]), dynamic:Number(row.coverage.stdout.match(/in dynamic tier\s+(\d+)/)?.[1]??0)}));
if(gates.length!==28 || gates.some(row=>row.verdict!=='PASS')) throw Error('native gates');
for(const old of baselineBuilds) if(!builds.some(row=>row.entry===old.entry)) throw Error('missing gate '+old.entry);
const lanes=[];
for(const lane of ['node','native']) {
 const rows=JSON.parse(fs.readFileSync(directory+'guest-'+lane+'-results.json','utf8'));
 const oldRows=JSON.parse(fs.readFileSync('docs/validation/ts-025a/readability/guest-'+lane+'-results.json','utf8'));
 if(rows.length!==182 || rows.some(row=>row.verdict!=='PASS')) throw Error('guest results '+lane);
 for(const old of oldRows) {
  const current=rows.find(row=>row.name===old.name);
  if(!current || JSON.stringify(current.expected)!==JSON.stringify(old.expected)) throw Error('changed baseline '+old.name);
 }
 lanes.push({lane,passed:rows.length,baselinePreserved:oldRows.length,added:rows.filter(row=>!oldRows.some(old=>old.name===row.name)).map(row=>row.name)});
}
const report={gates,baselineGatesPreserved:baselineBuilds.length,lanes};
fs.writeFileSync(directory+'preservation-and-coverage.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
