#include "rift/builtins/console/console.h"

namespace rift::builtins {

std::shared_ptr<JSObject> Console::create(rift::memory::ObjectFactory* factory) {
    // Create console object using GC-managed creation
    auto console = factory->createJSObject();

    // Add console methods using GC-managed function creation
    console->setProperty("log", Value(factory->createJSFunction(log)));
    console->setProperty("error", Value(factory->createJSFunction(error)));
    console->setProperty("warn", Value(factory->createJSFunction(warn)));
    console->setProperty("info", Value(factory->createJSFunction(info)));

    return console;
}

Value Console::log(const std::vector<Value>& args) {
    printValues(args, std::cout);
    return Value::undefined();
}

Value Console::error(const std::vector<Value>& args) {
    printValues(args, std::cout);
    return Value::undefined();
}

Value Console::warn(const std::vector<Value>& args) {
    printValues(args, std::cout);
    return Value::undefined();
}

Value Console::info(const std::vector<Value>& args) {
    printValues(args, std::cout);
    return Value::undefined();
}

void Console::printValues(const std::vector<Value>& args, std::ostream& stream) {
    for (size_t i = 0; i < args.size(); ++i) {
        if (i > 0) {
            stream << " ";
        }
        stream << args[i].toString();
    }
    stream << std::endl;
}

}  // namespace rift::builtins