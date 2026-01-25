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

/**
 * Generator state enumeration.
 * Tracks the current execution state of a generator.
 */
enum class GeneratorState {
    SuspendedStart,  // Created but next() never called
    SuspendedYield,  // Paused at a yield point
    Executing,       // Currently running
    Completed        // Finished (returned or threw)
};

/**
 * GeneratorIterator
 *
 * Implements the Generator prototype from ECMAScript spec (section 27.5).
 * Generators are special functions that can suspend execution at yield points
 * and resume later.
 *
 * Internal slots stored as properties:
 * - [[GeneratorState]] - Current state (SuspendedStart, SuspendedYield, Executing, Completed)
 * - [[GeneratorBody]] - The AST node for the generator function body
 * - [[GeneratorEnvironment]] - The captured closure environment
 * - [[GeneratorContext]] - Execution context for resume (yield point, loop states)
 * - [[GeneratorEngine]] - Reference to the Rift engine for evaluation
 * - [[GeneratorSentValue]] - Value passed to next()
 */
class GeneratorIterator {
  public:
    /**
     * Create a GeneratorIterator for the given generator function.
     * This is called when a generator function is invoked - it returns
     * the iterator object rather than executing the body.
     *
     * @param factory Object factory for GC-managed creation
     * @param body The generator function body AST
     * @param env The captured closure environment
     * @param engine The Rift engine for later evaluation
     * @param paramNames Parameter names for binding
     * @param args Arguments passed to the generator function
     * @return A new GeneratorIterator object
     */
    static JSObject* create(rift::memory::ObjectFactory* factory,
                            std::shared_ptr<rift::ast::ASTNode> body,
                            std::shared_ptr<Environment> env, rift::core::Rift* engine,
                            const std::vector<std::string>& paramNames,
                            const std::vector<Value>& args);

    /**
     * The next(value?) method implementation.
     * Resumes generator execution until next yield or completion.
     * Returns {done: boolean, value: any}.
     */
    static Value next(const CallContext& ctx, const std::vector<Value>& args);

    /**
     * The return(value?) method implementation.
     * Forces the generator to complete with the given value.
     * Returns {done: true, value: value}.
     */
    static Value returnMethod(const CallContext& ctx, const std::vector<Value>& args);

    /**
     * The throw(exception) method implementation.
     * Throws an exception at the current yield point.
     * Returns {done: boolean, value: any} or throws if not caught.
     */
    static Value throwMethod(const CallContext& ctx, const std::vector<Value>& args);

    /**
     * Set up the %GeneratorPrototype% object.
     * Should be called once during builtin initialization.
     * @param factory Object factory for GC-managed creation
     * @param iterator_prototype The %IteratorPrototype% to inherit from
     */
    static void setupPrototype(rift::memory::ObjectFactory* factory, JSObject* iterator_prototype);

    /**
     * Get the %GeneratorPrototype% object.
     */
    static JSObject* getPrototype();

    /**
     * Set the object factory for static access.
     */
    static void setObjectFactory(rift::memory::ObjectFactory* factory);

    /**
     * Get the object factory.
     */
    static rift::memory::ObjectFactory* getObjectFactory();

  private:
    static JSObject* prototype_;
    static rift::memory::ObjectFactory* object_factory_;
};

}  // namespace rift::builtins
