# Reflect.apply and argument lists

Reflect.apply checks its callable target before reading the argument list, then
invokes it with the exact supplied receiver. The list must be an object. Its
length is fetched once and indexed values are read in order, including holes and
inherited properties. Iteration is not consulted.

The shared createListFromArrayLike helper also serves Reflect.construct and
Function.prototype.apply. Caller-specific validation and diagnostics remain at
each call site; Function.prototype.apply still treats nullish lists as empty.
Each indexed read checks the execution budget before growing the list, without
allocating storage based on an untrusted length.

Nineteen independent Node reference programs and twenty-five focused guest
programs cover ordering, strict receivers, bound functions, class call rejection,
generator timing and abrupt values. Additional tests cover async completion,
foreign-Realm errors and receivers, budget boundaries and enormous list lengths.
Typechecking and the focused apply/construct regressions pass under Node.
Full Node and native validation remain pending. Historical fixtures are unchanged.

Isolated validation is READY: 940/940 Node guests, focused native with 19,968 static statements, nine native regression groups, fifteen tooling builds, 296 tooling tests, eight codec records per host and sixteen parent-envelope checks pass. Canonical integration remains pending the frozen private-field rollup.
