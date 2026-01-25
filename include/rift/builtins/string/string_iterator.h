#pragma once

#include <string>
#include <vector>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/**
 * StringIterator
 *
 * Implements %StringIteratorPrototype% from ECMAScript spec (section 22.1.5.1).
 * String iterators iterate over Unicode code points of a string.
 *
 * Internal slots:
 * - [[IteratedString]] - the string being iterated (or undefined if exhausted)
 * - [[StringIteratorNextIndex]] - the current position in the string
 */
class StringIterator {
  public:
    /**
     * Create a StringIterator for the given string.
     * @param factory Object factory for GC-managed creation
     * @param str The string to iterate over
     * @return A new StringIterator object
     */
    static JSObject* create(rift::memory::ObjectFactory* factory, const std::string& str);

    /**
     * The next() method implementation.
     * Returns {done: boolean, value: string} where value is a single character.
     */
    static Value next(const CallContext& ctx, const std::vector<Value>& args);

    /**
     * Set up the %StringIteratorPrototype% object.
     * Should be called once during builtin initialization.
     * @param factory Object factory for GC-managed creation
     * @param iterator_prototype The %IteratorPrototype% to inherit from
     */
    static void setupPrototype(rift::memory::ObjectFactory* factory, JSObject* iterator_prototype);

    /**
     * Get the %StringIteratorPrototype% object.
     */
    static JSObject* getPrototype();

    /**
     * Set the object factory for creating result objects in next().
     */
    static void setObjectFactory(rift::memory::ObjectFactory* factory);

  private:
    static JSObject* prototype_;
    static rift::memory::ObjectFactory* object_factory_;
};

}  // namespace rift::builtins
