import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { completed, probeVerdict } from '../../../tools/probe-verdict.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = fileURLToPath(new URL('../../../', import.meta.url));
const out = join(here, 'generated');
mkdirSync(out, { recursive: true });
function run(command, args) {
    const r = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
    return { status: r.status, signal: r.signal, error: r.error ? String(r.error) : null,
        stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}
// Fixed or mathematically derived expectations, never obtained from either lane.
const rows = [
    ['zero', '0', '2', '0'], ['negative-zero', '-0', '36', '0'],
    ['nan', 'NaN', '16', 'NaN'], ['positive-infinity', 'Infinity', '2', 'Infinity'],
    ['negative-infinity', '-Infinity', '36', '-Infinity'],
    ['binary-integer', '255', '2', '11111111'], ['negative-hex', '-255', '16', '-ff'],
    ['base36', '35', '36', 'z'], ['binary-half', '0.5', '2', '0.1'],
    ['hex-fraction', '10.5', '16', 'a.8'], ['octal-fraction', '0.125', '8', '0.1'],
    ['binary-subnormal', '5e-324', '2', '0.' + '0'.repeat(1073) + '1'],
    ['binary-max', '1.7976931348623157e308', '2', '1'.repeat(53) + '0'.repeat(971)],
    ['safe-integer', '9007199254740991', '16', '1fffffffffffff'],
    ['next-integer', '9007199254740992', '16', '20000000000000'],
    ['decimal-small', '0.000001', '10', '0.000001'],
    ['decimal-small-exp', '0.0000001', '10', '1e-7'],
    ['decimal-large', '1e20', '10', '100000000000000000000'],
    ['decimal-large-exp', '1e21', '10', '1e+21'],
    ['decimal-subnormal', '5e-324', '10', '5e-324'],
    ['decimal-max', '1.7976931348623157e308', '10', '1.7976931348623157e+308'],
    ['decimal-tenth', '0.1', '10', '0.1'],
    ['decimal-zero', '0', '10', '0'], ['decimal-negative-zero', '-0', '10', '0'],
    ['decimal-nan', 'NaN', '10', 'NaN'], ['decimal-infinity', 'Infinity', '10', 'Infinity'],
    ['decimal-negative-infinity', '-Infinity', '10', '-Infinity'],
    ['decimal-three-tenths', '0.3', '10', '0.3'],
    ['decimal-above-one', '1.0000000000000002', '10', '1.0000000000000002'],
    ['decimal-below-one', '0.9999999999999999', '10', '0.9999999999999999'],
    ['decimal-min-normal', '2.2250738585072014e-308', '10', '2.2250738585072014e-308'],
];
// Integer identity and exact half in every even base; all radix inputs are runtime strings.
for (let base = 2; base <= 36; base++) {
    rows.push(['base-' + base, String(base + 1), String(base), '11']);
    if (base % 2 === 0) rows.push(['half-' + base, '0.5', String(base), '0.' + '0123456789abcdefghijklmnopqrstuvwxyz'[base / 2]]);
}
const results = { nodeVersion: process.version, rows, probes: [] };
for (const name of ['radix', 'decimal']) {
    const source = join(here, name + '.ts');
    const exe = join(out, name + '.exe');
    const typecheck = run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), source,
        '--ignoreConfig', '--target', 'es2022', '--module', 'nodenext', '--types', 'node', '--skipLibCheck', '--outDir', out]);
    const build = run(join(root, 'node_modules/scriptc/bin/scriptc.exe'), ['build', source, '--tier', 'static-only', '-o', exe]);
    const coverage = run(join(root, 'node_modules/scriptc/bin/scriptc.exe'), ['coverage', source]);
    const cases = [];
    for (const [id, value, radix, expected] of rows) {
        if (name === 'decimal' && radix !== '10') continue;
        const args = name === 'radix' ? [value, radix] : [value];
        const node = completed(typecheck) ? run(process.execPath, [join(out, name + '.js'), ...args]) : null;
        const native = completed(build) ? run(exe, args) : null;
        const gate = probeVerdict({ build, coverage, node, native });
        const oracle = node?.stdout === expected + '\n' && native?.stdout === expected + '\n';
        cases.push({ id, node, native, gate, oracle });
    }
    // Nondecimal repeating fractions are observations, not normative exact-string tests.
    const explorationInputs = [['0.1', '3'], ['0.1', '16'], ['1.1', '36']];
    for (const input of ['0.3', '1.0000000000000002', '0.9999999999999999', '5e-324', '2.2250738585072014e-308']) {
        for (const base of ['3', '7', '16', '36']) explorationInputs.push([input, base]);
    }
    const exploratory = name === 'radix' ? explorationInputs.map(args => ({ args,
        node: run(process.execPath, [join(out, name + '.js'), ...args]),
        native: completed(build) ? run(exe, args) : null })) : [];
    results.probes.push({ name, typecheck, build, coverage, cases, exploratory });
    console.log(name, 'build=' + build.status, 'coverage=' + coverage.status,
        'fixed=' + cases.filter(c => c.gate === 'PASS' && c.oracle).length + '/' + cases.length);
}
const filename = process.argv[2] ?? 'results.json';
writeFileSync(join(here, filename), JSON.stringify(results, null, 2) + '\n');
process.exitCode = results.probes.every(p => completed(p.typecheck) && p.cases.every(c => c.gate === 'PASS' && c.oracle)) ? 0 : 1;
