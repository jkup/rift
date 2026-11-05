import { readScriptCapabilities as read } from './script-capabilities.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const c = JSON.parse(await readFile(new URL('case.json', import.meta.url)));
try { console.log(JSON.stringify({value: await read(...c.args)})); }
catch(e) { console.log(JSON.stringify({error:e.message, native:e.constructor===Error, keys:Reflect.ownKeys(e).sort()})); }
