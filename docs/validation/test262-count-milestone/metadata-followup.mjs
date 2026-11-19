import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import YAML from 'yaml';
import {runSource as runNode} from './node-case.mjs';
import {runSource as runNative} from './native-case.mjs';
const root='/var/tmp/rift-test262-baseline-91c7075';
const paths=JSON.parse(readFileSync('cpp-selection.json','utf8'));
const results=[];
for(const path of paths) {
  const bytes=readFileSync(join(root,path));
  const code=bytes.toString('utf8');
  const match=code.match(/\/\*---([\s\S]*?)---\*\//);
  if(!match || !match[1].includes('\r')) continue;
  const metadata=YAML.parse(match[1].replace(/\r\n?/g,'\n'));
  const node=runNode(code,metadata),native=runNative(code,metadata);
  const agrees=JSON.stringify(node)===JSON.stringify(native);
  results.push({path,sha256:createHash('sha256').update(bytes).digest('hex'),node,native,agrees});
  console.log(JSON.stringify({path,node:node.status,native:native.status,agrees}));
}
writeFileSync('metadata-followup.json',JSON.stringify({scanned:paths.length,normalization:'YAML frontmatter CR/CRLF only; guest source unchanged',results},null,2),{flag:'wx'});
process.exitCode=results.every(r=>r.agrees)?0:1;
