// Run from typescript; preserves baseline code/assertions and compares actual
// old expected-result records, not just host agreement or aggregate counts.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { probeVerdict } from '../../../tools/probe-verdict.mjs';
const base = '71e4b63';
const git = args => execFileSync('git', args, { encoding: 'utf8' });
const read = path => readFileSync(path, 'utf8');
const normalized = s => s.replaceAll('\r\n','\n');
const before = p => git(['show', `${base}:typescript/${p}`]);
const json = p => JSON.parse(read(p));
const files = git(['ls-tree','-r','--name-only',base,'--','src','test','tools','probes','package.json','package-lock.json','tsconfig.json']).trim().split('\n');
const changed = ['tools/test262/result.mjs','tools/test262/fixtures.mjs','tools/build-native.mjs','package.json'];
for (const file of files) if (!changed.includes(file)) assert.equal(normalized(read(file)), normalized(before(file)), file);
assert.equal(normalized(read('tools/test262/fixtures.mjs')), normalized(before('tools/test262/fixtures.mjs').replace("harnessValidated: stage === 'test'", "harnessValidated: stage === 'test' && mode === 'conformance'")));
assert.equal(normalized(read('tools/test262/result.mjs')), normalized(before('tools/test262/result.mjs').replace(
  "(e.stage === 'test' && !e.harnessValidated && i.variant !== 'raw') ||",
  "(i.mode === 'conformance' && e.stage === 'test' && !e.harnessValidated && i.variant !== 'raw') ||\n      (i.mode !== 'conformance' && (n.harness.length !== 0 || e.harnessValidated)) ||")));
assert.equal(normalized(read('tools/build-native.mjs').replace(', ["src/observation-driver.ts", "observation-driver"], ["test/observation-serialization.ts", "observation-serialization"]', '')), normalized(before('tools/build-native.mjs')));
const pkg = json('package.json'); delete pkg.scripts['test:observations']; assert.deepEqual(pkg, JSON.parse(before('package.json')));
for (const lane of ['node','native']) {
  const old = json(`docs/validation/ts-031b-a/guest-${lane}-results.json`), current = json(`build/guest-${lane}-results.json`);
  assert.equal(old.length, 212); assert.equal(current.length, 212);
  for (const previous of old) {
    const actual = current.find(x => x.name === previous.name);
    assert.deepEqual(actual.expected, previous.expected); assert.equal(actual.verdict, 'PASS');
    for (const k of ['status','signal','error','stdout','stderr']) assert.deepEqual(actual[k],previous[k],`${lane} ${previous.name} ${k}`);
  }
}
const gates = json('build/native-build-results.json');
assert.equal(gates.length, 35);
assert.deepEqual(gates.slice(0,33).map(x=>x.entry), json('docs/validation/ts-031b-a/native-build-results.json').map(x=>x.entry));
const success = { status: 0, signal: null, error: null, stdout: '' };
const coverage = gates.map(g => {
  assert.equal(probeVerdict({ ...g, node: success, native: success }), 'PASS', g.entry);
  return { entry: g.entry, static: Number(g.coverage.stdout.match(/statements analyzed\s+(\d+)/)[1]), dynamic: 0 };
});
const sources = files.filter(p=>p.startsWith('src/'));
for (const p of sources) { const target = 'build/observation-baseline/' + p; mkdirSync(dirname(target), { recursive: true }); writeFileSync(target,before(p)); }
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc','--ignoreConfig','--types','node','--target','ES2022','--module','NodeNext','--strict','--skipLibCheck','--outDir','build/observation-baseline/js','build/observation-baseline/src/cli.ts'], { encoding: 'utf8' });
const cli = [];
for (const args of [[], ['-e'], ['a','b'], ['build/definitely-absent-file.js'], ['-e', "console.log('yes');"], ['-e', "throw {name:'TypeError'};"], ['-e', 'missing;'], ['-e', 'return 1;'], ['test/fixtures/compound-coercion-failure.js'], ['test/fixtures/compound-parse.js']]) {
  const old = spawnSync(process.execPath,['build/observation-baseline/js/cli.js',...args],{encoding:'utf8'});
  for (const lane of ['node','native']) {
    const r = spawnSync(lane === 'node' ? process.execPath : 'build/native/rift.exe', lane === 'node' ? ['build/node/src/cli.js',...args] : args, {encoding:'utf8'});
    for (const key of ['status','signal','stdout','stderr']) assert.equal(r[key],old[key],lane+' '+args+' '+key);
    cli.push({lane,args,status:r.status,stdout:r.stdout,stderr:r.stderr});
  }
}
writeFileSync('build/observation-baseline/output-fault.mjs','console.log = () => { throw new Error("output fault"); };\n');
for (const entry of ['build/observation-baseline/js/cli.js','build/node/src/cli.js']) {
  const r = spawnSync(process.execPath,['--import','./build/observation-baseline/output-fault.mjs',entry,'-e','console.log(1);'],{encoding:'utf8'});
  assert.equal(r.status,70); assert.equal(r.stdout,''); assert.equal(r.stderr,'internal fault: output fault\n');
  cli.push({entry,status:r.status,stdout:r.stdout,stderr:r.stderr});
}
const inventory = [], callers = [];
const inventoryFiles = [...new Set([...files,...readdirSync('src').filter(x=>x.endsWith('.ts')).map(x=>'src/'+x),
  'test/observation-serialization.ts','tools/test262/observe.mjs','tools/test262/driver-result.mjs'])];
for (const p of inventoryFiles.filter(p=>p.endsWith('.ts')||p.endsWith('.mjs'))) read(p).split(/\r?\n/).forEach((line,i)=>{
  if (p.startsWith('src/') && /failure\(|Failure\(|throw new|diagnostic:|\bfail\(/.test(line)) inventory.push({path:p,line:i+1,source:line.trim()});
  if (/\b(parse|lex|run|failure|resourceFailure|unsupportedFailure|observe|projectThrow)\(|diagnostic|ThrowCompletion|maxSteps|maxCalls|\.steps|\.depth|\.calls/.test(line)) callers.push({path:p,line:i+1,source:line.trim()});
});
for (const [name,value] of Object.entries({ 'preservation-and-coverage': {base,protectedFiles:files.length,oldCases:212,oldGates:33,coverage}, cli, inventory, callers })) {
  writeFileSync(`docs/validation/ts-031b-b/${name}.json`,JSON.stringify(value,null,2)+'\n');
}
console.log('PASS: 212 old records per lane, 33 old gates, 35 static gates, protected files, explicit fixture migration, CLI and construction/caller inventory');
