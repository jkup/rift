import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { probeVerdict } from '../../../tools/probe-verdict.mjs';
const directory = 'docs/validation/ts-029a/';
const baseline = 'docs/validation/ts-028a/';
const pendingR30 = process.argv.includes('--pending-r30');
const builds = JSON.parse(fs.readFileSync(directory + 'native-build-results.json', 'utf8'));
const priorBuilds = JSON.parse(fs.readFileSync(baseline + 'native-build-results.json', 'utf8'));
const success = { status: 0, signal: null, error: null, stdout: '' };
const gates = builds.map(row => ({
    entry: row.entry,
    verdict: probeVerdict({ ...row, node: success, native: success }),
    staticStatements: Number(row.coverage.stdout.match(/compile statically\s+(\d+)/)?.[1]),
    dynamic: Number(row.coverage.stdout.match(/in dynamic tier\s+(\d+)/)?.[1] ?? 0),
}));
if (gates.length !== 31 || gates.some(row => row.verdict !== 'PASS')) throw Error('native gates');
for (const old of priorBuilds) {
    if (!builds.some(row => row.entry === old.entry)) throw Error('missing baseline gate ' + old.entry);
}
const lanes = [];
for (const lane of ['node', 'native']) {
    const rows = JSON.parse(fs.readFileSync(directory + 'guest-' + lane + '-results.json', 'utf8'));
    const oldRows = JSON.parse(fs.readFileSync(baseline + 'guest-' + lane + '-results.json', 'utf8'));
    if (rows.length !== 203) throw Error('suite denominator ' + lane);
    const failures = rows.filter(row => row.verdict !== 'PASS');
    if (pendingR30) {
        if (failures.length !== 1 || failures[0].name !== 'property-assignment' || failures[0].status !== 1 || !failures[0].stderr.includes('property-assignment R30 exact cost')) throw Error('unexpected pending failure ' + lane);
    } else if (failures.length !== 0) throw Error('suite ' + lane);
    const migrations = [];
    for (const old of oldRows) {
        const current = rows.find(row => row.name === old.name);
        if (!current) throw Error('missing baseline ' + old.name);
        const expected = { ...old.expected };
        if (old.name === 'test/fixtures/primitive-reads-write.js') {
            if (expected.error !== '1:1: runtime TypeError: property base must be an object') throw Error('unexpected baseline oracle');
            expected.error = '1:1: runtime TypeError: property is not writable: 0';
            migrations.push({ name: old.name, before: old.expected, after: current.expected, authorization: 'A9' });
        }
        if (JSON.stringify(current.expected) !== JSON.stringify(expected)) throw Error('unexpected oracle change ' + old.name);
    }
    if (migrations.length !== 1 || oldRows.length !== 196) throw Error('migration/baseline count');
    lanes.push({ lane, passed: rows.length - failures.length, total: rows.length, failures: failures.map(row => ({name: row.name, verdict: row.verdict})), baselineNamesPreserved: oldRows.length, migrations,
        added: rows.filter(row => !oldRows.some(old => old.name === row.name)).map(row => row.name) });
}
const unchanged = ['src/evaluator.ts', 'src/parser.ts', 'src/delete-reference.ts', 'src/realm.ts', 'src/primitive-objects.ts', 'src/conversion.ts', 'src/primitive-conversion.ts', 'src/array-object.ts', 'package.json', 'package-lock.json', 'test/cases.json'];
const normalize = text => text.replaceAll('\r\n', '\n');
function prior(file) { return normalize(execFileSync('git', ['show', '63d4cff:typescript/' + file], { encoding: 'utf8' })); }
for (const file of unchanged) {
    if (prior(file) !== normalize(fs.readFileSync(file, 'utf8'))) throw Error('scope drift ' + file);
}
const oldFixtures = execFileSync('git', ['ls-tree', '-r', '--name-only', '63d4cff', '--', 'test/fixtures'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
for (const file of oldFixtures) {
    if (prior(file) !== normalize(fs.readFileSync(file, 'utf8'))) throw Error('baseline fixture changed ' + file);
}
const oldRuntime = prior('src/runtime.ts');
const currentRuntime = normalize(fs.readFileSync('src/runtime.ts', 'utf8'));
const putMarker = 'export function putValue';
if (oldRuntime.slice(0, oldRuntime.indexOf(putMarker)) !== currentRuntime.slice(0, currentRuntime.indexOf(putMarker))) throw Error('GetValue/internalSet/set drift');
const bindingMarker = '    const binding = ref.environment';
const oldBinding = oldRuntime.indexOf(bindingMarker, oldRuntime.indexOf(putMarker));
const currentBinding = currentRuntime.indexOf(bindingMarker, currentRuntime.indexOf(putMarker));
if (oldRuntime.slice(oldBinding) !== currentRuntime.slice(currentBinding)) throw Error('binding write drift');
const report = { validationComplete: !pendingR30, pendingOracle: pendingR30 ? "R30 frozen 6 versus observed 5; review required" : null, gates, baselineGatesPreserved: priorBuilds.length, lanes, unchangedBoundaries: unchanged, getValueInternalSetSetAndBindingCodeUnchanged: true, baselineFixturesPreserved: oldFixtures.length };
fs.writeFileSync(directory + 'preservation-and-coverage.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
