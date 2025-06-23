#pragma once

#include <iostream>
#include <vector>
#include "../../runtime/values/value.h"
#include "../../runtime/values/object.h"
#include "../../memory/object_factory.h"

namespace rift::builtins {

using namespace rift::runtime;

// Console built-in
class Console {
   public:
    // Updated to accept ObjectFactory for GC-managed creation
    static std::shared_ptr<JSObject> create(rift::memory::ObjectFactory* factory);

    // Console methods
    static Value log(const std::vector<Value>& args);
    static Value error(const std::vector<Value>& args);
    static Value warn(const std::vector<Value>& args);
    static Value info(const std::vector<Value>& args);

   private:
    // Helper for output
    static void printValues(const std::vector<Value>& args, std::ostream& stream);
};

}  // namespace rift::builtins