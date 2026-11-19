export function isStrictReservedIdentifier(name: string): boolean {
    switch (name) {
        case "implements":
        case "interface":
        case "package":
        case "private":
        case "protected":
        case "public":
        case "static":
            return true;
        default:
            return false;
    }
}
