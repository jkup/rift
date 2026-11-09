export type SourceText = { readonly text: string };
export type FunctionSource = { readonly source: SourceText; readonly start: number; readonly end: number };
export type Location = { line: number; column: number };
export type DeclarationSite = { readonly name: string; readonly start: number; readonly end: number; readonly loc: Readonly<Location> };
export type BlockStmt = { kind: "block"; loc: Location; body: Stmt[] };
export type SwitchClause = { loc: Location; start: number; end: number; test: Expr | null; body: Stmt[] };
export type CaseBlock = { loc: Location; start: number; end: number; clauses: SwitchClause[]; body: Stmt[] };
export type SwitchStmt = { kind: "switch"; loc: Location; discriminant: Expr; caseBlock: CaseBlock };
export type TryCatchStmt = { kind: "try-catch"; loc: Location; block: BlockStmt; parameter: DeclarationSite;
    catchLoc: Location; catchStart: number; catchEnd: number; handler: BlockStmt };
export type TryFinallyStmt = { kind: "try-finally"; loc: Location; body: BlockStmt | TryCatchStmt; finalizer: BlockStmt };
export type Diagnostic = { phase: "parse" | "runtime"; name: string; message: string; loc: Location };
export type Expr =
    | { kind: "array"; loc: Location; elements: (Expr | null)[] }
    | { kind: "literal"; loc: Location; value: number | string | boolean | null }
    | { kind: "template"; loc: Location; strings: string[]; expressions: Expr[] }
    | { kind: "identifier"; loc: Location; name: string }
    | { kind: "this"; loc: Location }
    | { kind: "unary"; loc: Location; op: string; operand: Expr }
    | { kind: "binary"; loc: Location; op: string; left: Expr; right: Expr }
    | { kind: "assign"; loc: Location; target: Expr; value: Expr }
    | { kind: "update"; loc: Location; target: Expr; op: "++" | "--"; prefix: boolean }
    | { kind: "compound"; loc: Location; target: Expr; value: Expr; op: "+" | "-" | "*" | "/" | "%" | "**" | "&" | "|" | "^" | "<<" | ">>" | ">>>" }
    | { kind: "conditional"; loc: Location; test: Expr; consequent: Expr; alternate: Expr }
    | { kind: "member"; loc: Location; base: Expr; key: Expr }
    | { kind: "new"; loc: Location; callee: Expr; args: Expr[] }
    | { kind: "call"; loc: Location; callee: Expr; args: Expr[] }
    | { kind: "function"; loc: Location; params: string[]; body: Stmt[]; readonly source: FunctionSource | null }
    | { kind: "object"; loc: Location; keys: string[]; values: Expr[] };
export type VarStmt = { kind: "var"; loc: Location; declarations: { name: string; init: Expr | null }[] };
export type ForStmt = { kind: "for"; loc: Location; initializer: VarStmt | Expr | null; test: Expr | null; update: Expr | null; body: Stmt };
export type ForLexicalBinding = { kind: "lexical"; declarationKind: "let" | "const"; site: DeclarationSite };
export type ForOfStmt = { kind: "for-of"; loc: Location; start: number; end: number; head: VarStmt | Expr | ForLexicalBinding; iterable: Expr; body: Stmt };
export type Stmt =
    | VarStmt
    | ForStmt
    | ForOfStmt
    | { kind: "empty"; loc: Location }
    | { kind: "expression"; loc: Location; expression: Expr }
    | { kind: "let"; loc: Location; name: string; init: Expr | null }
    | { kind: "const"; loc: Location; name: string; init: Expr }
    | { kind: "function"; loc: Location; name: string; params: string[]; body: Stmt[]; readonly source: FunctionSource | null }
    | BlockStmt
    | SwitchStmt
    | TryCatchStmt
    | TryFinallyStmt
    | { kind: "if"; loc: Location; test: Expr; consequent: Stmt; alternate: Stmt | null }
    | { kind: "while" | "do-while"; loc: Location; test: Expr; body: Stmt }
    | { kind: "return" | "throw"; loc: Location; value: Expr | null }
    | { kind: "break" | "continue"; loc: Location };
