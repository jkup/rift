#pragma once

#include <memory>
#include <vector>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/environment/environment.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

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

/// Generator state enumeration.
/// Tracks the current execution state of a generator.
enum class GeneratorState {
    SuspendedStart,  // Created but next() never called
    SuspendedYield,  // Paused at a yield point
    Executing,       // Currently running
    Completed        // Finished (returned or threw)
};

/// 27.5 Generator Objects
/// @spec https://tc39.es/ecma262/#sec-generator-objects
///
/// Generators are special functions that can suspend execution at yield points
/// and resume later.
///
/// Internal slots (stored as properties):
/// - [[GeneratorState]] - Current state (SuspendedStart, SuspendedYield, Executing, Completed)
/// - [[GeneratorBody]] - The AST node for the generator function body
/// - [[GeneratorEnvironment]] - The captured closure environment
/// - [[GeneratorContext]] - Execution context for resume (yield point, loop states)
/// - [[GeneratorEngine]] - Reference to the Rift engine for evaluation
/// - [[GeneratorSentValue]] - Value passed to next()
class GeneratorIterator {
  public:
    /// 27.5.3.1 GeneratorStart ( generator, generatorBody )
    /// @spec https://tc39.es/ecma262/#sec-generatorstart
    ///
    /// Create a GeneratorIterator for the given generator function.
    /// This is called when a generator function is invoked - it returns
    /// the iterator object rather than executing the body.
    static JSObject* create(rift::memory::ObjectFactory* factory,
                            std::shared_ptr<rift::ast::ASTNode> body,
                            std::shared_ptr<Environment> env, rift::core::Rift* engine,
                            const std::vector<std::string>& paramNames,
                            const std::vector<Value>& args);

    /// 27.5.1.2 %GeneratorPrototype%.next ( value )
    /// @spec https://tc39.es/ecma262/#sec-generator.prototype.next
    static Value next(const CallContext& ctx, const std::vector<Value>& args);

    /// 27.5.1.3 %GeneratorPrototype%.return ( value )
    /// @spec https://tc39.es/ecma262/#sec-generator.prototype.return
    static Value returnMethod(const CallContext& ctx, const std::vector<Value>& args);

    /// 27.5.1.4 %GeneratorPrototype%.throw ( exception )
    /// @spec https://tc39.es/ecma262/#sec-generator.prototype.throw
    static Value throwMethod(const CallContext& ctx, const std::vector<Value>& args);

    /// 27.5.1 Properties of the %GeneratorPrototype% Object
    /// @spec https://tc39.es/ecma262/#sec-properties-of-generator-prototype
    static void setupPrototype(rift::memory::ObjectFactory* factory, JSObject* iterator_prototype);

    /// NON-STANDARD: Get the %GeneratorPrototype% object.
    static JSObject* getPrototype();

    /// NON-STANDARD: Set the object factory for static access.
    static void setObjectFactory(rift::memory::ObjectFactory* factory);

    /// NON-STANDARD: Get the object factory.
    static rift::memory::ObjectFactory* getObjectFactory();

  private:
    static JSObject* prototype_;
    static rift::memory::ObjectFactory* object_factory_;
};

}  // namespace rift::builtins
