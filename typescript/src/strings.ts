// Host strings store UTF-16 code units, including lone surrogates. This boundary
// can change representation without changing guest string operations.
export type GuestString = string;
export function stringLength(value: GuestString): number { return value.length; }
export function stringUnit(value: GuestString, index: number): GuestString { return value.charAt(index); }
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
