import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const rows=JSON.parse(readFileSync('docs/validation/ts-035d1/frozen.json')).rows;
mkdirSync('test/fixtures/script-strict-rule-audit',{recursive:true});
for(const [i,n]of ['a','b'].entries())writeFileSync('test/fixtures/script-strict-rule-audit/'+n+'.js',rows.find(r=>r.id==='R'+i).text);
const p='tools/build-native.mjs',s=readFileSync(p,'utf8');
writeFileSync(p,s.replace('["test/script-observation.ts", "script-observation"]])','["test/script-observation.ts", "script-observation"], ["test/script-strict-rule-audit.ts", "script-strict-rule-audit"]])'));
