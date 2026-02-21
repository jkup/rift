#pragma once

#include <memory>
#include <vector>

#include "../../memory/object_factory.h"
#include "rift/execution/environment.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

// Forward declarations
namespace rift::ast {
struct ASTNode;
}

namespace rift::core {
class Rift;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 27.6 AsyncGenerator Objects
/// @spec https://tc39.es/ecma262/#sec-asyncgenerator-objects
///
/// Async generators combine generators (yield) with async functions (await).
/// When called, they return an object whose next()/return()/throw() methods
/// return Promises that resolve to {value, done} iterator results.
class AsyncGeneratorIterator {
  public:
    /// Create an AsyncGeneratorIterator for the given async generator function.
    static JSObject* create(rift::memory::ObjectFactory* factory,
                            std::shared_ptr<rift::ast::ASTNode> body,
                            std::shared_ptr<Environment> env, rift::core::Rift* engine,
                            const std::vector<std::string>& paramNames,
                            const std::vector<Value>& args);

    /// 27.6.1.2 %AsyncGeneratorPrototype%.next ( value )
    static Value next(const CallContext& ctx, const std::vector<Value>& args);

    /// 27.6.1.3 %AsyncGeneratorPrototype%.return ( value )
    static Value returnMethod(const CallContext& ctx, const std::vector<Value>& args);

    /// 27.6.1.4 %AsyncGeneratorPrototype%.throw ( exception )
    static Value throwMethod(const CallContext& ctx, const std::vector<Value>& args);

    /// Set up the %AsyncGeneratorPrototype% object.
    static void setupPrototype(rift::memory::ObjectFactory* factory, JSObject* iterator_prototype);

    /// Get the %AsyncGeneratorPrototype% object.
    static JSObject* getPrototype();

    /// Set the object factory for static access.
    static void setObjectFactory(rift::memory::ObjectFactory* factory);

    /// Get the object factory.
    static rift::memory::ObjectFactory* getObjectFactory();

  private:
    static JSObject* prototype_;
    static rift::memory::ObjectFactory* object_factory_;
};

}  // namespace rift::builtins
