#pragma once

#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "call_context.h"

namespace rift::core {

/**
 * Common helper functions for extracting "this" values from CallContext.
 * These eliminate duplicate code across builtins that all need to handle
 * both primitive values and their object wrapper equivalents.
 */

/**
 * Extract the "this" value as a JSObject pointer.
 * Used by Array, Error, RegExp, and other object-based builtins.
 *
 * @param ctx The call context containing the this value
 * @return JSObject* if this is an object, nullptr otherwise
 */
inline runtime::JSObject* extractThisObject(const CallContext& ctx) {
    if(ctx.thisValue.isObject()) {
        return ctx.thisValue.getObject();
    }
    return nullptr;
}

/**
 * Extract the "this" value as a string.
 * Handles both string primitives and String wrapper objects.
 *
 * @param ctx The call context containing the this value
 * @return The string value, either directly or from the "value" property
 */
inline std::string extractThisString(const CallContext& ctx) {
    const runtime::Value& thisValue = ctx.thisValue;

    // If it's a string primitive, return it directly
    if(thisValue.isString()) {
        return thisValue.getString();
    }

    // If it's a String object, check for "value" property
    if(thisValue.isObject()) {
        auto* obj = thisValue.getObject();
        if(obj) {
            runtime::Value valueProperty = obj->getProperty("value");
            if(valueProperty.isString()) {
                return valueProperty.getString();
            }
        }
    }

    // Fallback: convert to string
    return thisValue.toString();
}

/**
 * Extract the "this" value as a boolean.
 * Handles both boolean primitives and Boolean wrapper objects.
 *
 * @param ctx The call context containing the this value
 * @return The boolean value, either directly or from the "value" property
 */
inline bool extractThisBool(const CallContext& ctx) {
    const runtime::Value& thisValue = ctx.thisValue;

    // If it's a boolean primitive, return it directly
    if(thisValue.isBoolean()) {
        return thisValue.getBool();
    }

    // If it's a Boolean object, check for "value" property
    if(thisValue.isObject()) {
        auto* obj = thisValue.getObject();
        if(obj) {
            runtime::Value valueProperty = obj->getProperty("value");
            if(valueProperty.isBoolean()) {
                return valueProperty.getBool();
            }
        }
    }

    // Fallback: convert to boolean
    return thisValue.toBool();
}

/**
 * Extract the "this" value as a number.
 * Handles both number primitives and Number wrapper objects.
 *
 * @param ctx The call context containing the this value
 * @return The numeric value, either directly or from the "value" property
 */
inline double extractThisNumber(const CallContext& ctx) {
    const runtime::Value& thisValue = ctx.thisValue;

    // If it's a number primitive, return it directly
    if(thisValue.isNumber()) {
        return thisValue.toNumber();
    }

    // If it's a Number object, check for "value" property
    if(thisValue.isObject()) {
        auto* obj = thisValue.getObject();
        if(obj) {
            runtime::Value valueProperty = obj->getProperty("value");
            if(valueProperty.isNumber()) {
                return valueProperty.toNumber();
            }
        }
    }

    // Fallback: convert to number
    return thisValue.toNumber();
}

}  // namespace rift::core
