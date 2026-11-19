// Refresh only this unaccepted candidate after adding explicit oracle pins.
// The pre-pin candidate files are retained under original/; history is untouched.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(readFileSync(join(here,p)));
const m=read('proposal-manifest.json'),d=read('dispatch-descriptor.json');
for(const f of [...m.replacements,...m.additions])f.sha256=sha(readFileSync(join(here,f.proposal)));
for(const f of [...m.replacements,...m.additions]){const row=d.data.sourceFiles.find(r=>r.path===f.target);row.sha256=f.sha256;row.bytes=readFileSync(join(here,f.proposal)).length;}
d.sha256=sha(JSON.stringify(d.data));m.sourceDescriptorSha256=d.sha256;
for(const [path,value] of [['proposal-manifest.json',m],['dispatch-descriptor.json',d]])writeFileSync(join(here,path),JSON.stringify(value,null,2)+'\n');
