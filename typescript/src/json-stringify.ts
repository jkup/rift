import { GuestArray } from "./array-object.js";
import { lengthOfArrayLike } from "./array-like.js";
import { GuestBoolean, GuestNumber, GuestStringObject } from "./primitive-objects.js";
import { numberToString, toNumber, toString, toIntegerOrInfinity } from "./conversion.js";
import { toPrimitive } from "./primitive-conversion.js";
import { languageFailure, normal, UNDEFINED, type GuestObject, type OperationContext, type Value, type ValueCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";

type Frame = { object: GuestObject; array: boolean; keys: string[]; length: number; index: number; count: number; indent: string; parentIndent: string };

function omitted(value: Value): boolean {
    return value.kind === "undefined" || value.kind === "symbol" || (value.kind === "object" && value.object.callable !== null);
}

export class JSONSerializer {
    private replacer: Value = UNDEFINED;
    private propertyList: string[] | null = null;
    private gap = "";
    private parts: string[] = [];
    private stack: Frame[] = [];
    private active = new Set<GuestObject>();

    constructor(private context: OperationContext, private loc: Location) {}

    private append(text: string): ValueCompletion {
        for (let i = 0; i < text.length; i++) {
            const tick = this.context.tick(this.loc);
            if (tick.type === "throw") return tick;
        }
        this.parts.push(text);
        return normal();
    }

    private quote(text: string): ValueCompletion {
        const opening = this.append('"');
        if (opening.type === "throw") return opening;
        for (let i = 0; i < text.length; i++) {
            const unit = text.charCodeAt(i);
            let part = text.charAt(i);
            if (unit === 34) part = '\\"';
            else if (unit === 92) part = "\\\\";
            else if (unit === 8) part = "\\b";
            else if (unit === 9) part = "\\t";
            else if (unit === 10) part = "\\n";
            else if (unit === 12) part = "\\f";
            else if (unit === 13) part = "\\r";
            else if (unit >= 0xd800 && unit <= 0xdbff && i + 1 < text.length && text.charCodeAt(i + 1) >= 0xdc00 && text.charCodeAt(i + 1) <= 0xdfff)
                part += text.charAt(++i);
            else if (unit < 32 || (unit >= 0xd800 && unit <= 0xdfff)) part = "\\u" + unit.toString(16).padStart(4, "0");
            const added = this.append(part);
            if (added.type === "throw") return added;
        }
        return this.append('"');
    }

    private configure(replacer: Value, space: Value): ValueCompletion {
        if (replacer.kind === "object") {
            if (replacer.object.callable !== null) this.replacer = replacer;
            else if (replacer.object instanceof GuestArray) {
                this.propertyList = [];
                const seen = new Set<string>();
                const length = lengthOfArrayLike(replacer.object, this.context, this.loc);
                if (length.type === "throw") return length;
                for (let i = 0; i < length.value; i++) {
                    const tick = this.context.tick(this.loc);
                    if (tick.type === "throw") return tick;
                    const read = replacer.object.internalGet(numberToString(i), replacer, this.context, this.loc);
                    if (read.type === "throw") return read;
                    let value = read.value;
                    if (value.kind === "object" && (value.object instanceof GuestStringObject || value.object instanceof GuestNumber)) {
                        const primitive = toPrimitive(value, "string", this.context, this.loc);
                        if (primitive.type === "throw") return primitive;
                        const converted = toString(primitive.value, this.loc, this.context.realm);
                        if (converted.type === "throw") return converted;
                        value = { kind: "string", value: converted.value };
                    }
                    if (value.kind !== "number" && value.kind !== "string") continue;
                    const key = value.kind === "string" ? value.value : numberToString(value.value);
                    if (!seen.has(key)) { seen.add(key); this.propertyList.push(key); }
                }
            }
        }
        if (space.kind === "object" && (space.object instanceof GuestNumber || space.object instanceof GuestStringObject)) {
            const numeric = space.object instanceof GuestNumber;
            const primitive = toPrimitive(space, numeric ? "number" : "string", this.context, this.loc);
            if (primitive.type === "throw") return primitive;
            if (numeric) {
                const converted = toNumber(primitive.value, this.loc, this.context.realm);
                if (converted.type === "throw") return converted;
                space = { kind: "number", value: converted.value };
            } else {
                const converted = toString(primitive.value, this.loc, this.context.realm);
                if (converted.type === "throw") return converted;
                space = { kind: "string", value: converted.value };
            }
        }
        if (space.kind === "number") {
            const integer = toIntegerOrInfinity(space, this.loc, this.context.realm);
            if (integer.type === "throw") return integer;
            for (let i = 0; i < Math.min(10, integer.value); i++) this.gap += " ";
        } else if (space.kind === "string") this.gap = space.value.slice(0, 10);
        return normal();
    }

    private prepare(holder: GuestObject, key: string): ValueCompletion {
        const receiver: Value = { kind: "object", object: holder };
        const read = holder.internalGet(key, receiver, this.context, this.loc);
        if (read.type === "throw") return read;
        let value = read.value;
        if (value.kind === "object") {
            const method = value.object.internalGet("toJSON", value, this.context, this.loc);
            if (method.type === "throw") return method;
            if (method.value.kind === "object" && method.value.object.callable !== null) {
                const result = this.context.call(method.value, value, [{ kind: "string", value: key }], this.loc);
                if (result.type === "throw") return result;
                value = result.value;
            }
        }
        if (this.replacer.kind !== "undefined") {
            const result = this.context.call(this.replacer, receiver, [{ kind: "string", value: key }, value], this.loc);
            if (result.type === "throw") return result;
            value = result.value;
        }
        if (value.kind === "object") {
            if (value.object instanceof GuestBoolean) value = { kind: "boolean", value: value.object.booleanData };
            else if (value.object instanceof GuestNumber || value.object instanceof GuestStringObject) {
                const numeric = value.object instanceof GuestNumber;
                const primitive = toPrimitive(value, numeric ? "number" : "string", this.context, this.loc);
                if (primitive.type === "throw") return primitive;
                if (numeric) {
                    const converted = toNumber(primitive.value, this.loc, this.context.realm);
                    return converted.type === "throw" ? converted : normal({ kind: "number", value: converted.value });
                }
                const converted = toString(primitive.value, this.loc, this.context.realm);
                return converted.type === "throw" ? converted : normal({ kind: "string", value: converted.value });
            }
        }
        return normal(value);
    }

    private emit(value: Value, parentIndent: string): ValueCompletion {
        if (value.kind === "string") return this.quote(value.value);
        if (value.kind === "number") return this.append(Number.isFinite(value.value) ? numberToString(value.value) : "null");
        if (value.kind === "boolean") return this.append(value.value ? "true" : "false");
        if (value.kind !== "object") return this.append("null");
        const object = value.object;
        if (this.active.has(object)) return languageFailure(this.context.realm, "TypeError", "cyclic JSON value", this.loc);
        const array = object instanceof GuestArray;
        let keys: string[] = [], length = 0;
        if (array) {
            const captured = lengthOfArrayLike(object, this.context, this.loc);
            if (captured.type === "throw") return captured;
            length = captured.value;
        } else if (this.propertyList !== null) { keys = this.propertyList; length = keys.length; }
        else {
            for (const key of object.ownPropertyKeys()) {
                const tick = this.context.tick(this.loc);
                if (tick.type === "throw") return tick;
                if (typeof key !== "string") continue;
                const descriptor = object.getOwnProperty(key);
                if (descriptor !== undefined && descriptor.enumerable) keys.push(key);
            }
            length = keys.length;
        }
        for (let i = 0; i < parentIndent.length + this.gap.length; i++) {
            const tick = this.context.tick(this.loc);
            if (tick.type === "throw") return tick;
        }
        const opened = this.append(array ? "[" : "{");
        if (opened.type === "throw") return opened;
        this.active.add(object);
        this.stack.push({object, array, keys, length, index: 0, count: 0, indent: parentIndent + this.gap, parentIndent});
        return normal();
    }

    stringify(value: Value, replacer: Value, space: Value): ValueCompletion {
        const configured = this.configure(replacer, space);
        if (configured.type === "throw") return configured;
        const root = this.context.realm.createObject();
        root.bootstrapDefine("", {value, writable: true, enumerable: true, configurable: true});
        const prepared = this.prepare(root, "");
        if (prepared.type === "throw") return prepared;
        if (omitted(prepared.value)) return normal(UNDEFINED);
        const emitted = this.emit(prepared.value, "");
        if (emitted.type === "throw") return emitted;
        while (this.stack.length > 0) {
            const tick = this.context.tick(this.loc);
            if (tick.type === "throw") return tick;
            const frame = this.stack[this.stack.length - 1];
            if (frame.index === frame.length) {
                if (frame.count > 0 && this.gap !== "") {
                    const newline = this.append("\n" + frame.parentIndent);
                    if (newline.type === "throw") return newline;
                }
                const closed = this.append(frame.array ? "]" : "}");
                if (closed.type === "throw") return closed;
                this.active.delete(frame.object);
                this.stack.pop();
                continue;
            }
            const key = frame.array ? numberToString(frame.index++) : frame.keys[frame.index++];
            const next = this.prepare(frame.object, key);
            if (next.type === "throw") return next;
            if (!frame.array && omitted(next.value)) continue;
            const prefix = this.append((frame.count++ > 0 ? "," : "") + (this.gap === "" ? "" : "\n" + frame.indent));
            if (prefix.type === "throw") return prefix;
            if (!frame.array) {
                const quoted = this.quote(key);
                if (quoted.type === "throw") return quoted;
                const separator = this.append(this.gap === "" ? ":" : ": ");
                if (separator.type === "throw") return separator;
            }
            const child = this.emit(omitted(next.value) ? {kind: "null"} : next.value, frame.indent);
            if (child.type === "throw") return child;
        }
        return normal({ kind: "string", value: this.parts.join("") });
    }
}
