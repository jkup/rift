# Suspended constructor expressions

A constructor frame retains the new expression while its callee suspends. The
completed callee value enters the existing argument frame, or construction runs
immediately for an empty argument list. Constructability remains checked after
arguments, including when an argument throws or the constructor is not callable.

Tests cover both new syntaxes, member getters and computed keys, spread, bound
constructors, new.target, prototype changes, abrupt resumption and async bodies.
A constructor supplied from another Realm retains its prototype and executes
under the current session. The original two rejected inputs now execute.

This follows [ECMA-262 EvaluateNew](https://262.ecma-international.org/16.0/#sec-evaluatenew).
Ordinary construction dispatch remains responsible for constructor semantics.
Call references and super-call arguments remain separate. Focused evidence stays
under ignored build/generator-constructor-* paths until combined acceptance.
