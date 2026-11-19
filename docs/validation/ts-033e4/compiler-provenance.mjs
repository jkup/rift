// Read-only installed-package and publisher provenance collection. No install.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const lock=JSON.parse(readFileSync(join(root,'package-lock.json')));
const sha=b=>createHash('sha256').update(b).digest('hex');
const results={kind:'publisher metadata inspected; signatures NOT cryptographically verified; no compiler rebuild',packages:[],files:[]};
for(const name of ['scriptc','@scriptc/cli-win32-x64-msvc']){
    const url='https://registry.npmjs.org/'+name+'/0.4.7';
    const response=await fetch(url);assert.ok(response.ok);
    const metadata=await response.json();
    const installed=JSON.parse(readFileSync(join(root,'node_modules',name,'package.json')));
    assert.equal(installed.version,'0.4.7');assert.equal(metadata.version,installed.version);
    const entry=lock.packages['node_modules/'+name];
    assert.equal(entry.integrity,metadata.dist.integrity);
    const attestationUrl=metadata.dist.attestations.url;
    const attestationResponse=await fetch(attestationUrl);assert.ok(attestationResponse.ok);
    const attestation=await attestationResponse.json();
    const decoded=[];
    function walk(v){if(!v||typeof v!=='object')return;if(typeof v.payload==='string'&&v.payloadType==='application/vnd.in-toto+json')decoded.push(JSON.parse(Buffer.from(v.payload,'base64').toString('utf8')));for(const child of Object.values(v))walk(child);}
    walk(attestation);
    results.packages.push({url,name,version:metadata.version,gitHead:metadata.gitHead??null,integrity:metadata.dist.integrity,tarball:metadata.dist.tarball,lockIntegrity:entry.integrity,installed,attestationUrl,attestation,decoded});
}
for(const path of ['node_modules/scriptc/bin/scriptc.exe','node_modules/@scriptc/cli-win32-x64-msvc/dist/bin/scriptc.exe','node_modules/@scriptc/cli-win32-x64-msvc/dist/lib/runtime-sources/src/scr_json.c']){
    const bytes=readFileSync(join(root,path));results.files.push({path,bytes:bytes.length,sha256:sha(bytes)});
}
const r=spawnSync(join(root,'node_modules/scriptc/bin/scriptc.exe'),['--version'],{cwd:root,encoding:'utf8'});
results.version={status:r.status,stdout:r.stdout,stderr:r.stderr};assert.equal(r.status,0);assert.equal(r.stdout.trim(),'0.4.7');
writeFileSync(new URL('compiler-provenance.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results.packages.map(p=>({name:p.name,decoded:p.decoded})),null,2));
