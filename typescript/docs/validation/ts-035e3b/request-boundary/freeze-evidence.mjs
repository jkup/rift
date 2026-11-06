import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
const here=import.meta.dirname,previous=resolve(here,'..'),hash=b=>createHash('sha256').update(b).digest('hex');
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
const earlier=readdirSync(previous,{withFileTypes:true}).filter(e=>e.name!=='request-boundary').flatMap(e=>e.isDirectory()?files(join(previous,e.name)):[join(previous,e.name)]).map(p=>({path:p.slice(previous.length+1).replaceAll('\\','/'),sha256:hash(readFileSync(p))}));
for(const row of JSON.parse(readFileSync(join(previous,'alternative-evidence.json'))).files)assert.equal(hash(readFileSync(join(previous,row.path))),row.sha256,row.path);
writeFileSync(join(here,'prior-evidence-identities.json'),JSON.stringify(earlier,null,2)+'\n',{flag:'wx'});
const artifacts=files(here).filter(p=>!['artifacts.json','verification.json'].includes(p.slice(here.length+1))).map(p=>({path:p.slice(here.length+1).replaceAll('\\','/'),sha256:hash(readFileSync(p))}));
writeFileSync(join(here,'artifacts.json'),JSON.stringify(artifacts,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({priorEvidence:earlier.length,designArtifacts:artifacts.length}));
