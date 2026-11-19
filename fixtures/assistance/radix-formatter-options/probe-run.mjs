// Builds bigint-probe.ts in both lanes and checks every output against oracle.mjs.
// Usage (repository root, pinned Zig directory on PATH for the native link):
//   node typescript/fixtures/assistance/radix-formatter-options/probe-run.mjs
// Generated JS/executables go to typescript/build/cl-005-probe/ (ignored); the record goes to probe-results.json.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { completed, probeVerdict } from '../../../tools/probe-verdict.mjs';
import { shortest, judge, format, bitsOf } from './oracle.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = fileURLToPath(new URL('../../../', import.meta.url));
const out = join(root, 'build/cl-005-probe');
mkdirSync(out, { recursive: true });
const run = (command, args) => {
    const r = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
    return { status: r.status, signal: r.signal, error: r.error ? String(r.error) : null, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
};
const source = join(here, 'bigint-probe.ts');
const exe = join(out, process.platform === 'win32' ? 'bigint-probe.exe' : 'bigint-probe');
const scriptc = join(root, 'node_modules/scriptc/bin/scriptc.exe');
const typecheck = run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), source, '--ignoreConfig', '--target', 'es2022',
    '--module', 'nodenext', '--types', 'node', '--skipLibCheck', '--outDir', out]);
const build = run(scriptc, ['build', source, '--tier', 'static-only', '-o', exe]);
const coverage = run(scriptc, ['coverage', source]);

const fromBits = (bits) => { const v = new DataView(new ArrayBuffer(8)); v.setBigUint64(0, bits); return v.getFloat64(0); };
const inputs = [];
for (const [x, radix] of [[0.3, 3], [0.9999999999999999, 3], [0.9999999999999999, 36], [5e-324, 3], [2.2250738585072014e-308, 3],
    [2.2250738585072014e-308, 7], [2.2250738585072014e-308, 36], [5e-324, 2], [Number.MAX_VALUE, 2], [Number.MAX_VALUE, 3],
    [0.5, 3], [0.5, 5], [2 ** 60, 3], [1e21, 7], [1e-323, 5], [255, 16], [0.1, 3]]) inputs.push([x, radix]);
let state = 0x2545f4914f6cdd1dn;
const mask = (1n << 64n) - 1n;
const random = () => { state ^= (state << 13n) & mask; state ^= state >> 7n; state ^= (state << 17n) & mask; return state; };
for (let i = 0; i < 150; i++) {
    const pick = 2 + Number(random() % 34n);
    inputs.push([fromBits(random() & 0x7fefffffffffffffn), pick >= 10 ? pick + 1 : pick]);
}

const rows = [];
for (const [x, radix] of inputs) {
    if (!(x > 0)) continue;
    const args = [x.toString(), String(radix)];
    // x.toString() here is decimal (radix 10) only, to pass the exact double as a token.
    if (Number(args[0]) !== x || bitsOf(Number(args[0])) !== bitsOf(x)) throw new Error('token does not round-trip');
    const answer = shortest(x, radix);
    const lanes = { node: run(process.execPath, [join(out, 'bigint-probe.js'), ...args]), native: run(exe, args) };
    const verdicts = {};
    for (const [lane, result] of Object.entries(lanes)) {
        const [digits, n] = result.stdout.trim().split(' ');
        const text = completed(result) && digits ? format(toBig(digits, radix), Number(n), digits.length, radix) : null;
        verdicts[lane] = text ? judge(x, radix, text, answer) : { inInterval: false, shortest: false, recommended: false };
    }
    rows.push({ args, lanes, verdicts });
}
function toBig(digits, radix) { let s = 0n; for (const ch of digits) s = s * BigInt(radix) + BigInt(parseInt(ch, radix)); return s; }

// One combined record per lane so the shared fail-closed verdict also compares all output.
const lane = (name) => {
    const failed = rows.find((row) => !completed(row.lanes[name]));
    return failed ? failed.lanes[name] : { status: 0, signal: null, error: null, stdout: rows.map((row) => row.lanes[name].stdout).join('') };
};
const verdict = probeVerdict({ build, coverage, node: lane('node'), native: lane('native') });
const tallies = {};
for (const lane of ['node', 'native']) tallies[lane] = {
    inInterval: rows.filter((r) => r.verdicts[lane].inInterval).length,
    shortest: rows.filter((r) => r.verdicts[lane].shortest).length,
    recommended: rows.filter((r) => r.verdicts[lane].recommended).length,
};
const agree = rows.every((r) => r.lanes.node.stdout === r.lanes.native.stdout);
writeFileSync(join(here, 'probe-results.json'), JSON.stringify({ node: process.version, typecheck, build, coverage, verdict, cases: rows.length, tallies, lanesAgree: agree, rows }, null, 1) + '\n');
console.log(JSON.stringify({ typecheck: typecheck.status, build: build.status, coverage: coverage.stdout.trim().split('\n').slice(-3), verdict, cases: rows.length, tallies, lanesAgree: agree }, null, 1));
process.exitCode = verdict === 'PASS' && typecheck.status === 0 && tallies.node.shortest === rows.length && tallies.native.shortest === rows.length ? 0 : 1;
