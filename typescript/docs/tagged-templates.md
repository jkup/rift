# Tagged templates

A tagged template uses the existing call AST with an explicit tagged marker and
a template-object operand before the substitutions. This preserves reference
receivers, evaluation order and the existing suspension machinery. The marker
excludes direct eval. Ungrouped optional chains cannot be tags; constructor
operands consume template tags before constructor arguments.

Each Realm caches frozen cooked/raw arrays by template-site identity. Creation
finishes before caching, so a budget failure cannot expose a partial array.
Invalid cooked escapes become undefined while raw spelling stays available.
Equal text at distinct sites does not share arrays; repeated evaluation of one
site does. Substitution values are passed without string coercion.

Tests cover identity, descriptors, raw escapes, evaluation and conversion order,
noncallable tags, constructor precedence, super/optional reference receivers,
generators/async functions, close behavior, current budgets and cross-Realm calls.
Historical rejected tagged inputs retain their exact source and now assert the
appropriate success or runtime TypeError.

Reference: [GetTemplateObject](https://262.ecma-international.org/16.0/#sec-gettemplateobject)
and [engine262 at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/ArgumentListEvaluation.mts).
