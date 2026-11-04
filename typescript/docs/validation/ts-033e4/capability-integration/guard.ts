import type { Builtin } from '../../../../src/runtime.js';
import type { Realm } from '../../../../src/realm.js';
import { consume } from './seam.js';

// Model of the proposed guard; production Realm.guardBuiltin stays closed.
export function guard(realm: Realm, raw: Builtin): Builtin {
    const wrapped: Builtin = (receiver, args, context, loc) => {
        if (context.realm.profile !== realm.profile) throw new Error('cross-profile callable invocation');
        if (realm.profile !== 'legacy' && !consume(context, realm, wrapped, receiver, args, loc))
            throw new Error('Script execution unavailable');
        return raw(receiver, args, context, loc);
    };
    return wrapped;
}
