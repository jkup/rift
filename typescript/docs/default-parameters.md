# Default parameter initializers

TS-143 retains parsed formal-parameter nodes and body locations instead of rescanning parameter tokens during declaration collection. Initializer expressions use the ordinary expression evaluator and original node identities. Function length stops at the first default, and parameter defaults run only for undefined arguments.

All parameter bindings exist before initialization, so later and self references observe the TDZ. Initializers run left-to-right before body declarations. Functions with initializers use a separate body var environment; matching var names copy initialized parameter values unless a body function declaration replaces them. Sloppy functions also use a separate parameter environment above their function environment. Initializer closures therefore retain parameters and enclosing bindings without seeing body-local vars or functions. This binding is established before initialization.

The execution machine supplies a temporary parameter-evaluation handoff guarded by the private execution key. It enters the parameter environment before binding initialization and evaluates retained expressions through the active frame. Records do not retain that handoff, and OperationContext gains no evaluator. Public host setup rejects functions with initializers before starting activation. Completed activations expose their lexical and variable environments for frame setup; existing simple/rest function setup retains its original path and budget behavior.

Defaults work with supported ordinary functions, methods, arrows and rest parameters. Own strict directives with non-simple parameters and duplicate non-simple parameter names remain explicit unsupported-syntax rejections. Destructuring, arguments objects, eval and new certified syntax rules are separate work. Legacy parsing remains unchanged.

References consulted 2026-11-09: ECMAScript [FunctionDeclarationInstantiation](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-functiondeclarationinstantiation), [Function Definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-function-definitions), and engine262 [FunctionDeclarationInstantiation](https://github.com/engine262/engine262/blob/main/src/runtime-semantics/FunctionDeclarationInstantiation.mts). Rift follows their parameter/body environment separation and matching-var initialization, within its explicit completion and private execution model.

Acceptance pending.
