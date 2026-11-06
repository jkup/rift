import {readFileSync,writeFileSync} from 'node:fs';
const here=new URL('./',import.meta.url);
const rows=JSON.parse(readFileSync(new URL('../argv-negatives.json',here))).map(r=>({
 id:r.id,argv:r.argv,error:r.error,
 setupClass:r.id==='late-role-before-read'?'explicit-missing-compound':['short','extra','source-path','result-path'].includes(r.id)?'malformed-layout':'ordinary-controls',
 files:[...new Set(r.argv.filter(a=>a.startsWith('SOURCE-')||a.startsWith('MISSING-')))].map(token=>({token,present:!token.startsWith('MISSING-'),text:token.startsWith('MISSING-')?null:'"use strict";\n0;'})),
 expectedDriver:{exitCode:70,stdout:'',stderr:'Script observation driver fault\n',childPresent:false},
 claim:'Generic driver fault only; no zero-read/Realm or exact-precedence claim'
}));
writeFileSync(new URL('driver-negative-cases.json',here),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(rows.reduce((o,r)=>(o[r.setupClass]=(o[r.setupClass]??0)+1,o),{})));
