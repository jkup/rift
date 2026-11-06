import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=fileURLToPath(new URL('./',import.meta.url)),root=resolve(here,'../../../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const paths=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8',maxBuffer:10000000}).split('\0').filter(Boolean);
const save=(n,v)=>writeFileSync(resolve(here,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const protectedFiles=paths.filter(p=>!['typescript/TASKS.md','typescript/COORDINATION.md'].includes(p)&&!p.startsWith('typescript/docs/validation/ts-035e3c-p/')&&p!=='typescript/docs/script-execution-selection.md').map(path=>({path,sha256:hash(readFileSync(resolve(root,path)))}));
if(!existsSync(resolve(here,'preservation.json')))save('preservation.json',{base:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),files:protectedFiles});
const pattern=/script-(?:execution|plan|ledger|capabilities|observe|observation|producer|result|driver-result)|planCorpus|frozenManifest|harnessPaths|reconstructScriptDebts|composeScriptEnvelope|prepareScriptSelection|assertScriptSelectionCurrent/;
const inventory=[],historical=[];
for(const path of paths.filter(p=>p.startsWith('typescript/')&&/\.(?:mjs|cjs|ts|json)$/.test(p))){
 const bytes=readFileSync(resolve(root,path)),source=bytes.toString('utf8');
 if(/^typescript\/(src|tools|test)\//.test(path)&&/\.(mjs|cjs|ts)$/.test(path))inventory.push({path,sha256:hash(bytes),imports:[...source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]),exports:source.split(/\r?\n/).flatMap((line,i)=>/^export /.test(line)?[{line:i+1,text:line}]:[]),references:source.split(/\r?\n/).flatMap((line,i)=>pattern.test(line)?[{line:i+1,text:line}]:[])});
 else if(path.startsWith('typescript/docs/validation/')&&/\.(mjs|cjs|ts)$/.test(path)&&pattern.test(source))historical.push({path,sha256:hash(bytes),references:source.split(/\r?\n/).flatMap((line,i)=>pattern.test(line)?[{line:i+1,text:line}]:[])});
}
save('closure-audit.json',{claim:'Complete tracked source/test/tool inventory; references are lexical audit clues, not an execution certification closure.',inventory,historical});
const build=readFileSync(resolve(root,'typescript/tools/build-native.mjs'),'utf8');
save('native-entrypoints.json',[...build.matchAll(/\["((?:src|test)\/[^"\n]+\.ts)", "([^"\n]+)"\]/g)].map(m=>({entry:m[1],binary:m[2]})));
const additional=paths.filter(p=>p.startsWith('typescript/')&&/\.(js|ps1|py|sh)$/.test(p)).map(path=>{
 const bytes=readFileSync(resolve(root,path));return {path,sha256:hash(bytes),references:bytes.toString('utf8').split(/\r?\n/).flatMap((line,i)=>/script-(?:plan|ledger|capabilities|observe|observation|producer|result|driver-result)|planCorpus|prepareScriptSelection/.test(line)?[{line:i+1,text:line}]:[])};
});
save('consumer-addendum.json',{claim:'Supplementary exhaustive tracked JS/PowerShell/Python/shell inventory, including zero-reference files',files:additional});
console.log(JSON.stringify({protected:protectedFiles.length,source:inventory.length,historical:historical.length}));
