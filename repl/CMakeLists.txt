cmake_minimum_required(VERSION 3.10)

# Set the project name
project(rift-repl)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Include directories
include_directories(../include)

# Find all source files from the main project (excluding main.cpp)
file(GLOB_RECURSE RIFT_SOURCES 
    "../src/api/*.cpp"
    "../src/core/*.cpp"
    "../src/frontend/*.cpp"
    "../src/builtins/*.cpp"
    "../src/memory/*.cpp"
    "../src/runtime/*.cpp"
)

# Remove main.cpp from the list if it exists
list(FILTER RIFT_SOURCES EXCLUDE REGEX ".*main\\.cpp$")

# Create the REPL executable
add_executable(rift-repl 
    main.cpp
    ${RIFT_SOURCES}
)

# Set output directory
set_target_properties(rift-repl PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
) 