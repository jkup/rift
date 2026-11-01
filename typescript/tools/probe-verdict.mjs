// Keep the acceptance rules independent of subprocess execution so failures
// of the toolchain itself can be tested without compiling native fixtures.
export function completed(result, expectedStatus = 0) {
    return result != null && result.error == null && result.signal == null
        && result.status === expectedStatus;
}

export function probeVerdict({ build, coverage, node, native, expectedStatus = 0 }) {
    if (!completed(build)) return "BUILD-FAIL";
    if (!completed(coverage)) return "COVERAGE-FAIL";

    // Match the pinned 0.4.7 report. Unknown output must fail closed, including
    // a successful command that prints no report or a future changed format.
    const report = coverage.stdout;
    const dynamic = report.match(/in dynamic tier\s+(\d+)/);
    if (dynamic && Number(dynamic[1]) > 0) return "DYNAMIC";
    const analyzed = report.match(/statements analyzed\s+(\d+)/);
    const statically = report.match(/compile statically\s+(\d+)\s+\(100%\)/);
    if (!analyzed || !statically || Number(analyzed[1]) === 0
        || analyzed[1] !== statically[1]
        || !report.includes("fully static — all analyzed statements compile to native code.")) {
        return "COVERAGE-UNKNOWN";
    }

    if (!completed(node, expectedStatus)) return "NODE-FAIL";
    if (!completed(native, expectedStatus)) return "NATIVE-FAIL";
    if (native.stdout !== node.stdout) return "OUTPUT-DIFF";
    return "PASS";
}
