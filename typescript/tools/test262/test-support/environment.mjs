import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
export const corpusRoot = resolve(process.env.RIFT_TEST262_ROOT ?? resolve(root, 'build/test262-corpus'));
export const scratchRoot = resolve(process.env.RIFT_TEST_OUTPUT_ROOT ?? resolve(root, 'build/test262-tests'));
mkdirSync(scratchRoot, { recursive: true });
