import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,previous=join(here,'../correction'),sha=b=>createHash('sha256').update(b).digest('hex');
const json=p=>JSON.parse(readFileSync(p));
const m=json(join(previous,'proposal-manifest.json')),d=json(join(previous,'dispatch-descriptor.json'));
m.base='ecaf687894b0109be9493d9ff7dd3820bbca55a0';m.status='decimal-guard-corrected-design-awaiting-review';
for(const f of [...m.replacements,...m.additions])f.proposal=f.target==='src/script-observation.ts'?'proposals/script-observation.ts':'../correction/'+f.proposal;
const row=m.replacements.find(f=>f.target==='src/script-observation.ts'),b=readFileSync(join(here,row.proposal));row.sha256=sha(b);
const member=d.data.sourceFiles.find(f=>f.path==='src/script-observation.ts');member.sha256=row.sha256;member.bytes=b.length;
d.sha256=sha(JSON.stringify(d.data));m.sourceDescriptorSha256=d.sha256;
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);}
const preservation=walk(previous).sort().map(p=>({path:relative(previous,p).replaceAll('\\','/'),sha256:sha(readFileSync(p))}));
for(const [p,x] of [['proposal-manifest.json',m],['dispatch-descriptor.json',d],['prior-preservation.json',{commit:m.base,files:preservation,documentSha256:sha(readFileSync(join(here,'original/script-conformance-preflight.md')))}]])writeFileSync(join(here,p),JSON.stringify(x,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({priorArtifacts:preservation.length,changedProposalSha256:row.sha256,sourceDescriptorSha256:d.sha256}));
