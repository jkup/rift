import { readFileSync } from "node:fs";
import { numberToStringRadix } from "../src/number-radix.js";
import { formatRadix, RadixResources, RadixInterval, RadixCandidate,
    intervalFor, contains, prefer, select } from "../src/number-radix-internal.js";

function check(ok: boolean): void { if (!ok) throw new Error("radix control failed"); }
function fromBits(hex: string): number {
    const view = new DataView(new ArrayBuffer(8));
    view.setBigUint64(0, BigInt("0x" + hex), false);
    return view.getFloat64(0, false);
}
function invalid(value: number, radix: number): void {
    const stats = new RadixResources();
    let failed = false;
    try { formatRadix(value, radix, stats); }
    catch (error) { if (error instanceof Error) failed = error.message === "invalid nondecimal formatter input"; }
    check(failed);
    check(stats.largest === 0n && stats.scaleIterations === 0 && stats.digits === 0);
    failed = false;
    try { numberToStringRadix(value, radix); }
    catch (error) { if (error instanceof Error) failed = error.message === "invalid nondecimal formatter input"; }
    check(failed);
}
function controls(): void {
    for (const value of [0, -0, -1, NaN, Infinity, -Infinity]) invalid(value, 2);
    for (const radix of [0, 1, 10, 37, NaN, Infinity, -Infinity, 2.5]) invalid(1, radix);
    const stats = new RadixResources();
    for (const bits of ["0000000000000001", "000fffffffffffff", "0010000000000000",
        "0020000000000000", "7fefffffffffffff", "3ff0000000000001"]) {
        const interval = intervalFor(fromBits(bits), stats);
        check(contains(interval, interval.r - interval.minus, interval.d, stats) === interval.closed);
        check(contains(interval, interval.r + interval.plus, interval.d, stats) === interval.closed);
        check(!contains(interval, (interval.r - interval.minus) * 2n - 1n, interval.d * 2n, stats));
        check(!contains(interval, (interval.r + interval.plus) * 2n + 1n, interval.d * 2n, stats));
        check(!contains(interval, -1n, 1n, stats));
        // Host orchestration compares these actual production intervals to the
        // oracle's independent adjacent-pattern midpoint construction.
        console.log("interval " + bits + " " + interval.r + " " + interval.d + " " +
            interval.minus + " " + interval.plus + " " + interval.closed);
    }
    const odd = new RadixCandidate(3n, 2, 1n, 1n);
    const even = new RadixCandidate(4n, 2, 1n, 1n);
    check(prefer(even, odd, stats)); // base 3: 11 is even, 10 is odd.
    check(!prefer(odd, even, stats));
    check(!prefer(even, even, stats));
    check(prefer(new RadixCandidate(5n, 2, 2n, 1n), even, stats));
    let ambiguous = false;
    try { prefer(new RadixCandidate(6n, 2, 1n, 1n), even, stats); }
    catch (error) { if (error instanceof Error) ambiguous = error.message === "radix ambiguous parity invariant"; }
    check(ambiguous);
    let guarded = false;
    try { stats.scale(1077); }
    catch (error) { if (error instanceof Error) guarded = error.message === "radix scale iteration invariant"; }
    check(guarded);
    guarded = false;
    try { stats.watch(1n << 16384n); }
    catch (error) { if (error instanceof Error) guarded = error.message === "radix integer width invariant"; }
    check(guarded);
    // Real selector, synthetic rational intervals: only low, only high, both,
    // exact ties in both parity orders, clipping and duplicated floor/ceil.
    check(select(new RadixInterval(31n, 10n, 2n, 1n, true), 7n, 1, stats).s === 3n);
    check(select(new RadixInterval(39n, 10n, 1n, 2n, true), 7n, 1, stats).s === 4n);
    check(select(new RadixInterval(35n, 10n, 5n, 5n, true), 3n, 2, stats).s === 4n);
    check(select(new RadixInterval(45n, 10n, 5n, 5n, true), 3n, 2, stats).s === 4n);
    check(select(new RadixInterval(1n, 1n, 0n, 0n, true), 2n, 1, stats).s === 1n);
    console.log("controls PASS");
}

if (process.argv[2] === "controls") controls();
else {
    const rows = readFileSync(process.argv[2], "utf8").trim().split("\n");
    const rssBefore = process.memoryUsage().rss;
    for (let index = 0; index < rows.length; index++) {
        const fields = rows[index].trim().split(" ");
        const value = fromBits(fields[0]), radix = Number(fields[1]);
        const stats = new RadixResources();
        const start = performance.now();
        const result = formatRadix(value, radix, stats);
        const elapsed = performance.now() - start;
        // Exercise the public entry as well; instrumentation uses identical logic.
        check(numberToStringRadix(value, radix) === result);
        let width = 0, largest = stats.largest;
        while (largest > 0n) { width++; largest >>= 1n; }
        console.log(index + " " + fields[0] + " " + radix + " " + result + " " +
            stats.digits + " " + stats.scaleIterations + " " + stats.powerIterations + " " +
            width + " " + stats.length + " " + stats.candidates + " " + elapsed);
    }
    // Repeated warm batches keep native clock quantization out of most single
    // call measurements. Include the public API, with a runtime-dependent sink.
    const batches: number[] = [];
    let totalLength = 0;
    for (let repeat = 0; repeat < 5; repeat++) {
        const start = performance.now();
        for (let i = 0; i < rows.length; i++) {
            const fields = rows[i].trim().split(" ");
            totalLength += numberToStringRadix(fromBits(fields[0]), Number(fields[1])).length;
        }
        batches.push(performance.now() - start);
    }
    console.error("resources " + rssBefore + " " + process.memoryUsage().rss + " " +
        totalLength + " " + batches.join(" "));
}
