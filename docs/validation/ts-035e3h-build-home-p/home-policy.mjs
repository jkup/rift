// Review-only semantic control; not injected into the accepted runner mechanism.
import assert from 'node:assert/strict';
import {win32 as path} from 'node:path';
export function validateHome(root,env){
 assert(path.isAbsolute(root));assert.equal(path.normalize(root),root);
 assert(/^[A-Za-z]:$/.test(env.HOMEDRIVE));assert(/^\\[^\\]/.test(env.HOMEPATH));assert(!env.HOMEPATH.includes(':'));assert(!env.HOMEPATH.split('\\').includes('..'));
 const combined=env.HOMEDRIVE+env.HOMEPATH,home=path.join(root,'home');
 assert.equal(path.normalize(combined),combined);assert.equal(combined,env.USERPROFILE);assert.equal(combined,home);
 for(const key of ['APPDATA','LOCALAPPDATA']){assert.equal(path.normalize(env[key]),env[key]);assert(env[key].startsWith(home+'\\'));}
 for(const key of ['TEMP','TMP','PROGRAMDATA']){assert.equal(path.normalize(env[key]),env[key]);assert(env[key].startsWith(root+'\\'));}
 return {home,contained:true};
}
export function validateEnvironment(root,env,expected){assert.deepEqual(env,expected);return validateHome(root,env);}
