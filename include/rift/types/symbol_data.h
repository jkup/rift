#pragma once

#include <cstdint>
#include <string>
#include <utility>

namespace rift::runtime {

/// Data structure representing a JavaScript Symbol primitive.
/// Each symbol has a unique ID and an optional description.
struct SymbolData {
    uint64_t id;
    std::string description;

    SymbolData(uint64_t symbolId, std::string desc = "")
        : id(symbolId), description(std::move(desc)) {
    }

    // Symbols are equal only if they have the same ID
    bool operator==(const SymbolData& other) const {
        return id == other.id;
    }
    bool operator!=(const SymbolData& other) const {
        return id != other.id;
    }
};

}  // namespace rift::runtime
