import type { Realm } from "../realm.js";
import { groupBy, type GroupingMode } from "../group-by.js";
import { GuestMap } from "../map-object.js";
import { arrayFromList } from "../array-create.js";
import { GuestObject, normal, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerGroupBy(realm: Realm, constructor: GuestObject, mode: GroupingMode): void {
    realm.registerBuiltin(constructor, "groupBy", 2, (_receiver, args, context, loc): ValueCompletion => {
        const groups = groupBy(args.length === 0 ? UNDEFINED : args[0], args.length < 2 ? UNDEFINED : args[1], mode, context, loc);
        if (groups.type === "throw") return groups;
        const allocation = context.tick(loc);
        if (allocation.type === "throw") return allocation;
        const map = mode === "collection" ? new GuestMap(context.realm.mapPrototype) : null;
        const result = map === null ? new GuestObject(null) : map;
        for (const group of groups.groups) {
            const elements = arrayFromList(group.elements, context, loc);
            if (elements.type === "throw") return elements;
            if (map !== null) map.data.set(group.key, elements.value);
            else {
                if (group.key.kind !== "string" && group.key.kind !== "symbol") throw new Error("invalid property group key");
                const defined = result.defineOwnProperty(group.key.value, {
                    value: elements.value, writable: true, enumerable: true, configurable: true,
                }, context, loc);
                if (defined.type === "throw") return defined;
                if (!defined.value) throw new Error("fresh grouped object rejected property");
            }
        }
        return normal({kind: "object", object: result});
    });
}
