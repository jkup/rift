function twoDigits(text: string, index: number): number {
    const first = text.charCodeAt(index) - 48, second = text.charCodeAt(index + 1) - 48;
    return first >= 0 && first <= 9 && second >= 0 && second <= 9 ? first * 10 + second : -1;
}

export function parseUTCOffset(text: string, allowSubMinute = true): bigint | null {
    if (text.length < 3 || text.length > 19 || (text.charAt(0) !== "+" && text.charAt(0) !== "-")) return null;
    const hour = twoDigits(text, 1);
    if (hour < 0 || hour > 23) return null;
    let index = 3, minute = 0, second = 0, fraction = 0;
    if (index < text.length) {
        const extended = text.charAt(index) === ":";
        if (extended) index++;
        minute = twoDigits(text, index); index += 2;
        if (minute < 0 || minute > 59) return null;
        if (index < text.length) {
            if (!allowSubMinute) return null;
            if (extended) {
                if (text.charAt(index) !== ":") return null;
                index++;
            }
            second = twoDigits(text, index); index += 2;
            if (second < 0 || second > 59) return null;
            if (index < text.length) {
                if (text.charAt(index) !== "." && text.charAt(index) !== ",") return null;
                const digits = text.length - ++index;
                if (digits < 1 || digits > 9) return null;
                while (index < text.length) {
                    const digit = text.charCodeAt(index++) - 48;
                    if (digit < 0 || digit > 9) return null;
                    fraction = fraction * 10 + digit;
                }
                fraction *= Math.pow(10, 9 - digits);
            }
        }
    }
    if (index !== text.length) return null;
    const value = BigInt(hour * 3600 + minute * 60 + second) * 1000000000n + BigInt(fraction);
    return text.charAt(0) === "-" ? -value : value;
}

export function formatUTCOffsetMinutes(minutes: number): string | null {
    if (!Number.isInteger(minutes) || Math.abs(minutes) > 1439) return null;
    const absolute = Math.abs(minutes);
    return (minutes < 0 ? "-" : "+") + String(Math.floor(absolute / 60)).padStart(2, "0") + ":" + String(absolute % 60).padStart(2, "0");
}

export function formatUTCOffset(nanoseconds: bigint, precision: "exact" | "minute" = "exact"): string | null {
    let absolute = nanoseconds < 0n ? -nanoseconds : nanoseconds;
    if (absolute >= 86400000000000n) return null;
    if (precision === "minute") absolute = (absolute + 30000000000n) / 60000000000n * 60000000000n;
    const hours = absolute / 3600000000000n, minutes = absolute / 60000000000n % 60n;
    let text = (nanoseconds < 0n && absolute !== 0n ? "-" : "+") + String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
    const remainder = absolute % 60000000000n;
    if (remainder !== 0n) {
        text += ":" + String(remainder / 1000000000n).padStart(2, "0");
        if (remainder % 1000000000n !== 0n) {
            let fraction = String(remainder % 1000000000n).padStart(9, "0");
            while (fraction.endsWith("0")) fraction = fraction.slice(0, -1);
            text += "." + fraction;
        }
    }
    return text;
}
