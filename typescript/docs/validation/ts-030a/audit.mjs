import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { probeVerdict } from '../../../tools/probe-verdict.mjs';
const directory = 'docs/validation/ts-030a/';
const baseline = 'docs/validation/ts-029a/';
const normalize = text => text.replaceAll('\r\n', '\n');
function prior(file) { return normalize(execFileSync('git', ['show', '5169978:typescript/' + file], { encoding: 'utf8' })); }
function current(file) { return normalize(fs.readFileSync(file, 'utf8')); }
function check(condition, label) { if (!condition) throw Error(label); }
const builds = JSON.parse(fs.readFileSync(directory + 'native-build-results.json', 'utf8'));
const oldBuilds = JSON.parse(fs.readFileSync(baseline + 'native-build-results.json', 'utf8'));
const success = { status: 0, signal: null, error: null, stdout: '' };
const gates = builds.map(row => ({
    entry: row.entry,
    verdict: probeVerdict({ ...row, node: success, native: success }),
    staticStatements: Number(row.coverage.stdout.match(/compile statically\s+(\d+)/)?.[1]),
    dynamic: Number(row.coverage.stdout.match(/in dynamic tier\s+(\d+)/)?.[1] ?? 0),
}));
check(gates.length === 32 && gates.every(row => row.verdict === 'PASS'), '32 fail-closed native coverage gates');
for (const row of oldBuilds) check(builds.some(next => next.entry === row.entry), 'preserved gate ' + row.entry);
check(oldBuilds.length === 31, 'baseline gate count');
const lanes = [];
for (const lane of ['node', 'native']) {
    const rows = JSON.parse(fs.readFileSync(directory + 'guest-' + lane + '-results.json', 'utf8'));
    const old = JSON.parse(fs.readFileSync(baseline + 'guest-' + lane + '-results.json', 'utf8'));
    check(rows.length === 211 && rows.every(row => row.verdict === 'PASS'), '211 cases ' + lane);
    check(old.length === 203, 'baseline denominator');
    const migrations = [];
    for (const row of old) {
        const next = rows.find(next => next.name === row.name);
        check(next !== undefined, 'preserved name ' + row.name);
        const expected = { ...row.expected };
        if (row.name === 'test/fixtures/primitive-reads-parse.js' || row.name === 'test/fixtures/property-assignment-parse.js') {
            check(expected.error === '1:15: parse SyntaxError: unsupported operator: +=', 'prior migration oracle');
            expected.error = '1:15: parse SyntaxError: unsupported operator: **';
            migrations.push({ name: row.name, before: row.expected, after: next.expected, authorization: 'A7' });
        }
        check(JSON.stringify(next.expected) === JSON.stringify(expected), 'only authorized oracle migrations ' + row.name);
    }
    check(migrations.length === 2, 'two expected records');
    lanes.push({ lane, passed: rows.length, baselineNamesPreserved: old.length, migrations,
        additions: rows.filter(row => !old.some(before => before.name === row.name)).map(row => row.name) });
}
const unchanged = ['src/runtime.ts', 'src/primitive-conversion.ts', 'src/conversion.ts', 'src/object-conversion.ts', 'src/realm.ts', 'src/primitive-objects.ts', 'src/array-object.ts', 'src/delete-reference.ts', 'package.json', 'package-lock.json', 'test/cases.json'];
for (const file of unchanged) check(prior(file) === current(file), 'unchanged ' + file);
// Binary and reference helper bodies are exactly preserved, not merely equivalent.
for (const [start, end] of [['    reference(', '    evaluate('], ['    binary(', null]]) {
    function extract(text) {
        const offset = text.indexOf(start);
        check(offset >= 0, 'helper marker');
        return end === null ? text.slice(offset) : text.slice(offset, text.indexOf(end, offset));
    }
    check(extract(prior('src/evaluator.ts')) === extract(current('src/evaluator.ts')), 'byte-preserved helper ' + start);
}
const oldFixtures = execFileSync('git', ['ls-tree', '-r', '--name-only', '5169978', '--', 'test/fixtures'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
const fixtureMigrations = [];
for (const file of oldFixtures) {
    let expected = prior(file);
    if (file === 'test/fixtures/primitive-reads-parse.js' || file === 'test/fixtures/property-assignment-parse.js') {
        check(expected === 'effect(); p.x += 1;\n' || expected === 'effect(); p.x += 1;', 'exact fixture baseline');
        expected = expected.replace('+=', '**=');
        fixtureMigrations.push(file);
    }
    check(current(file) === expected, 'fixture bytes ' + file);
}
check(fixtureMigrations.length === 2, 'A5/A6 only');
const oldDrivers = execFileSync('git', ['ls-tree', '-r', '--name-only', '5169978', '--', 'test'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(file => file.endsWith('.ts'));
for (const file of oldDrivers) {
    let expected = prior(file);
    if (file === 'test/abstract-equality.ts') expected = expected.replace('["1 += 1;", "unsupported operator: +=", 3]', '["1 += 1;", "invalid assignment target", 1]');
    if (file === 'test/primitive-reads.ts' || file === 'test/property-assignment.ts') expected = expected.replace('{ source: "p.x += 1;", column: 5, message: "unsupported operator: +=" }', '{ source: "p.x **= 1;", column: 5, message: "unsupported operator: **" }');
    check(current(file) === expected, 'A2/A3/A4-only old driver ' + file);
}
const report = { gates, baselineGatesPreserved: oldBuilds.length, lanes, unchanged, binaryAndReferenceBodiesUnchanged: true, fixturesAudited: oldFixtures.length, fixtureMigrations, driversAudited: oldDrivers.length };
fs.writeFileSync(directory + 'preservation-and-coverage.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
