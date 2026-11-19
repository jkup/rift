// Run from typescript. The independent baseline is compiled from committed bytes;
// guest sources still execute only in Rift, never in the host JS engine.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { probeVerdict } from '../../../tools/probe-verdict.mjs';
const base = '6f86657';
const git = args => execFileSync('git', args, { encoding: 'utf8' });
const normalize = s => s.replaceAll('\r\n', '\n');
const before = p => git(['show', `${base}:typescript/${p}`]);
const read = p => readFileSync(p, 'utf8');
const json = p => JSON.parse(read(p));
const migrated = ['addition', 'definition-dispatch', 'key-coercion', 'numeric-operators', 'property-key-conversion', 'relational'].map(x => 'test/' + x + '.ts');
let manual = 0;
const protectedFiles = git(['ls-tree', '-r', '--name-only', base, '--', 'src', 'test', 'tools', 'probes', 'package.json', 'package-lock.json', 'tsconfig.json']).trim().split('\n');
const changedSources = ['array-map', 'conversion', 'evaluator', 'interpreter', 'lexer', 'parser', 'runtime'].map(x => 'src/' + x + '.ts');
for (const p of protectedFiles) {
    if (migrated.includes(p)) {
        const old = before(p); manual += [...old.matchAll(/type: "throw",/g)].length;
        assert.equal(normalize(read(p)), normalize(old.replaceAll('type: "throw",', 'type: "throw", origin: { kind: "guest" },')), p);
    } else if (!changedSources.includes(p) && !['tools/run-guests.mjs', 'tools/build-native.mjs'].includes(p)) assert.equal(normalize(read(p)), normalize(before(p)), p);
}
assert.equal(manual, 10);
for (const lane of ['node', 'native']) {
    const old = json(`docs/validation/ts-030a/guest-${lane}-results.json`);
    const current = json(`build/guest-${lane}-results.json`);
    assert.equal(old.length, 211); assert.equal(current.length, 212);
    for (const expected of old) {
        const actual = current.find(x => x.name === expected.name);
        assert.ok(actual, expected.name); assert.deepEqual(actual.expected, expected.expected);
        assert.equal(actual.verdict, 'PASS');
        for (const k of ['status','signal','error','stdout','stderr']) assert.deepEqual(actual[k], expected[k], expected.name + ':' + k);
    }
    assert.equal(current.at(-1).name, 'structured-outcomes'); assert.equal(current.at(-1).verdict, 'PASS');
}
const gates = json('build/native-build-results.json');
const oldGates = json('docs/validation/ts-030a/native-build-results.json');
assert.equal(oldGates.length, 32); assert.equal(gates.length, 33);
assert.deepEqual(gates.slice(0,32).map(x=>x.entry), oldGates.map(x=>x.entry));
const success = { status: 0, signal: null, error: null, stdout: '' };
const coverage = gates.map(g => {
    assert.equal(probeVerdict({ ...g, node: success, native: success }), 'PASS', g.entry);
    return { entry: g.entry, static: Number(g.coverage.stdout.match(/statements analyzed\s+(\d+)/)[1]), dynamic: 0 };
});
// Strip precisely the additive runner block/entry, then compare all old logic.
assert.equal(normalize(read('tools/build-native.mjs').replace(', ["test/structured-outcomes.ts", "structured-outcomes"]', '')), normalize(before('tools/build-native.mjs')));
assert.equal(normalize(read('tools/run-guests.mjs').replace(/const outcomesCommand[^]*?execute\("structured-outcomes"[^\n]*\n/, '')), normalize(before('tools/run-guests.mjs')));
const sourceFiles = git(['ls-tree', '-r', '--name-only', base, '--', 'src']).trim().split('\n');
for (const p of sourceFiles) {
    const target = 'build/provenance-baseline/' + p;
    mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, before(p));
}
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '--ignoreConfig', '--types', 'node', '--target', 'ES2022', '--module', 'NodeNext', '--strict', '--skipLibCheck', '--outDir', 'build/provenance-baseline/js', 'build/provenance-baseline/src/cli.ts'], { stdio: 'pipe', encoding: 'utf8' });
const oldParser = await import(pathToFileURL(resolve('build/provenance-baseline/js/parser.js')));
const newParser = await import(pathToFileURL(resolve('build/node/src/parser.js')));
const oldLexer = await import(pathToFileURL(resolve('build/provenance-baseline/js/lexer.js')));
const newLexer = await import(pathToFileURL(resolve('build/node/src/lexer.js')));
const { sources } = await import(pathToFileURL(resolve('build/node/test/structured-outcomes.js')));
const parseSources = [...sources, ' '.repeat(100001), '('.repeat(127)+'1'+')'.repeat(127)+';', '{'.repeat(128)+';'+'}'.repeat(128)];
for (const source of parseSources) {
    const { rejection: _p, ...parsed } = newParser.parse(source);
    assert.deepEqual(parsed, oldParser.parse(source));
    const { rejection: _l, ...lexed } = newLexer.lex(source);
    assert.deepEqual(lexed, oldLexer.lex(source));
}
const cliCases = [[], ['-e'], ['a','b'], ['build/definitely-absent-file.js'], ['-e', "console.log('yes');"], ['-e', "throw {name:'TypeError'};"], ['-e', "missing;"], ['-e', 'return 1;'], ['test/fixtures/compound-coercion-failure.js'], ['test/fixtures/compound-parse.js']];
const cli = [];
for (const args of cliCases) {
    const baseline = spawnSync(process.execPath, ['build/provenance-baseline/js/cli.js', ...args], { encoding: 'utf8' });
    for (const lane of ['node', 'native']) {
        const actual = spawnSync(lane === 'node' ? process.execPath : 'build/native/rift.exe', lane === 'node' ? ['build/node/src/cli.js', ...args] : args, { encoding: 'utf8' });
        for (const key of ['status','signal','stdout','stderr']) assert.equal(actual[key], baseline[key], lane + ' CLI ' + args + ' ' + key);
        cli.push({ lane, args, status: actual.status, stdout: actual.stdout, stderr: actual.stderr });
    }
}
// CLI's unchanged outer catch is exercised with a host-only output fault. The
// native in-process driver separately asserts the identical escaping Error.
writeFileSync('build/provenance-baseline/output-fault.mjs', 'console.log = () => { throw new Error("output fault"); };\n');
for (const entry of ['build/provenance-baseline/js/cli.js', 'build/node/src/cli.js']) {
    const r = spawnSync(process.execPath, ['--import', './build/provenance-baseline/output-fault.mjs', entry, '-e', 'console.log(1);'], { encoding: 'utf8' });
    assert.equal(r.status,70); assert.equal(r.stdout,''); assert.equal(r.stderr,'internal fault: output fault\n');
    cli.push({entry,status:r.status,stdout:r.stdout,stderr:r.stderr});
}
const inventory = [];
const callers = [];
for (const p of [...sourceFiles, 'src/outcomes.ts', 'src/observation.ts', ...protectedFiles.filter(x => (x.startsWith('test/') && x.endsWith('.ts')) || (x.startsWith('tools/') && x.endsWith('.mjs'))), 'test/structured-outcomes.ts']) {
    read(p).split(/\r?\n/).forEach((line,i) => {
        if (p.startsWith('src/') && /failure\(|Failure\(|throw new|diagnostic:|\bfail\(/.test(line)) inventory.push({path:p,line:i+1,source:line.trim()});
        if (/\b(parse|lex|run|failure|resourceFailure|unsupportedFailure|observe|projectThrow)\(|diagnostic|ThrowCompletion|maxSteps|maxCalls|\.steps|\.depth|\.calls/.test(line)) callers.push({path:p,line:i+1,source:line.trim()});
    });
}
assert.equal([...read('src/evaluator.ts').matchAll(/resourceFailure\(/g)].length,4);
assert.equal([...read('src/conversion.ts').matchAll(/unsupportedFailure\(/g)].length,2);
assert.equal([...read('src/array-map.ts').matchAll(/unsupportedFailure\(/g)].length,1);
assert.ok(!/kind: "syntax-error"/.test(read('src/lexer.ts')+read('src/parser.ts')));
writeFileSync('docs/validation/ts-031b-a/construction-sites.json',JSON.stringify(inventory,null,2)+'\n');
writeFileSync('docs/validation/ts-031b-a/callers.json',JSON.stringify(callers,null,2)+'\n');
writeFileSync('docs/validation/ts-031b-a/preservation-and-coverage.json',JSON.stringify({base,oldCases:211,newCases:212,manualOrigins:manual,oldGates:32,coverage,parseControls:parseSources.length,cli},null,2)+'\n');
console.log('Preserved 211 exact records per lane, 32 gates, 10 origin-only migrations; 33 static gates; 45 parser/lexer baseline comparisons; CLI controls passed.');
