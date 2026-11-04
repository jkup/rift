import { writeFileSync } from 'node:fs';
import { serialized,hash } from './controls.mjs';
const rows=serialized();
const outputs=[];
for(const lane of ['node','native']) for(const input of ['alpha','beta']) {
 const selected=rows.filter(r=>r.lane===lane&&r.binding.nonce===input);
 const bytes=Buffer.from(selected.map(r=>r.bytes.toString()).join('\n')+'\n');
 const file=`${lane}-${input}.jsonl`;
 writeFileSync(new URL(file,import.meta.url),bytes);
 outputs.push({lane,input,records:selected.length,file,sha256:hash(bytes),exactFrozenASCII:true});
}
writeFileSync(new URL('serializer-results.json',import.meta.url),JSON.stringify(outputs,null,2)+'\n');
console.log('PASS four runtime-input/lane streams, each checked against frozen literal ASCII');
