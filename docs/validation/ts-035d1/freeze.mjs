// Run only against the unchanged base Node build, before implementation.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse,parseDeclarationPlan,parseBoundedScriptDeclarationPlan,auditScriptReturns} from '../../../build/node/src/parser.js';
const design=JSON.parse(readFileSync('docs/validation/ts-035d-p/audit.json'));
const rows=design.rows.map(r=>{
 const unit={id:r.id,text:r.text},p=parse(r.text);
 return {id:r.id,text:r.text,expectedKind:r.future==='parameter'?'blocked':r.future,
 ordinary:{legacy:{error:p.error,rejection:p.rejection},returns:auditScriptReturns(r.text),declaration:parseDeclarationPlan(unit),bounded:parseBoundedScriptDeclarationPlan(unit)}};
});
writeFileSync('docs/validation/ts-035d1/frozen.json',JSON.stringify({base:'dbb1cf1',designSha256:createHash('sha256').update(readFileSync('docs/validation/ts-035d-p/audit.json')).digest('hex'),rows},null,2)+'\n');
console.log(rows.filter(r=>r.expectedKind==='eligible').map(r=>({id:r.id,length:r.text.length,conflict:r.ordinary.bounded.conflict})));
