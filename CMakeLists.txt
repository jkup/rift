cmake_minimum_required(VERSION 3.22)
project(Rift VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Enable compile_commands.json generation for clang-tidy
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Add cmake modules path
list(APPEND CMAKE_MODULE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/cmake)

# Include code quality tools
include(CodeQuality)
setup_code_quality()

# ===== Fetch dependencies for RegExp support =====
include(FetchContent)

# Fetch Abseil (required by RE2)
message(STATUS "Fetching Abseil (required by RE2)...")
FetchContent_Declare(
    abseil
    GIT_REPOSITORY https://github.com/abseil/abseil-cpp.git
    GIT_TAG        20240722.0  # Stable release
    GIT_SHALLOW    TRUE
)

# Disable Abseil testing and install
set(ABSL_PROPAGATE_CXX_STD ON CACHE BOOL "" FORCE)
set(BUILD_TESTING OFF CACHE BOOL "" FORCE)
set(ABSL_BUILD_TESTING OFF CACHE BOOL "" FORCE)
set(ABSL_ENABLE_INSTALL OFF CACHE BOOL "" FORCE)

FetchContent_MakeAvailable(abseil)
message(STATUS "Abseil is ready")

# Now fetch RE2
message(STATUS "Fetching RE2 for RegExp support...")
FetchContent_Declare(
    re2
    GIT_REPOSITORY https://github.com/google/re2.git
    GIT_TAG        2024-07-02  # Stable release
    GIT_SHALLOW    TRUE        # Only download this version
)

# Disable RE2 testing and install rules
set(RE2_BUILD_TESTING OFF CACHE BOOL "" FORCE)

# Fetch RE2 but handle install rules manually
FetchContent_GetProperties(re2)
if(NOT re2_POPULATED)
    FetchContent_Populate(re2)
    # Disable install rules for RE2 to avoid export conflicts with Abseil
    set(CMAKE_SKIP_INSTALL_RULES ON)
    add_subdirectory(${re2_SOURCE_DIR} ${re2_BINARY_DIR} EXCLUDE_FROM_ALL)
    set(CMAKE_SKIP_INSTALL_RULES OFF)
endif()
message(STATUS "RE2 is ready")

# ===== Fetch Corrosion for Rust integration =====
message(STATUS "Fetching Corrosion (Rust-CMake integration)...")
FetchContent_Declare(
    Corrosion
    GIT_REPOSITORY https://github.com/corrosion-rs/corrosion.git
    GIT_TAG        v0.5.1  # Latest stable release compatible with CMake 3.22
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(Corrosion)
message(STATUS "Corrosion is ready")

# ===== Fetch temporal_rs for Temporal support =====
message(STATUS "Fetching temporal_rs for Temporal support...")
FetchContent_Declare(
    temporal
    GIT_REPOSITORY https://github.com/boa-dev/temporal.git
    GIT_TAG        v0.1.2  # Latest stable release
    GIT_SHALLOW    TRUE
)
# Only populate (download source); corrosion handles the Rust build
FetchContent_GetProperties(temporal)
if(NOT temporal_POPULATED)
    FetchContent_Populate(temporal)
endif()

# Patch temporal_capi to build as staticlib (needed for C++ linking)
file(READ ${temporal_SOURCE_DIR}/temporal_capi/Cargo.toml TEMPORAL_CAPI_CARGO)
if(NOT "${TEMPORAL_CAPI_CARGO}" MATCHES "crate-type")
    file(APPEND ${temporal_SOURCE_DIR}/temporal_capi/Cargo.toml
        "\n[lib]\ncrate-type = [\"staticlib\"]\n"
    )
endif()

# Import temporal_capi Rust crate as a static library
corrosion_import_crate(
    MANIFEST_PATH ${temporal_SOURCE_DIR}/Cargo.toml
    CRATES temporal_capi
)
corrosion_set_features(temporal_capi FEATURES compiled_data)
message(STATUS "temporal_rs is ready")
# ====================================================

# Define source files organized by module
set(FRONTEND_SOURCES
    src/frontend/lexer/lexer.cpp
    src/frontend/parser/parser.cpp
    src/frontend/parser/parser_expressions.cpp
    src/frontend/parser/parser_statements.cpp
)

set(TYPES_SOURCES
    src/types/value.cpp
    src/types/object.cpp
    src/types/operations.cpp
)

set(EXECUTION_SOURCES
    src/execution/environment.cpp
    src/execution/microtask_queue.cpp
)

set(MEMORY_SOURCES
    src/memory/mark_sweep_gc.cpp
    src/memory/object_manager.cpp
    src/memory/gc_environment.cpp
    src/memory/gc_protector.cpp
    src/memory/gc_disabler.cpp
)

set(HOST_SOURCES
    src/host/console/console.cpp
)

set(BUILTINS_SOURCES
    src/builtins/builtin_manager.cpp
    src/builtins/math/math.cpp
    src/builtins/json/json.cpp
    src/builtins/global/global.cpp
    src/builtins/string/string.cpp
    src/builtins/string/string_iterator.cpp
    src/builtins/array/array.cpp
    src/builtins/array/array_mutators.cpp
    src/builtins/array/array_iterators.cpp
    src/builtins/array/array_accessors.cpp
    src/builtins/array/array_iterator.cpp
    src/builtins/object/object.cpp
    src/builtins/boolean/boolean.cpp
    src/builtins/number/number.cpp
    src/builtins/date/date.cpp
    src/builtins/error/error.cpp
    src/builtins/error/type_error.cpp
    src/builtins/error/reference_error.cpp
    src/builtins/error/syntax_error.cpp
    src/builtins/error/range_error.cpp
    src/builtins/error/eval_error.cpp
    src/builtins/error/uri_error.cpp
    src/builtins/regexp/regexp.cpp
    src/builtins/symbol/symbol.cpp
    src/builtins/iterator/iterator_prototype.cpp
    src/builtins/set/set.cpp
    src/builtins/set/set_iterator.cpp
    src/builtins/map/map.cpp
    src/builtins/map/map_iterator.cpp
    src/builtins/weakmap/weakmap.cpp
    src/builtins/weakset/weakset.cpp
    src/builtins/generator/generator_iterator.cpp
    src/builtins/promise/promise.cpp
    src/builtins/function/function.cpp
    src/builtins/temporal/temporal.cpp
    src/builtins/temporal/instant.cpp
    src/builtins/temporal/now.cpp
    src/builtins/temporal/duration.cpp
    src/builtins/temporal/plain_date.cpp
    src/builtins/temporal/plain_time.cpp
    src/builtins/temporal/plain_date_time.cpp
    src/builtins/temporal/plain_year_month.cpp
    src/builtins/temporal/plain_month_day.cpp
    src/builtins/temporal/zoned_date_time.cpp
)

set(INTERPRETER_SOURCES
    src/interpreter/engine.cpp
    src/interpreter/statement_evaluator.cpp
    src/interpreter/statement_evaluator_control_flow.cpp
    src/interpreter/statement_evaluator_exceptions.cpp
    src/interpreter/expression_evaluator.cpp
    src/interpreter/expression_evaluator_assignment.cpp
    src/interpreter/expression_evaluator_objects.cpp
    src/interpreter/generator_evaluator.cpp
    src/interpreter/async_executor.cpp
    src/interpreter/class_builder.cpp
)

set(API_SOURCES
    src/api/api.cpp
)

# Add the main executable
add_executable(rift
    src/main.cpp
    ${FRONTEND_SOURCES}
    ${TYPES_SOURCES}
    ${EXECUTION_SOURCES}
    ${MEMORY_SOURCES}
    ${BUILTINS_SOURCES}
    ${HOST_SOURCES}
    ${INTERPRETER_SOURCES}
    ${API_SOURCES}
    ${LEGACY_SOURCES}
)

target_include_directories(rift PRIVATE
    include
    src
    ${temporal_SOURCE_DIR}/temporal_capi/bindings/cpp
)

# Link RE2 (RegExp) and temporal_capi (Temporal) libraries
target_link_libraries(rift PRIVATE re2 temporal_capi)

# Enable debug symbols and warnings
target_compile_options(rift PRIVATE
    $<$<CXX_COMPILER_ID:GNU,Clang>:-Wall -Wextra -g>
    $<$<CXX_COMPILER_ID:MSVC>:/W4>
)

# Add GC debugging support (uncomment to enable GC debug output)
# target_compile_definitions(rift PRIVATE DEBUG_GC)

# Install target
install(TARGETS rift DESTINATION bin) 