import type { ForEachStmt, ForLexicalStmt, DeclarationSite } from "./syntax.js";

export function lexicalLoopBindings(
    node: ForEachStmt | ForLexicalStmt,
): { declarationKind: "let" | "const"; sites: readonly DeclarationSite[] } | null {
    if (node.kind === "for-lexical") {
        return {
            declarationKind: node.declarationKind,
            sites: node.bindings.map((binding) => binding.site),
        };
    }
    if (node.head.kind === "lexical") {
        return { declarationKind: node.head.declarationKind, sites: [node.head.site] };
    }
    if (node.head.kind === "pattern" && node.head.declarationKind !== "var") {
        return { declarationKind: node.head.declarationKind, sites: node.head.sites };
    }
    return null;
}
