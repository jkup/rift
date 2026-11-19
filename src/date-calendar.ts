import { isoDaysInMonth } from "./iso-calendar.js";
import { DATE_MILLISECONDS_PER_DAY } from "./date-time.js";

function floorDivide(value: bigint, divisor: bigint): bigint {
    const quotient = value / divisor;
    return value % divisor < 0n ? quotient - 1n : quotient;
}

export function dateMakeDay(year: number, month: number, day: number): number {
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return NaN;
    const monthInteger = BigInt(Math.trunc(month));
    const balancedYear = Math.trunc(year) + Number(floorDivide(monthInteger, 12n));
    if (!Number.isFinite(balancedYear)) return NaN;
    const balancedMonth = Number((monthInteger % 12n + 12n) % 12n);
    const y = BigInt(balancedYear);
    const firstDay = 365n * (y - 1970n) + floorDivide(y - 1969n, 4n) - floorDivide(y - 1901n, 100n) + floorDivide(y - 1601n, 400n);
    let withinYear = 0;
    for (let index = 0; index < balancedMonth; index++) withinYear += isoDaysInMonth(balancedYear, index + 1);
    const firstTime = (Number(firstDay) + withinYear) * DATE_MILLISECONDS_PER_DAY;
    if (!Number.isFinite(firstTime)) return NaN;
    return Number(floorDivide(BigInt(firstTime), 86400000n)) + Math.trunc(day) - 1;
}
