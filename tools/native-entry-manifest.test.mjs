import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNativeEntries } from './native-entry-manifest.mjs';

test('native manifest accepts distinct source and output pairs', () => {
    validateNativeEntries([['src/cli.ts', 'rift'], ['test/bigint-values.ts', 'bigint-values']]);
});
test('native manifest rejects silently omitted sources and unsafe outputs', () => {
    for (const entries of [[], [['test/a.ts','test/b.ts','a']], [['test/a.ts']], [['test/a.ts','test/b.ts']], [['../a.ts','a']], [['test/a.ts',null]]])
        assert.throws(() => validateNativeEntries(entries));
});
test('native manifest rejects duplicate builds and overwritten executables', () => {
    assert.throws(() => validateNativeEntries([['test/a.ts','a'],['test/a.ts','b']]));
    assert.throws(() => validateNativeEntries([['test/a.ts','a'],['test/b.ts','a']]));
});
