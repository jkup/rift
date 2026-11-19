# Suspended super compound assignments

The super-key frame retains the home object and actual this while a computed
key suspends. Once the key completes, it captures the super base and reads the
old value before starting the RHS. The existing compound-value frame retains
that reference and value through later suspension, operator coercion and write.
The reference caches the converted key so GetValue and PutValue share it.

Tests cover every supported compound operator, getter/RHS/coercion/setter order,
borrowed receivers, prototype and descriptor mutation, strict failures, symbols,
return cleanup, async methods/arrows, error Realms and current-session budgets.
The original rejected super compound target now executes.

See [ECMA-262 assignment evaluation](https://262.ecma-international.org/16.0/#sec-assignment-operators-runtime-semantics-evaluation)
and [SuperProperty](https://262.ecma-international.org/16.0/#sec-super-keyword-runtime-semantics-evaluation).
This extends the retained super reference already reviewed against engine262
revision 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Update/delete super targets remain separate. Evidence stays under ignored
build/generator-super-compound-* paths pending combined canonical acceptance.
