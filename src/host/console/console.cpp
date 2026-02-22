#include "rift/host/console/console.h"

#include "rift/builtins/builtin_base.h"  // For RIFT_METHOD macro

namespace rift::builtins {

JSObject* Console::create(rift::memory::ObjectFactory* factory) {
    auto* console = factory->createJSObject();

    RIFT_METHOD(console, "log", 0, log);
    RIFT_METHOD(console, "error", 0, error);
    RIFT_METHOD(console, "warn", 0, warn);
    RIFT_METHOD(console, "info", 0, info);

    return console;
}

Value Console::log(const CallContext& ctx, const std::vector<Value>& args) {
    printValues(args, std::cout);
    return Value::undefined();
}

Value Console::error(const CallContext& ctx, const std::vector<Value>& args) {
    printValues(args, std::cout);
    return Value::undefined();
}

Value Console::warn(const CallContext& ctx, const std::vector<Value>& args) {
    printValues(args, std::cout);
    return Value::undefined();
}

Value Console::info(const CallContext& ctx, const std::vector<Value>& args) {
    printValues(args, std::cout);
    return Value::undefined();
}

void Console::printValues(const std::vector<Value>& args, std::ostream& stream) {
    for(size_t i = 0; i < args.size(); ++i) {
        if(i > 0) {
            stream << " ";
        }
        stream << args[i].toString();
    }
    stream << std::endl;
}

}  // namespace rift::builtins