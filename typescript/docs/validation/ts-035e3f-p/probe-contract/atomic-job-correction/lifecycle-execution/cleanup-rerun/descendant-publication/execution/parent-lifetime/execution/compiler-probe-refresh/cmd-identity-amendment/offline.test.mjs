// Pure data controls only. Never calls the native observation provider or run().
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {validateCmdIdentity} from './cmd-identity.mjs';
const here=import.meta.dirname,read=n=>JSON.parse(readFileSync(join(here,n))),literal=read('identity-literal.json'),c=read('contract.json');
validateCmdIdentity(literal,c.cmd,c.cmdSha256);
assert.deepEqual(literal.records.map(r=>[r.path,r.dev,r.ino,r.nlink,r.bytes,r.sha256]),[
 ['C:\\WINDOWS\\system32\\cmd.exe','1045235170','562949954062573','2','339968','15cd209c995b7d3009c91ca40892d5b8f1fb162f3e5f10716642ea278e8e0d7b'],
 ['C:\\Windows\\WinSxS\\amd64_microsoft-windows-commandprompt_31bf3856ad364e35_10.0.26100.9549_none_26c71961ca689840\\cmd.exe','1045235170','562949954062573','2','339968','15cd209c995b7d3009c91ca40892d5b8f1fb162f3e5f10716642ea278e8e0d7b']
 ]);
const mutations=[['missing-name',s=>s.records.pop()],['extra-name',s=>s.records.push(structuredClone(s.records[0]))],['both-wrong-identity',s=>s.records.forEach(r=>r.ino='99')],['provider-error',s=>s.errors.push({message:'original read failure'})]];
for(let i=0;i<2;i++){
 mutations.push(['different-alias-'+i,s=>s.records[i].path='C:\\other\\cmd.exe'],['redirected-file-'+i,s=>s.records[i].canonical='C:\\other\\cmd.exe'],['extra-link-'+i,s=>s.records[i].nlink='3'],['identity-mismatch-'+i,s=>s.records[i].ino='1'],['device-mismatch-'+i,s=>s.records[i].dev='1'],['hash-mismatch-'+i,s=>s.records[i].sha256='0'.repeat(64)],['size-mismatch-'+i,s=>s.records[i].bytes='339969']);
 for(let j=0;j<literal.records[i].ancestry.length;j++){
  mutations.push(['native-reparse-'+i+'-'+j,s=>s.records[i].ancestry[j].attributes|=0x400],['redirected-ancestor-'+i+'-'+j,s=>s.records[i].ancestry[j].canonical='C:\\redirected'],['symlink-'+i+'-'+j,s=>s.records[i].ancestry[j].symbolicLink=true],['wrong-kind-'+i+'-'+j,s=>s.records[i].ancestry[j].kind='other']);
 }
 for(const key of Object.keys(literal.records[i]))mutations.push(['missing-'+i+'-'+key,s=>{delete s.records[i][key];}]);
}
const rejected=[];for(const [name,mutate]of mutations){const s=structuredClone(literal);mutate(s);assert.throws(()=>validateCmdIdentity(s,c.cmd,c.cmdSha256),name);rejected.push(name);}
assert.throws(()=>validateCmdIdentity(literal,'C:\\other\\cmd.exe',c.cmdSha256));assert.throws(()=>validateCmdIdentity(literal,c.cmd,'0'.repeat(64)));
const result={kind:'inert-cmd-identity-data-controls',fullLiteralRecords:2,ancestryEntries:9,negativeControls:rejected,wrongContractArguments:2,nativeQueries:0,runnerInvocations:0,compilerInvocations:0,csharpCompilations:0};
writeFileSync(join(here,'offline-results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,negativeControls:rejected.length}));
