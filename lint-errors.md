error: unable to handle compilation, expected exactly one compiler job in '' [clang-diagnostic-error]
/Users/jonathankuperman/workspace/rift/src/api/api.cpp:29:49: warning: method 'parse' can be made static [readability-convert-member-functions-to-static]
   29 | std::shared_ptr<rift::ast::ASTNode> JavaScript::parse(const std::string& source) {
      |                                                 ^
/Users/jonathankuperman/workspace/rift/src/builtins/array/array.cpp:22:5: warning: 'auto array' can be declared as 'auto *array' [llvm-qualified-auto,readability-qualified-auto]
   22 |     auto array = factory->createJSFunction(Array::constructor);
--
      |     auto *
/Users/jonathankuperman/workspace/rift/src/builtins/array/array.cpp:28:5: warning: 'auto prototype' can be declared as 'auto *prototype' [llvm-qualified-auto,readability-qualified-auto]
   28 |     auto prototype = createPrototype(factory);
--
      |     auto *
/Users/jonathankuperman/workspace/rift/src/builtins/array/array.cpp:35:5: warning: 'auto prototype' can be declared as 'auto *prototype' [llvm-qualified-auto,readability-qualified-auto]
   35 |     auto prototype = factory->createJSObject();
--
      |     auto *
/Users/jonathankuperman/workspace/rift/src/builtins/array/array.cpp:55:12: warning: invalid case style for variable 'argOffset' [readability-identifier-naming]
   55 |     size_t argOffset = 0;
--
      |                                               arg_offset
/Users/jonathankuperman/workspace/rift/src/builtins/array/array.cpp:61:5: warning: 'auto arrayPrototype' can be declared as 'auto *arrayPrototype' [llvm-qualified-auto,readability-qualified-auto]
   61 |     auto arrayPrototype = getGlobalPrototype();
--
      |     auto *
/Users/jonathankuperman/workspace/rift/src/builtins/array/array.cpp:61:10: warning: invalid case style for variable 'arrayPrototype' [readability-identifier-naming]
   61 |     auto arrayPrototype = getGlobalPrototype();
--
      |                                                     array_prototype
/Users/jonathankuperman/workspace/rift/src/builtins/array/array.cpp:62:5: warning: 'auto arrayObj' can be declared as 'auto *arrayObj' [llvm-qualified-auto,readability-qualified-auto]
   62 |     auto arrayObj = object_factory_->createJSObject(arrayPrototype);
--
      |     auto *
/Users/jonathankuperman/workspace/rift/src/builtins/array/array.cpp:62:10: warning: invalid case style for variable 'arrayObj' [readability-identifier-naming]
   62 |     auto arrayObj = object_factory_->createJSObject(arrayPrototype);
--
      |                            array_obj
/Users/jonathankuperman/workspace/rift/src/builtins/array/array.cpp:64:5: warning: variable 'effectiveArgCount' of type 'size_t' (aka 'unsigned long') can be declared 'const' [misc-const-correctness]
   64 |     size_t effectiveArgCount = args.size() - argOffset;
--
      |            const 
/Users/jonathankuperman/workspace/rift/src/builtins/array/array.cpp:64:12: warning: invalid case style for variable 'effectiveArgCount' [readability-identifier-naming]
   64 |     size_t effectiveArgCount = args.size() - argOffset;
--
      |                effective_arg_count
/Users/jonathankuperman/workspace/rift/src/builtins/array/array.cpp:71:9: warning: variable 'length' of type 'double' can be declared 'const' [misc-const-correctness]
   71 |         double length = args[argOffset].toNumber();
--
      |                const 
/Users/jonathankuperman/workspace/rift/src/builtins/array/array.cpp:90:5: warning: 'auto arrayObj' can be declared as 'auto *arrayObj' [llvm-qualified-auto,readability-qualified-auto]
   90 |     auto arrayObj = getThisArrayObject(args);
