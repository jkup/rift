// Host strings store UTF-16 code units, including lone surrogates. This boundary
// can change representation without changing guest string operations.
export type GuestString = string;
export function stringLength(value: GuestString): number { return value.length; }
export function stringUnit(value: GuestString, index: number): GuestString { return value.charAt(index); }
export function stringCodeUnit(value: GuestString, index: number): number { return value.charCodeAt(index); }
export function stringConcat(left: GuestString, right: GuestString): GuestString { return left + right; }

// Compare code units, not code points: a supplementary character's leading
// surrogate sorts before BMP characters above the surrogate range.
export function stringCompare(left: GuestString, right: GuestString): number {
    let i = 0;
    while (i < left.length && i < right.length) {
        const a = left.charCodeAt(i);
        const b = right.charCodeAt(i);
        if (a < b) return -1;
        if (a > b) return 1;
        i++;
    }
    if (left.length < right.length) return -1;
    if (left.length > right.length) return 1;
    return 0;
}

export function stringSlice(value: GuestString, start: number, end: number): GuestString {
    return value.slice(start, end);
}

export function stringIndexOf(value: GuestString, search: GuestString, start: number): number {
    return value.indexOf(search, start);
}

export function stringLastIndexOf(value: GuestString, search: GuestString, start: number): number {
    return value.lastIndexOf(search, start);
}

export function stringJoin(parts: GuestString[]): GuestString { return parts.join(""); }

export function isStringWhitespace(code: number): boolean {
    return code === 0x09 || code === 0x0b || code === 0x0c || code === 0x20
        || code === 0xa0 || code === 0x1680 || (code >= 0x2000 && code <= 0x200a)
        || code === 0x202f || code === 0x205f || code === 0x3000 || code === 0xfeff
        || code === 0x0a || code === 0x0d || code === 0x2028 || code === 0x2029;
}
