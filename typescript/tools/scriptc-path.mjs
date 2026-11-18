import {statSync} from 'node:fs';
import {join, resolve} from 'node:path';

export function scriptcPath(root, env = process.env) {
    const configured = env.RIFT_SCRIPTC;
    if (configured !== undefined && configured.trim() === '')
        throw new Error('RIFT_SCRIPTC must name a compiler executable');
    const executable = configured === undefined
        ? join(root, 'build/toolchain', `${process.platform}-${process.arch}`, 'bin', process.platform === 'win32' ? 'scriptc.exe' : 'scriptc')
        : resolve(root, configured);
    if (!statSync(executable, {throwIfNoEntry: false})?.isFile())
        throw new Error(`scriptc executable not found: ${executable}. Build the pinned compiler in toolchain/scriptc/README.md or set RIFT_SCRIPTC.`);
    return executable;
}
