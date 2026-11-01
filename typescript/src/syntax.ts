export type Location = { line: number; column: number };
export type Diagnostic = { phase: "parse" | "runtime"; name: string; message: string; loc: Location };
export type Expr =
    | { kind: "literal"; loc: Location; value: number | string | boolean | null }
    | { kind: "identifier"; loc: Location; name: string }
    | { kind: "this"; loc: Location }
    | { kind: "unary"; loc: Location; op: string; operand: Expr }
    | { kind: "binary"; loc: Location; op: string; left: Expr; right: Expr }
    | { kind: "assign"; loc: Location; target: Expr; value: Expr }
    | { kind: "member"; loc: Location; base: Expr; key: Expr }
    | { kind: "call"; loc: Location; callee: Expr; args: Expr[] }
    | { kind: "function"; loc: Location; params: string[]; body: Stmt[] }
    | { kind: "object"; loc: Location; keys: string[]; values: Expr[] };
export type Stmt =
    | { kind: "empty"; loc: Location }
    | { kind: "expression"; loc: Location; expression: Expr }
    | { kind: "let"; loc: Location; name: string; init: Expr | null }
    | { kind: "function"; loc: Location; name: string; params: string[]; body: Stmt[] }
    | { kind: "block"; loc: Location; body: Stmt[] }
    | { kind: "if"; loc: Location; test: Expr; consequent: Stmt; alternate: Stmt | null }
    | { kind: "while"; loc: Location; test: Expr; body: Stmt }
    | { kind: "return" | "throw"; loc: Location; value: Expr | null }
    | { kind: "break" | "continue"; loc: Location };
