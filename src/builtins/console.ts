import type { Output, Realm } from "../realm.js";
import { display, normal } from "../runtime.js";

export function registerConsole(realm: Realm, output: Output): void {
    const consoleObject = realm.createObject();
    realm.registerBuiltin(consoleObject, "log", 0, (_receiver, args, _context, _loc) => {
        let line = "";
        for (let i = 0; i < args.length; i++) {
            if (i > 0) {
                line += " ";
            }
            line += display(args[i]);
        }
        output(line);
        return normal();
    });
    realm.installGlobal("console", { kind: "object", object: consoleObject }, true);
}
