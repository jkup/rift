import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {scriptcPath} from './scriptc-path.mjs';

test('compiler selection preserves the npm default and honors explicit paths', t => {
    const root = mkdtempSync(join(tmpdir(), 'rift-scriptc-path-'));
    const npm = join(root, 'node_modules/scriptc/bin/scriptc.exe');
    mkdirSync(join(root, 'node_modules/scriptc/bin'), {recursive: true});
    writeFileSync(npm, 'default');
    const custom = join(root, 'custom compiler.exe');
    writeFileSync(custom, 'candidate');
    t.after(() => {
        unlinkSync(custom);
        unlinkSync(npm);
        for (const directory of ['node_modules/scriptc/bin', 'node_modules/scriptc', 'node_modules', ''])
            rmdirSync(join(root, directory));
    });
    assert.equal(scriptcPath(root, {}), npm);
    assert.equal(scriptcPath(root, {RIFT_SCRIPTC: custom}), custom);
    assert.equal(scriptcPath(root, {RIFT_SCRIPTC: 'custom compiler.exe'}), custom);
    for (const setting of ['', '  ', 'missing.exe', '.'])
        assert.throws(() => scriptcPath(root, {RIFT_SCRIPTC: setting}), /RIFT_SCRIPTC|executable not found/);
});
