// One-shot baseline capture. Refuse to overwrite frozen expectations using the implementation.
import * as baselineParser from '../../../build/node/src/parser.js';
if ('auditBoundedScriptStrictParameters' in baselineParser) throw new Error('requires pre-D3 build');
import {readFileSync,writeFileSync} from 'node:fs';
import {parseDeclarationPlan,parseBoundedScriptDeclarationPlan,parseBoundedScriptPreparation} from '../../../build/node/src/parser.js';
const rows=JSON.parse(readFileSync('docs/validation/ts-035d3-p/future-matrix.json'));
const current=JSON.parse(readFileSync('docs/validation/ts-035d3-p/current-audit.json'));
const controls=JSON.parse(readFileSync('docs/validation/ts-035d3-p/grammar-controls.json')).controls;
const nodes=()=>({assignmentNameEligible:new Map(),source:{text:''},body:[],scopes:new Map(),declarations:new Map()});
const snap=n=>JSON.stringify({source:n.source,body:n.body,scopes:[...n.scopes].map(([id,v])=>({id,node:v.node,body:v.body})),declarations:[...n.declarations].map(([id,v])=>({id,node:v.node,initializer:v.initializer})),assignments:[...n.assignmentNameEligible].map(([node,eligible])=>({node,eligible}))} );
for(const row of rows){
 row.ordinary=current.rows.find(x=>x.id===row.id).current;
 row.nodes=[parseDeclarationPlan,parseBoundedScriptDeclarationPlan,parseBoundedScriptPreparation].map(f=>{const n=nodes();f({id:row.id,text:row.text},n);return snap(n)});
 const c=controls.find(x=>x.id===row.id);if(c){row.expected.diagnostic=c.current.diagnostic;}
}
writeFileSync('docs/validation/ts-035d3/frozen.json',JSON.stringify(rows,null,2)+'\n');
console.log('frozen',rows.length,'rows; pre-change build node associations');
