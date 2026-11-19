import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const source = readFileSync('../../../scripts/test262/core.js', 'utf8');
const adapted = source
  .replace('export const TEST262_DIR = path.join(PROJECT_ROOT, "test262");', 'export const TEST262_DIR = "/var/tmp/rift-test262-baseline-91c7075";')
  .replace('export const RUNTIME_EXECUTABLE = path.join(PROJECT_ROOT, "build/rift");', 'export const RUNTIME_EXECUTABLE = "/mnt/c/Users/jonku/code/rift/build/rift";');
if (adapted === source || !adapted.includes('TEST262_DIR = "/var/tmp/') || !adapted.includes('RUNTIME_EXECUTABLE = "/mnt/')) throw new Error('path adaptation failed');
writeFileSync('cpp-core.mjs', adapted, {flag: 'wx'});
const harness = readFileSync('../../../scripts/test262/harness-compat.js');
writeFileSync('harness-compat.js', harness, {flag: 'wx'});
writeFileSync('cpp-inputs.json', JSON.stringify({
  label: 'Original C++ runner semantics, with corpus and executable paths adapted only',
  coreSha256: createHash('sha256').update(source).digest('hex'),
  adaptedCoreSha256: createHash('sha256').update(adapted).digest('hex'),
  harnessSha256: createHash('sha256').update(harness).digest('hex'),
  executableSha256: createHash('sha256').update(readFileSync('../../../build/rift')).digest('hex'),
}, null, 2), {flag: 'wx'});
