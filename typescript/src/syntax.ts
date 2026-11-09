export type SourceText = { readonly text: string };
export type FunctionSource = { readonly source: SourceText; readonly start: number; readonly end: number; readonly method?: boolean;
    readonly arrow?: boolean; readonly expressionBody?: boolean; readonly rest?: boolean; readonly bodyLoc?: Location };
export type Location = { line: number; column: number };
export type DeclarationSite = { readonly name: string; readonly start: number; readonly end: number; readonly loc: Readonly<Location> };
export type FormalParameter = { readonly site: DeclarationSite; readonly initializer: Expr | null };
export type BlockStmt = { kind: "block"; loc: Location; body: Stmt[] };
export type SwitchClause = { loc: Location; start: number; end: number; test: Expr | null; body: Stmt[] };
export type CaseBlock = { loc: Location; start: number; end: number; clauses: SwitchClause[]; body: Stmt[] };
export type SwitchStmt = { kind: "switch"; loc: Location; discriminant: Expr; caseBlock: CaseBlock };
export type TryCatchStmt = { kind: "try-catch"; loc: Location; block: BlockStmt; parameter: DeclarationSite;
    catchLoc: Location; catchStart: number; catchEnd: number; handler: BlockStmt };
export type TryFinallyStmt = { kind: "try-finally"; loc: Location; body: BlockStmt | TryCatchStmt; finalizer: BlockStmt };
export type Diagnostic = { phase: "parse" | "runtime"; name: string; message: string; loc: Location };
export type Argument = Expr | { kind: "spread"; loc: Location; expression: Expr };
export type ArrayElement = Argument | null;
export type ChainLink = { kind: "member"; loc: Location; optional: boolean; key: Expr }
    | { kind: "call"; loc: Location; optional: boolean; args: Argument[] };
export type ChainExpr = { kind: "chain"; loc: Location; base: Expr; links: ChainLink[] };
export type ObjectProperty = { kind: "data" | "get" | "set"; key: string; value: Expr };
export type PatternElement = { pattern: DestructuringPattern; initializer: Expr | null };
export type ArrayPattern = { kind: "array-pattern"; loc: Location; elements: (PatternElement | null)[]; rest: DestructuringPattern | null };
export type ObjectPattern = { kind: "object-pattern"; loc: Location; properties: { key: Expr; element: PatternElement }[]; rest: DestructuringPattern | null };
export type DestructuringPattern = ArrayPattern | ObjectPattern | { kind: "binding"; loc: Location; site: DeclarationSite } | { kind: "target"; loc: Location; target: Expr; inferredName: string | null };
export type ClassElement = { kind: "method" | "get" | "set"; isStatic: boolean; key: Expr; value: Extract<Expr, { kind: "function" }> };
export type ClassExpr = { kind: "class"; loc: Location; source: SourceText; start: number; end: number; name: DeclarationSite | null; constructorMethod: Extract<Expr, { kind: "function" }> | null; elements: ClassElement[] };
export type Expr =
    | ClassExpr
    | ChainExpr
    | { kind: "destructure"; loc: Location; pattern: ArrayPattern | ObjectPattern; value: Expr }
    | { kind: "array"; loc: Location; elements: ArrayElement[] }
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
    | { kind: "new"; loc: Location; callee: Expr; args: Argument[] }
    | { kind: "call"; loc: Location; callee: Expr; args: Argument[] }
    | { kind: "function"; loc: Location; params: string[]; body: Stmt[]; readonly source: FunctionSource | null; readonly parameters?: readonly FormalParameter[] }
    | { kind: "object"; loc: Location; properties: ObjectProperty[] };
export type VarStmt = { kind: "var"; loc: Location; declarations: { name: string; init: Expr | null }[] };
export type ForStmt = { kind: "for"; loc: Location; initializer: VarStmt | Expr | null; test: Expr | null; update: Expr | null; body: Stmt };
export type ForLexicalStmt = { kind: "for-lexical"; loc: Location; start: number; end: number; declarationKind: "let" | "const";
    binding: { site: DeclarationSite; init: Expr | null; initializer: { start: number; end: number } | null };
    test: Expr | null; update: Expr | null; body: Stmt };
export type ForLexicalBinding = { kind: "lexical"; declarationKind: "let" | "const"; site: DeclarationSite };
export type ForPatternBinding = { kind: "pattern"; declarationKind: "let" | "const" | "var"; pattern: ArrayPattern | ObjectPattern; sites: DeclarationSite[] };
export type ForAssignmentPattern = { kind: "assignment-pattern"; loc: Location; pattern: ArrayPattern | ObjectPattern };
export type ForEachStmt = { kind: "for-of" | "for-in"; loc: Location; start: number; end: number; head: VarStmt | Expr | ForLexicalBinding | ForPatternBinding | ForAssignmentPattern; iterable: Expr; body: Stmt };
export type Stmt =
    | { kind: "class-declaration"; loc: Location; value: ClassExpr }
    | VarStmt
    | { kind: "pattern-declaration"; loc: Location; declarationKind: "let" | "const" | "var"; pattern: ArrayPattern | ObjectPattern; init: Expr }
    | ForStmt
    | ForLexicalStmt
    | ForEachStmt
    | { kind: "empty"; loc: Location }
    | { kind: "expression"; loc: Location; expression: Expr }
    | { kind: "labelled"; loc: Location; name: string; body: Stmt }
    | { kind: "let"; loc: Location; name: string; init: Expr | null }
    | { kind: "const"; loc: Location; name: string; init: Expr }
    | { kind: "function"; loc: Location; name: string; params: string[]; body: Stmt[]; readonly source: FunctionSource | null; readonly parameters?: readonly FormalParameter[] }
    | BlockStmt
    | SwitchStmt
    | TryCatchStmt
    | TryFinallyStmt
    | { kind: "if"; loc: Location; test: Expr; consequent: Stmt; alternate: Stmt | null }
    | { kind: "while" | "do-while"; loc: Location; test: Expr; body: Stmt }
    | { kind: "return" | "throw"; loc: Location; value: Expr | null }
    | { kind: "break" | "continue"; loc: Location; readonly target?: string };
