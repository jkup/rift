import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const original = readFileSync('cpp-core.mjs', 'utf8');
const direct = original.replace('import { execSync } from "child_process";', 'import { execFileSync } from "child_process";')
  .replace('execSync(`${RUNTIME_EXECUTABLE} ${tempFile}`, {', 'execFileSync(RUNTIME_EXECUTABLE, [tempFile], {');
if (direct.includes('execSync(') || !direct.includes('execFileSync(RUNTIME_EXECUTABLE, [tempFile], {')) throw new Error('subprocess replacement failed');
writeFileSync('cpp-direct-core.mjs', direct, {flag:'wx'});
writeFileSync('cpp-direct-inputs.json', JSON.stringify({
  ...JSON.parse(readFileSync('cpp-inputs.json','utf8')),
  label:'Original C++ classification and harness, direct executable spawn to terminate timed-out children',
  adaptedCoreSha256:createHash('sha256').update(direct).digest('hex'),
  priorAttempt:'cpp-results.jsonl: interrupted after detecting orphan processes from shell timeout handling',
},null,2), {flag:'wx'});
