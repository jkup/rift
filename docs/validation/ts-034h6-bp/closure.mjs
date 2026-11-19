import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const here=import.meta.dirname,rows=JSON.parse(readFileSync(join(here,'current-sites.json')));
const paths=['builtins/error.ts','builtins/object.ts','runtime.ts','realm.ts','conversion.ts','primitive-conversion.ts','object-conversion.ts','delete-reference.ts','global-environment.ts','script-environment.ts','script-global-declarations.ts','script-execution-internal.ts','array-object.ts','array-like.ts','array-map.ts','builtins/array.ts','builtins/boolean.ts','builtins/number.ts','builtins/string.ts','builtins/symbol.ts','builtins/function.ts','builtins/restricted-function.ts'];
const helpers='toNumber toString toUint32 toIntegerOrInfinity toLength thisNumberValue thisStringValue thisBooleanValue thisSymbolValue'.split(' ');
const source=rows.filter(r=>r.path.startsWith('typescript/src/')&&new RegExp('\\b'+r.name+'\\s*\\(').test(r.text));
const sites=source.map(r=>{
 const p=r.path.slice('typescript/src/'.length);let action='',realm='context.realm';
 if(helpers.includes(r.name)){
  if(r.text.startsWith('export function')){action='append mandatory realm: Realm | null; no default';realm='explicit argument';}
  else {action='append Realm at call';if(p==='conversion.ts'&&r.name!=='toString')realm='realm (numeric wrapper argument)';
   if(p==='array-object.ts'&&[80,82].includes(r.line))realm='null (trusted bootstrap only)';
   if(p==='script-execution-internal.ts')realm='this.context.realm';}
 }else if(r.name==='createMutableBinding'){
  if(p==='script-environment.ts'||p==='script-execution-internal.ts'){action='UNCHANGED local binding signature/call; host invariant on duplicate';realm='not applicable';}
  else if(p==='global-environment.ts'){action='append mandatory realm: Realm | null';realm='explicit argument';}
  else{assert.equal(p,'script-global-declarations.ts');action='append context.realm';}
 }else if(r.name==='failure'){
  if(p==='runtime.ts'&&r.line===84){action='UNCHANGED synthetic failure API';realm='none';}
  else if(p==='runtime.ts'&&[88,92].includes(r.line)){action='UNCHANGED resource/unsupported wrapper';realm='none';}
  else if(p==='array-object.ts'&&r.line===85){action='UNCHANGED bootstrap RangeError before host misuse';realm='none';}
  else if(p==='script-execution-internal.ts'&&r.line===698){action='UNCHANGED legacy-only duplicate binding';realm='legacy only';}
  else {action='languageFailure at originating site; diagnostic/origin unchanged';
   if(p==='conversion.ts'||['builtins/boolean.ts','builtins/string.ts','builtins/symbol.ts'].includes(p)||(p==='builtins/number.ts'&&r.line===41)||(p==='global-environment.ts'&&r.line===20))realm='realm (mandatory argument)';
   if(p==='script-execution-internal.ts')realm='this.context.realm';}
 }
 assert.ok(action,'unclassified '+JSON.stringify(r));
 if(!action.startsWith('UNCHANGED'))assert.ok(paths.includes(p),'unowned '+p);
 return {...r,action,realm};
});
const producers=sites.filter(r=>r.action.startsWith('languageFailure'));
assert.equal(producers.length,50);
const globals=rows.filter(r=>r.path.startsWith('typescript/test/')&&r.name==='createMutableBinding');
const localFiles={'script-environment.ts':[29,35,44,73,115,144],'script-function-setup.ts':[201,231,232],'property-accessors.ts':[297]};
const testGlobals=globals.map(r=>({...r,action:localFiles[r.path.split('/').at(-1)]?.includes(r.line)?'UNCHANGED local binding':'EXACT rendered global signature/call migration'}));
writeFileSync(join(here,'closure.json'),JSON.stringify({status:'audited current source; proposed APIs unimplemented',paths,sites,testGlobals,languageProducers:producers.length},null,2)+'\n');
console.log(JSON.stringify({productionSites:sites.length,languageProducers:producers.length,globalTestMentions:testGlobals.length,ownedPaths:paths.length}));
