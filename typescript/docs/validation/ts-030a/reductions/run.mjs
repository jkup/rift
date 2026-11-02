import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const root = 'docs/validation/ts-030a/reductions/';
const results = [];
function run(command, args) {
    const result = spawnSync(command, args, {encoding:'utf8', timeout:120000});
    return { status: result.status, signal: result.signal, error: result.error?.message ?? null, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}
for (const name of ['nested-index-before', 'nested-index-after', 'callback-before', 'callback-after']) {
    const file = root + name + '.ts';
    const binary = 'build/' + name + '.exe';
    const build = run('node_modules/scriptc/bin/scriptc.exe', ['build', file, '--tier', 'static-only', '-o', binary]);
    const coverage = run('node_modules/scriptc/bin/scriptc.exe', ['coverage', file, '--explain-dynamic']);
    const node = run(process.execPath, [file]);
    const native = run(binary, []);
    const expected = name.startsWith('callback') ? '3\n' : '+\n-\n';
    if (build.status !== 0 || node.status !== 0 || native.status !== 0 || node.stdout !== expected || native.stdout !== expected) throw Error(name);
    const dynamic = Number(coverage.stdout.match(/in dynamic tier\s+(\d+)/)?.[1] ?? 0);
    if (dynamic !== (name.endsWith('before') ? 1 : 0)) throw Error('coverage ' + name);
    results.push({name, expected, dynamic, build, coverage, node, native});
}
fs.writeFileSync(root + 'results.json', JSON.stringify(results, null, 2) + '\n');
console.log('4 reductions built static-only and executed in both hosts; before dynamic1, after dynamic0');
