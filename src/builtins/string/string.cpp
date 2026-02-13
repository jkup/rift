#include "rift/builtins/string/string.h"

#include <absl/strings/string_view.h>

#include <algorithm>
#include <cctype>
#include <cmath>
#include <limits>
#include <sstream>

#include "rift/builtins/array/array.h"
#include "rift/builtins/regexp/regexp.h"
#include "rift/builtins/string/string_iterator.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::extractThisString;

void String::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "fromCharCode", String::fromCharCode);
}

void String::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "charAt", String::charAt);
    RIFT_METHOD(prototype, "charCodeAt", String::charCodeAt);
    RIFT_METHOD(prototype, "concat", String::concat);
    RIFT_METHOD(prototype, "indexOf", String::indexOf);
    RIFT_METHOD(prototype, "lastIndexOf", String::lastIndexOf);
    RIFT_METHOD(prototype, "slice", String::slice);
    RIFT_METHOD(prototype, "split", String::split);
    RIFT_METHOD(prototype, "substring", String::substring);
    RIFT_METHOD(prototype, "toLowerCase", String::toLowerCase);
    RIFT_METHOD(prototype, "toUpperCase", String::toUpperCase);
    RIFT_METHOD(prototype, "toString", String::toString);
    RIFT_METHOD(prototype, "trim", String::trim);
    RIFT_METHOD(prototype, "valueOf", String::valueOf);
    RIFT_METHOD(prototype, "match", String::match);
    RIFT_METHOD(prototype, "search", String::search);
    RIFT_METHOD(prototype, "replace", String::replace);

    // Symbol.iterator - for for-of loop support
    std::string iterator_key = core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
    auto* iterator_func = factory->createJSFunction(String::symbolIterator);
    prototype->setProperty(iterator_key, Value(iterator_func));
}

Value String::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // If called with new, create a String object
    // If called without new, return a primitive string
    if(args.empty()) {
        return Value("");
    }

    return Value(args[0].toString());
}

Value String::fromCharCode(const CallContext& ctx, const std::vector<Value>& args) {
    std::string result;
    result.reserve(args.size());

    for(const auto& arg : args) {
        double num = arg.toNumber();
        if(!std::isnan(num) && std::isfinite(num)) {
            int charCode = static_cast<int>(num) & 0xFFFF;  // Take lower 16 bits
            if(charCode >= 0 && charCode <= 127) {          // Basic ASCII range
                result += static_cast<char>(charCode);
            } else {
                result += '?';  // Placeholder for non-ASCII characters
            }
        }
    }

    return Value(std::move(result));
}

Value String::charAt(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    double index = 0;
    if(!args.empty()) {
        index = args[0].toNumber();
    }

    if(std::isnan(index) || index < 0 || index >= static_cast<double>(str.length())) {
        return Value("");
    }

    size_t idx = static_cast<size_t>(index);
    return Value(std::string(1, str[idx]));
}

Value String::charCodeAt(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    double index = 0;
    if(!args.empty()) {
        index = args[0].toNumber();
    }

    if(std::isnan(index) || index < 0 || index >= static_cast<double>(str.length())) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    size_t idx = static_cast<size_t>(index);
    return Value(static_cast<double>(static_cast<unsigned char>(str[idx])));
}

Value String::concat(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    // Concat all arguments
    for(size_t i = 0; i < args.size(); ++i) {
        str += args[i].toString();
    }

    return Value(std::move(str));
}

Value String::indexOf(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    if(args.empty()) {
        return Value(-1.0);
    }

    std::string searchString = args[0].toString();
    size_t fromIndex = 0;

    if(args.size() >= 2) {
        double fromIndexNum = args[1].toNumber();
        if(!std::isnan(fromIndexNum) && fromIndexNum >= 0) {
            fromIndex = static_cast<size_t>(fromIndexNum);
        }
    }

    if(fromIndex >= str.length()) {
        return Value(-1.0);
    }

    size_t pos = str.find(searchString, fromIndex);
    if(pos == std::string::npos) {
        return Value(-1.0);
    }

    return Value(static_cast<double>(pos));
}

Value String::lastIndexOf(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    if(args.empty()) {
        return Value(-1.0);
    }

    std::string searchString = args[0].toString();
    size_t fromIndex = str.length();

    if(args.size() >= 2) {
        double fromIndexNum = args[1].toNumber();
        if(std::isnan(fromIndexNum)) {
            fromIndex = str.length();
        } else if(fromIndexNum < 0) {
            fromIndex = 0;
        } else if(fromIndexNum >= static_cast<double>(str.length())) {
            fromIndex = str.length();
        } else {
            fromIndex = static_cast<size_t>(fromIndexNum);
        }
    }

    // Search backwards from fromIndex
    for(size_t i = fromIndex; i != SIZE_MAX; --i) {
        if(i + searchString.length() <= str.length() &&
           str.substr(i, searchString.length()) == searchString) {
            return Value(static_cast<double>(i));
        }
    }

    return Value(-1.0);
}

Value String::slice(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    size_t length = str.length();
    double startNum = 0;
    double endNum = static_cast<double>(length);

    if(!args.empty()) {
        startNum = args[0].toNumber();
    }

    if(args.size() >= 2 && !args[1].isUndefined()) {
        endNum = args[1].toNumber();
    }

    // Handle negative indices
    if(startNum < 0) {
        startNum = std::max(0.0, static_cast<double>(length) + startNum);
    }
    if(endNum < 0) {
        endNum = std::max(0.0, static_cast<double>(length) + endNum);
    }

    size_t start =
        static_cast<size_t>(std::max(0.0, std::min(startNum, static_cast<double>(length))));
    size_t end = static_cast<size_t>(std::max(0.0, std::min(endNum, static_cast<double>(length))));

    if(start >= end) {
        return Value("");
    }

    return Value(str.substr(start, end - start));
}

Value String::substring(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    size_t length = str.length();
    double startNum = 0;
    double endNum = static_cast<double>(length);

    if(!args.empty()) {
        startNum = args[0].toNumber();
    }

    if(args.size() >= 2 && !args[1].isUndefined()) {
        endNum = args[1].toNumber();
    }

    // Convert negative values to 0
    startNum = std::max(0.0, startNum);
    endNum = std::max(0.0, endNum);

    // Swap if start > end
    if(startNum > endNum) {
        std::swap(startNum, endNum);
    }

    size_t start = static_cast<size_t>(std::min(startNum, static_cast<double>(length)));
    size_t end = static_cast<size_t>(std::min(endNum, static_cast<double>(length)));

    return Value(str.substr(start, end - start));
}

Value String::toLowerCase(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    std::transform(str.begin(), str.end(), str.begin(),
                   [](unsigned char c) { return std::tolower(c); });

    return Value(std::move(str));
}

Value String::toUpperCase(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    std::transform(str.begin(), str.end(), str.begin(),
                   [](unsigned char c) { return std::toupper(c); });

    return Value(std::move(str));
}

Value String::trim(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    // Trim leading whitespace
    size_t start = 0;
    while(start < str.length() && std::isspace(static_cast<unsigned char>(str[start]))) {
        start++;
    }

    // Trim trailing whitespace
    size_t end = str.length();
    while(end > start && std::isspace(static_cast<unsigned char>(str[end - 1]))) {
        end--;
    }

    return Value(str.substr(start, end - start));
}

Value String::split(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    // Create an array to hold the results using GC-managed creation
    std::vector<Value> elements;

    if(args.empty() || args[0].isUndefined()) {
        // No separator - return array with original string
        elements.push_back(Value(std::move(str)));
    } else {
        std::string separator = args[0].toString();

        if(separator.empty()) {
            // Empty separator - split into individual characters
            for(size_t i = 0; i < str.length(); ++i) {
                elements.push_back(Value(std::string(1, str[i])));
            }
        } else {
            // Split by separator
            size_t start = 0;
            size_t pos = 0;

            while((pos = str.find(separator, start)) != std::string::npos) {
                elements.push_back(Value(str.substr(start, pos - start)));
                start = pos + separator.length();
            }

            // Add the remaining part
            elements.push_back(Value(str.substr(start)));
        }
    }

    // Build a proper Array instance using Array helper
    return Value(Array::createArrayObject(getObjectFactory(), std::move(elements)));
}

Value String::toString(const CallContext& ctx, const std::vector<Value>& args) {
    // Get the string value from 'this'
    std::string str = extractThisString(ctx);
    return Value(std::move(str));
}

Value String::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    // Get the string value from 'this'
    std::string str = extractThisString(ctx);
    return Value(std::move(str));
}

size_t String::validateStringIndex(const std::string& str, double index) {
    if(std::isnan(index) || index < 0) {
        return 0;
    }

    size_t maxIndex = str.length();
    if(index >= static_cast<double>(maxIndex)) {
        return maxIndex;
    }

    return static_cast<size_t>(index);
}

// ===== String.prototype.search =====

Value String::search(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    if(args.empty() || args[0].isUndefined()) {
        // search(undefined) matches the empty string at position 0
        return Value(0.0);
    }

    // Check if argument is a RegExp
    RegExpData* data = nullptr;
    std::unique_ptr<RE2> temp_regex;

    if(args[0].isObject()) {
        data = RegExpRegistry::get(args[0].getObject());
    }

    RE2* regex_ptr = nullptr;
    if(data) {
        regex_ptr = data->regex.get();
    } else {
        // Convert to string and create a temporary regex
        std::string pattern = args[0].toString();
        RE2::Options opts;
        opts.set_log_errors(false);
        temp_regex = std::make_unique<RE2>(pattern, opts);
        regex_ptr = temp_regex.get();
    }

    if(!regex_ptr || !regex_ptr->ok()) {
        return Value(-1.0);
    }

    absl::string_view text(str);
    absl::string_view submatch;
    if(regex_ptr->Match(text, 0, static_cast<int>(str.size()), RE2::UNANCHORED, &submatch, 1)) {
        size_t index = submatch.data() - str.data();
        return Value(static_cast<double>(index));
    }

    return Value(-1.0);
}

// ===== String.prototype.match =====

Value String::match(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    if(args.empty() || args[0].isUndefined()) {
        // match(undefined) returns [""]
        std::vector<Value> elements;
        elements.emplace_back(std::string(""));
        auto* result = Array::createArrayObject(getObjectFactory(), std::move(elements));
        result->setProperty("index", Value(0.0));
        result->setProperty("input", Value(str));
        return Value(result);
    }

    // Check if argument is a RegExp
    RegExpData* data = nullptr;
    std::unique_ptr<RE2> temp_regex;
    bool is_global = false;

    if(args[0].isObject()) {
        data = RegExpRegistry::get(args[0].getObject());
    }

    RE2* regex_ptr = nullptr;
    if(data) {
        regex_ptr = data->regex.get();
        is_global = data->global;
    } else {
        // Convert to string and create a temporary regex
        std::string pattern = args[0].toString();
        RE2::Options opts;
        opts.set_log_errors(false);
        temp_regex = std::make_unique<RE2>(pattern, opts);
        regex_ptr = temp_regex.get();
    }

    if(!regex_ptr || !regex_ptr->ok()) {
        return Value::null();
    }

    absl::string_view text(str);

    if(!is_global) {
        // Non-global: return single match with groups, index, input (like exec)
        int num_groups = regex_ptr->NumberOfCapturingGroups();
        int num_submatch = 1 + num_groups;
        std::vector<absl::string_view> submatch(num_submatch);

        if(!regex_ptr->Match(text, 0, static_cast<int>(str.size()), RE2::UNANCHORED,
                             submatch.data(), num_submatch)) {
            return Value::null();
        }

        size_t match_index = submatch[0].data() - str.data();

        std::vector<Value> elements;
        elements.emplace_back(std::string(submatch[0]));
        for(int i = 1; i < num_submatch; ++i) {
            if(submatch[i].data() == nullptr) {
                elements.push_back(Value::undefined());
            } else {
                elements.emplace_back(std::string(submatch[i]));
            }
        }

        auto* result = Array::createArrayObject(getObjectFactory(), std::move(elements));
        result->setProperty("index", Value(static_cast<double>(match_index)));
        result->setProperty("input", Value(str));
        return Value(result);
    }

    // Global: return array of all matched strings
    std::vector<Value> matches;
    absl::string_view submatch;
    size_t start_pos = 0;

    while(start_pos <= str.size()) {
        if(!regex_ptr->Match(text, static_cast<int>(start_pos), static_cast<int>(str.size()),
                             RE2::UNANCHORED, &submatch, 1)) {
            break;
        }

        matches.emplace_back(std::string(submatch));

        size_t match_end = (submatch.data() - str.data()) + submatch.size();
        if(match_end == start_pos) {
            // Avoid infinite loop on zero-length match
            start_pos++;
        } else {
            start_pos = match_end;
        }
    }

    if(matches.empty()) {
        return Value::null();
    }

    // Reset lastIndex for global regexp
    if(data) {
        data->lastIndex = 0;
        if(args[0].isObject()) {
            args[0].getObject()->setProperty("lastIndex", Value(0.0));
        }
    }

    return Value(Array::createArrayObject(getObjectFactory(), std::move(matches)));
}

// ===== String.prototype.replace =====

// Helper: convert JS replacement pattern ($1, $&, etc.) to RE2 format (\1, \0, etc.)
static std::string convertReplacementPattern(const std::string& js_replacement,
                                             const std::string& full_match) {
    std::string result;
    result.reserve(js_replacement.size());

    for(size_t i = 0; i < js_replacement.size(); ++i) {
        if(js_replacement[i] == '$' && i + 1 < js_replacement.size()) {
            char next = js_replacement[i + 1];
            if(next == '&') {
                // $& -> full match
                result += full_match;
                ++i;
            } else if(next == '$') {
                // $$ -> literal $
                result += '$';
                ++i;
            } else if(next == '`') {
                // $` -> not supported yet, skip
                ++i;
            } else if(next == '\'') {
                // $' -> not supported yet, skip
                ++i;
            } else if(next >= '0' && next <= '9') {
                // $1-$9 -> \1-\9 (RE2 backreference)
                result += '\\';
                result += next;
                ++i;
                // Handle $10-$99
                if(i + 1 < js_replacement.size() && js_replacement[i + 1] >= '0' &&
                   js_replacement[i + 1] <= '9') {
                    result += js_replacement[i + 1];
                    ++i;
                }
            } else {
                result += '$';
            }
        } else {
            result += js_replacement[i];
        }
    }

    return result;
}

Value String::replace(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    if(args.empty()) {
        return Value(std::move(str));
    }

    Value search_value = args[0];
    Value replace_value = args.size() > 1 ? args[1] : Value::undefined();

    // Check if searchValue is a RegExp
    RegExpData* data = nullptr;
    if(search_value.isObject()) {
        data = RegExpRegistry::get(search_value.getObject());
    }

    if(data) {
        // RegExp replacement
        bool is_function = replace_value.isFunction();
        std::string replace_str = is_function ? "" : replace_value.toString();

        if(!is_function) {
            // String replacement with regex
            std::string result = str;

            if(data->global) {
                // Global replace: find all matches manually to support $& properly
                std::string output;
                absl::string_view text(str);
                size_t start_pos = 0;

                int num_groups = data->regex->NumberOfCapturingGroups();
                int num_submatch = 1 + num_groups;
                std::vector<absl::string_view> submatch(num_submatch);

                while(start_pos <= str.size()) {
                    if(!data->regex->Match(text, static_cast<int>(start_pos),
                                           static_cast<int>(str.size()), RE2::UNANCHORED,
                                           submatch.data(), num_submatch)) {
                        break;
                    }

                    size_t match_start = submatch[0].data() - str.data();
                    output += str.substr(start_pos, match_start - start_pos);

                    // Build replacement string with backreference support
                    std::string replacement =
                        convertReplacementPattern(replace_str, std::string(submatch[0]));
                    // Resolve \1, \2 etc. backreferences manually
                    std::string resolved;
                    for(size_t i = 0; i < replacement.size(); ++i) {
                        if(replacement[i] == '\\' && i + 1 < replacement.size() &&
                           replacement[i + 1] >= '0' && replacement[i + 1] <= '9') {
                            int group = replacement[i + 1] - '0';
                            // Check for two-digit group
                            if(i + 2 < replacement.size() && replacement[i + 2] >= '0' &&
                               replacement[i + 2] <= '9') {
                                int two_digit = group * 10 + (replacement[i + 2] - '0');
                                if(two_digit < num_submatch) {
                                    group = two_digit;
                                    ++i;  // skip extra digit
                                }
                            }
                            if(group < num_submatch && submatch[group].data() != nullptr) {
                                resolved += std::string(submatch[group]);
                            }
                            ++i;  // skip the digit
                        } else {
                            resolved += replacement[i];
                        }
                    }
                    output += resolved;

                    size_t match_end = match_start + submatch[0].size();
                    if(match_end == start_pos) {
                        if(start_pos < str.size()) {
                            output += str[start_pos];
                        }
                        start_pos++;
                    } else {
                        start_pos = match_end;
                    }
                }

                output += str.substr(start_pos);
                return Value(std::move(output));
            }

            // Non-global: replace first match only
            int num_groups = data->regex->NumberOfCapturingGroups();
            int num_submatch = 1 + num_groups;
            std::vector<absl::string_view> submatch(num_submatch);
            absl::string_view text(str);

            if(data->regex->Match(text, 0, static_cast<int>(str.size()), RE2::UNANCHORED,
                                  submatch.data(), num_submatch)) {
                size_t match_start = submatch[0].data() - str.data();
                std::string replacement =
                    convertReplacementPattern(replace_str, std::string(submatch[0]));
                // Resolve backreferences
                std::string resolved;
                for(size_t i = 0; i < replacement.size(); ++i) {
                    if(replacement[i] == '\\' && i + 1 < replacement.size() &&
                       replacement[i + 1] >= '0' && replacement[i + 1] <= '9') {
                        int group = replacement[i + 1] - '0';
                        if(i + 2 < replacement.size() && replacement[i + 2] >= '0' &&
                           replacement[i + 2] <= '9') {
                            int two_digit = group * 10 + (replacement[i + 2] - '0');
                            if(two_digit < num_submatch) {
                                group = two_digit;
                                ++i;
                            }
                        }
                        if(group < num_submatch && submatch[group].data() != nullptr) {
                            resolved += std::string(submatch[group]);
                        }
                        ++i;
                    } else {
                        resolved += replacement[i];
                    }
                }
                result = str.substr(0, match_start) + resolved +
                         str.substr(match_start + submatch[0].size());
            }

            return Value(std::move(result));
        }

        // Function replacement with regex
        auto* func = dynamic_cast<JSFunction*>(replace_value.getObject());
        if(!func) {
            return Value(std::move(str));
        }

        int num_groups = data->regex->NumberOfCapturingGroups();
        int num_submatch = 1 + num_groups;
        std::vector<absl::string_view> submatch(num_submatch);
        absl::string_view text(str);

        if(!data->global) {
            // Non-global function replacement: replace first match
            if(data->regex->Match(text, 0, static_cast<int>(str.size()), RE2::UNANCHORED,
                                  submatch.data(), num_submatch)) {
                size_t match_start = submatch[0].data() - str.data();

                // Call function with (match, group1, ..., index, str)
                std::vector<Value> call_args;
                call_args.emplace_back(std::string(submatch[0]));
                for(int i = 1; i < num_submatch; ++i) {
                    if(submatch[i].data() == nullptr) {
                        call_args.push_back(Value::undefined());
                    } else {
                        call_args.emplace_back(std::string(submatch[i]));
                    }
                }
                call_args.emplace_back(static_cast<double>(match_start));
                call_args.emplace_back(str);

                rift::core::CallContext cb_ctx(rift::core::CallType::Function,
                                              Value::undefined());
                Value replacement = func->call(cb_ctx, call_args);

                return Value(str.substr(0, match_start) + replacement.toString() +
                             str.substr(match_start + submatch[0].size()));
            }
            return Value(std::move(str));
        }

        // Global function replacement
        std::string output;
        size_t start_pos = 0;

        while(start_pos <= str.size()) {
            if(!data->regex->Match(text, static_cast<int>(start_pos),
                                   static_cast<int>(str.size()), RE2::UNANCHORED, submatch.data(),
                                   num_submatch)) {
                break;
            }

            size_t match_start = submatch[0].data() - str.data();
            output += str.substr(start_pos, match_start - start_pos);

            std::vector<Value> call_args;
            call_args.emplace_back(std::string(submatch[0]));
            for(int i = 1; i < num_submatch; ++i) {
                if(submatch[i].data() == nullptr) {
                    call_args.push_back(Value::undefined());
                } else {
                    call_args.emplace_back(std::string(submatch[i]));
                }
            }
            call_args.emplace_back(static_cast<double>(match_start));
            call_args.emplace_back(str);

            rift::core::CallContext cb_ctx(rift::core::CallType::Function, Value::undefined());
            Value replacement = func->call(cb_ctx, call_args);
            output += replacement.toString();

            size_t match_end = match_start + submatch[0].size();
            if(match_end == start_pos) {
                if(start_pos < str.size()) {
                    output += str[start_pos];
                }
                start_pos++;
            } else {
                start_pos = match_end;
            }
        }

        output += str.substr(start_pos);
        return Value(std::move(output));
    }

    // String search (not RegExp)
    std::string search_str = search_value.toString();
    size_t pos = str.find(search_str);

    if(pos == std::string::npos) {
        return Value(std::move(str));
    }

    if(replace_value.isFunction()) {
        auto* func = dynamic_cast<JSFunction*>(replace_value.getObject());
        if(!func) {
            return Value(std::move(str));
        }

        std::vector<Value> call_args;
        call_args.emplace_back(search_str);
        call_args.emplace_back(static_cast<double>(pos));
        call_args.emplace_back(str);

        rift::core::CallContext cb_ctx(rift::core::CallType::Function, Value::undefined());
        Value replacement = func->call(cb_ctx, call_args);

        return Value(str.substr(0, pos) + replacement.toString() +
                     str.substr(pos + search_str.size()));
    }

    // Simple string replacement (first occurrence only)
    // Process $$ -> $ and $& -> matched substring
    std::string raw_replace = replace_value.toString();
    std::string replace_str;
    replace_str.reserve(raw_replace.size());
    for(size_t i = 0; i < raw_replace.size(); ++i) {
        if(raw_replace[i] == '$' && i + 1 < raw_replace.size()) {
            if(raw_replace[i + 1] == '$') {
                replace_str += '$';
                ++i;
            } else if(raw_replace[i + 1] == '&') {
                replace_str += search_str;
                ++i;
            } else {
                replace_str += '$';
            }
        } else {
            replace_str += raw_replace[i];
        }
    }
    return Value(str.substr(0, pos) + replace_str + str.substr(pos + search_str.size()));
}

Value String::symbolIterator(const CallContext& ctx, const std::vector<Value>& /* args */) {
    // Get the string value from 'this'
    std::string str = extractThisString(ctx);
    return Value(StringIterator::create(getObjectFactory(), str));
}

}  // namespace rift::builtins
