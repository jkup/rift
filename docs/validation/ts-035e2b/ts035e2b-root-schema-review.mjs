import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {prepareScriptSelection,inspectScriptSelection} from '../tools/test262/script-plan.mjs';
const source=readFileSync('tools/test262/script-ledger.mjs','utf8');
const spec="'./script-plan.mjs'";
if(source.split(spec).length!==2)throw Error('import count');
writeFileSync('build/ts035e2b-root-schema-copy.mjs',source.replace(spec,JSON.stringify(pathToFileURL(resolve('tools/test262/script-plan.mjs')).href))+'\nexport {validateSelection};\n');
const {validateSelection}=await import('./ts035e2b-root-schema-copy.mjs');
const old=JSON.parse(readFileSync('docs/validation/ts-035e2a/selection-literals.json'))[0];
const selection=inspectScriptSelection(await prepareScriptSelection({root:'C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075',revision:old.revision,lane:'node',paths:old.selection.files.map(f=>f.path)}));
const rows=[];
for(const [name,edit] of [['baseline',()=>{}],['wrong-revision-with-slots',s=>s.revision='wrong'],['empty-host',s=>s.policy.host=''],['empty-platform',s=>s.policy.platform='']]){const s=structuredClone(selection);edit(s);try{validateSelection(s);rows.push({name,accepted:true});}catch(e){rows.push({name,accepted:false,error:e.message});}}
writeFileSync('build/ts035e2b-root-schema-review.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
