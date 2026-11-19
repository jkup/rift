import type {Builtin} from '../../../../src/runtime.js';
import type {Realm} from '../../../../src/realm.js';
import {consume} from './tuple-state.js';
export function guard(realm:Realm,raw:Builtin):Builtin {
    const wrapped:Builtin=(receiver,args,context,loc)=>{
        consume(context,realm,wrapped,receiver,args,loc);
        return raw(receiver,args,context,loc);
    };
    return wrapped;
}
