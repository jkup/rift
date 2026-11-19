import assert from 'node:assert/strict';
import { readFileSync as read, writeFileSync as write, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const here = fileURLToPath(new URL('./', import.meta.url));
const root = resolve(here, '../../..');
const prior = join(root, 'docs/validation/ts-035e3e-p');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const save = (name, value) => write(join(here, name), JSON.stringify(value, null, 2) + '\n');
function inventory(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const name = prefix + entry.name;
    assert.ok(!entry.isSymbolicLink(), name);
    return entry.isDirectory() ? inventory(join(dir, entry.name), name + '/') :
      [{ path: name, sha256: sha(read(join(dir, entry.name))) }];
  });
}
const before = inventory(prior);
save('prior-evidence-before.json', before);
const stages = [];
function run(name, file, args = []) {
  const result = spawnSync(process.execPath, [file, ...args], { cwd: root, encoding: 'utf8', windowsHide: true });
  const record = { name, command: [process.execPath, file, ...args], status: result.status,
    signal: result.signal, error: result.error?.message ?? null, stdout: result.stdout, stderr: result.stderr };
  save(name + '.json', record);
  stages.push(record);
  save('stages.json', stages);
  assert.equal(result.error, undefined, name);
  assert.equal(result.signal, null, name);
  assert.equal(result.status, 0, name);
  console.log(name + ': ' + result.stdout.trim());
}
run('verify-before', join(prior, 'verify.mjs'), ['--implemented']);
run('installed-test', join(root, 'tools/test262/script-host-services.test.mjs'));

// Preserve the accepted mutation operators and literal oracles. Only redirect
// reads to frozen evidence/installed source and writes to this new directory.
const oldOffline = read(join(prior, 'offline.mjs'), 'utf8');
const mutationStart = oldOffline.indexOf('const mutants=[');
const witnessEnd = oldOffline.indexOf('const mutations=[');
assert.ok(mutationStart > 0 && witnessEnd > mutationStart);
const descriptorEnd = oldOffline.indexOf('// Independently pinned lists');
const prelude = `import assert from 'node:assert/strict';
import {readFileSync as read,writeFileSync as write} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
const here=fileURLToPath(new URL('./',import.meta.url));
const prior=fileURLToPath(new URL('../ts-035e3e-p/',import.meta.url));
const root=fileURLToPath(new URL('../../../',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const load=p=>JSON.parse(read(join(prior,p)));
const save=(p,x)=>write(join(here,p),JSON.stringify(x,null,2)+'\\n');
const expected=load('descriptor-literals.json');
const source=read(join(root,'tools/test262/script-host-services.mjs'),'utf8');
`;
let tail = oldOffline.slice(witnessEnd);
tail = tail.replace('console.log(run.stdout.trim());', '');
write(join(here, 'installed-mutants.mjs'), prelude + oldOffline.slice(mutationStart, descriptorEnd) +
  "// Frozen accepted witness: data controls only, not current provenance.\nconst witness=load('identity-witness.json');\n" + tail);
run('installed-mutants', join(here, 'installed-mutants.mjs'));
// Same relative depth: this unmodified reduction reads the installed TS source.
write(join(here, 'construction-probe.mjs'), read(join(prior, 'construction-probe.mjs')));
assert.equal(sha(read(join(here, 'construction-probe.mjs'))), sha(read(join(prior, 'construction-probe.mjs'))));
run('installed-construction', join(here, 'construction-probe.mjs'));
run('additional-controls', join(here, 'additional-controls.mjs'));
run('verify-after', join(prior, 'verify.mjs'), ['--implemented']);
assert.deepEqual(inventory(prior), before, 'all prior E3e-P bytes and paths preserved');
save('preservation-result.json', { priorEvidenceFiles: before.length, unchanged: true,
  protectedBaseline: 9198, additions: 2, replacements: 0, builds: 0, guestLaunches: 0 });
console.log('All six stages pass; all prior evidence unchanged.');
