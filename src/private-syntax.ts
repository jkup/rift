import type { DeclarationSite } from "./syntax.js";

export type PrivateDeclarationKind = "field" | "method" | "get" | "set";
export type PrivateSyntaxIssue = { readonly site: DeclarationSite; readonly message: string };
type PrivateDeclaration = {
    readonly kind: PrivateDeclarationKind;
    readonly isStatic: boolean;
    paired: boolean;
};

export class PrivateSyntaxScope {
    private readonly declarations = new Map<string, PrivateDeclaration>();
    readonly uses: DeclarationSite[] = [];
    private issue: PrivateSyntaxIssue | null = null;

    constructor(readonly outer: PrivateSyntaxScope | null) {}
    allowOuterName(name: string): void {
        this.declarations.set(name, { kind: "field", isStatic: false, paired: false });
    }

    declare(site: DeclarationSite, kind: PrivateDeclarationKind, isStatic: boolean): void {
        if (site.name === "#constructor") {
            this.reject(site, "#constructor is not a valid private declaration");
            return;
        }
        const previous = this.declarations.get(site.name);
        if (previous === undefined) {
            this.declarations.set(site.name, { kind, isStatic, paired: false });
            return;
        }
        if (
            !previous.paired &&
            previous.isStatic === isStatic &&
            ((previous.kind === "get" && kind === "set") ||
                (previous.kind === "set" && kind === "get"))
        ) {
            previous.paired = true;
            return;
        }
        this.reject(site, "duplicate private declaration " + site.name);
    }

    private reject(site: DeclarationSite, message: string): void {
        if (this.issue === null || site.start < this.issue.site.start) {
            this.issue = { site, message };
        }
    }

    // Resolve only after every enclosing class has finished collecting declarations.
    validate(): PrivateSyntaxIssue | null {
        let issue = this.issue;
        for (const site of this.uses) {
            let scope: PrivateSyntaxScope | null = this;
            while (scope !== null && !scope.declarations.has(site.name)) {
                scope = scope.outer;
            }
            if (scope === null && (issue === null || site.start < issue.site.start)) {
                issue = { site, message: "undeclared private name " + site.name };
            }
        }
        return issue;
    }
}
