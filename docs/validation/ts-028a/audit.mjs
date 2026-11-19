import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { probeVerdict } from '../../../tools/probe-verdict.mjs';
const directory = 'docs/validation/ts-028a/';
const baseline = 'docs/validation/ts-027a/readability/';
const builds = JSON.parse(fs.readFileSync(directory + 'native-build-results.json', 'utf8'));
const priorBuilds = JSON.parse(fs.readFileSync(baseline + 'native-build-results.json', 'utf8'));
const success = { status: 0, signal: null, error: null, stdout: '' };
const gates = builds.map(row => ({
    entry: row.entry,
    verdict: probeVerdict({ ...row, node: success, native: success }),
    staticStatements: Number(row.coverage.stdout.match(/compile statically\s+(\d+)/)?.[1]),
    dynamic: Number(row.coverage.stdout.match(/in dynamic tier\s+(\d+)/)?.[1] ?? 0),
}));
if (gates.length !== 30 || gates.some(row => row.verdict !== 'PASS')) throw Error('native gates');
for (const old of priorBuilds) {
    if (!builds.some(row => row.entry === old.entry)) throw Error('missing baseline gate ' + old.entry);
}
const lanes = [];
for (const lane of ['node', 'native']) {
    const rows = JSON.parse(fs.readFileSync(directory + 'guest-' + lane + '-results.json', 'utf8'));
    const oldRows = JSON.parse(fs.readFileSync(baseline + 'guest-' + lane + '-results.json', 'utf8'));
    if (rows.length !== 196 || rows.some(row => row.verdict !== 'PASS')) throw Error('suite ' + lane);
    const migrations = [];
    for (const old of oldRows) {
        const current = rows.find(row => row.name === old.name);
        if (!current) throw Error('missing baseline ' + old.name);
        const expected = { ...old.expected };
        if (old.name === 'build/guest-fixtures/primitive-base.js' || old.name === 'build/guest-fixtures/detached.js') {
            if (expected.errorContains !== 'runtime TypeError: property base must be an object') throw Error('unexpected baseline oracle');
            expected.errorContains = 'runtime TypeError: cannot convert null or undefined to object';
            migrations.push({ name: old.name, before: old.expected, after: current.expected, authorization: 'A17' });
        }
        if (JSON.stringify(current.expected) !== JSON.stringify(expected)) throw Error('unexpected oracle change ' + old.name);
    }
    if (migrations.length !== 2) throw Error('migration count');
    lanes.push({ lane, passed: rows.length, baselineNamesPreserved: oldRows.length, migrations,
        added: rows.filter(row => !oldRows.some(old => old.name === row.name)).map(row => row.name) });
}
// A3 and scope boundaries: these production paths and all existing guest fixture bytes stay fixed.
const unchanged = ['src/evaluator.ts', 'src/parser.ts', 'src/delete-reference.ts', 'src/realm.ts', 'src/primitive-objects.ts', 'src/conversion.ts', 'package.json', 'package-lock.json', 'test/cases.json'];
for (const file of unchanged) {
    if (!fs.existsSync(file)) continue;
    const old = execFileSync('git', ['show', 'fba0431:typescript/' + file], { encoding: 'utf8' });
    const now = fs.readFileSync(file, 'utf8');
    if (old.replaceAll('\r\n', '\n') !== now.replaceAll('\r\n', '\n')) throw Error('scope drift ' + file);
}
const oldFixtures = execFileSync('git', ['ls-tree', '-r', '--name-only', 'fba0431', '--', 'test/fixtures'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
for (const file of oldFixtures) {
    const old = execFileSync('git', ['show', 'fba0431:typescript/' + file], { encoding: 'utf8' });
    if (old.replaceAll('\r\n', '\n') !== fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) throw Error('baseline fixture changed ' + file);
}
const oldRuntime = execFileSync('git', ['show', 'fba0431:typescript/src/runtime.ts'], { encoding: 'utf8' });
const currentRuntime = fs.readFileSync('src/runtime.ts', 'utf8');
for (const marker of ['    const binding = ref.environment', 'export function putValue']) {
    const old = oldRuntime.slice(oldRuntime.indexOf(marker)).replaceAll('\r\n', '\n');
    const now = currentRuntime.slice(currentRuntime.indexOf(marker)).replaceAll('\r\n', '\n');
    if (old !== now) throw Error('binding/write boundary changed');
}
const report = { gates, baselineGatesPreserved: priorBuilds.length, lanes, unchangedBoundaries: unchanged, bindingAndWriteCodeUnchanged: true, baselineFixturesPreserved: oldFixtures.length };
fs.writeFileSync(directory + 'preservation-and-coverage.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
