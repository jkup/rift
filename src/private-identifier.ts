import { scanIdentifier } from "./identifier-scan.js";

export type PrivateIdentifierScan =
    | { kind: "ready"; text: string; end: number }
    | { kind: "invalid"; offset: number };

export function scanPrivateIdentifier(source: string, start: number): PrivateIdentifierScan {
    if (source.charAt(start) !== "#") {
        throw new Error("private identifier scan requires hash");
    }
    const result = scanIdentifier(source, start + 1);
    return result.kind === "invalid"
        ? result
        : { kind: "ready", text: "#" + result.text, end: result.end };
}
