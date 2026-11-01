// Host strings store UTF-16 code units, including lone surrogates. This boundary
// can change representation without changing guest string operations.
export type GuestString = string;
export function stringLength(value: GuestString): number { return value.length; }
export function stringUnit(value: GuestString, index: number): GuestString { return value.charAt(index); }
export function stringConcat(left: GuestString, right: GuestString): GuestString { return left + right; }
