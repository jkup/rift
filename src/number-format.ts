// Guest receiver, argument conversion and range checks precede this boundary.
export function numberToFixed(value: number, digits: number): string { return value.toFixed(digits); }
export function numberToExponential(value: number, digits: number, shortest: boolean): string {
    return shortest ? value.toExponential() : value.toExponential(digits);
}
export function numberToPrecision(value: number, digits: number): string { return value.toPrecision(digits); }
