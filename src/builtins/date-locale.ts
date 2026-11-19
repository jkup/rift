import type { Realm } from "../realm.js";
import { dateObject } from "../date-object.js";
import { formatDateString } from "../date-format.js";
import { normal, type ValueCompletion } from "../runtime.js";

export function registerDateLocale(realm: Realm): void {
    for (const name of ["toLocaleString", "toLocaleDateString", "toLocaleTimeString"]) {
        realm.registerBuiltin(
            realm.datePrototype,
            name,
            0,
            (receiver, _args, context, loc): ValueCompletion => {
                const date = dateObject(receiver, context, loc);
                if (date.type === "throw") {
                    return date;
                }
                const style =
                    name === "toLocaleString"
                        ? "display"
                        : name === "toLocaleDateString"
                          ? "date"
                          : "time";
                return normal({
                    kind: "string",
                    value: formatDateString(
                        date.value.dateValue,
                        style,
                        context.realm.dateTimeZone,
                    ),
                });
            },
        );
    }
}
