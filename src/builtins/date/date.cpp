#include "rift/builtins/date/date.h"

#include <chrono>
#include <cmath>
#include <ctime>
#include <iomanip>
#include <sstream>

#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_protector.h"

// ============================================================================
// ECMA-262 -- Date Objects
// @spec https://tc39.es/ecma262/#sec-date-objects
// ============================================================================

namespace rift::builtins {

using rift::core::CallContext;
using rift::core::JavaScriptException;

// ============================================================================
// 21.4.1 Overview of Date Objects and Definitions of Abstract Operations
// @spec
// https://tc39.es/ecma262/#sec-overview-of-date-objects-and-definitions-of-abstract-operations
// ============================================================================

static constexpr double MS_PER_SECOND = 1000.0;
static constexpr double MS_PER_MINUTE = 60000.0;
static constexpr double MS_PER_HOUR = 3600000.0;
static constexpr double MS_PER_DAY = 86400000.0;
// 21.4.1.1 Time Values and Time Range
static constexpr double MAX_TIME_VALUE = 8.64e15;

// Day names and month names for formatting
static const char* DAY_NAMES[] = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
static const char* MONTH_NAMES[] = {"Jan", "Feb", "Mar", "Apr", "May", "Jun",
                                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};

// 21.4.1.2 Day ( t )
static double Day(double t) {
    return std::floor(t / MS_PER_DAY);
}

// 21.4.1.3 TimeWithinDay ( t )
static double TimeWithinDay(double t) {
    double result = std::fmod(t, MS_PER_DAY);
    if(result < 0)
        result += MS_PER_DAY;
    return result;
}

// 21.4.1.4 DaysInYear ( y )
static double DaysInYear(double y) {
    if(std::fmod(y, 4.0) != 0.0)
        return 365.0;
    if(std::fmod(y, 100.0) != 0.0)
        return 366.0;
    if(std::fmod(y, 400.0) != 0.0)
        return 365.0;
    return 366.0;
}

// 21.4.1.5 DayFromYear ( y )
static double DayFromYear(double y) {
    return 365.0 * (y - 1970.0) + std::floor((y - 1969.0) / 4.0) -
           std::floor((y - 1901.0) / 100.0) + std::floor((y - 1601.0) / 400.0);
}

// 21.4.1.7 YearFromTime ( t )
static double YearFromTime(double t) {
    // Binary search approach for correctness
    double day = Day(t);
    // Estimate the year
    double y = std::floor(day / 365.2425) + 1970.0;
    // Adjust downward if necessary
    while(DayFromYear(y + 1) <= day) {
        y += 1.0;
    }
    while(DayFromYear(y) > day) {
        y -= 1.0;
    }
    return y;
}

// 21.4.1.8 InLeapYear ( t )
static double InLeapYear(double t) {
    return DaysInYear(YearFromTime(t)) == 366.0 ? 1.0 : 0.0;
}

// DayWithinYear helper
static double DayWithinYear(double t) {
    return Day(t) - DayFromYear(YearFromTime(t));
}

// 21.4.1.9 MonthFromTime ( t )
static double MonthFromTime(double t) {
    double d = DayWithinYear(t);
    double leap = InLeapYear(t);
    if(d < 31)
        return 0;
    if(d < 59 + leap)
        return 1;
    if(d < 90 + leap)
        return 2;
    if(d < 120 + leap)
        return 3;
    if(d < 151 + leap)
        return 4;
    if(d < 181 + leap)
        return 5;
    if(d < 212 + leap)
        return 6;
    if(d < 243 + leap)
        return 7;
    if(d < 273 + leap)
        return 8;
    if(d < 304 + leap)
        return 9;
    if(d < 334 + leap)
        return 10;
    return 11;
}

// 21.4.1.10 DateFromTime ( t )
static double DateFromTime(double t) {
    double d = DayWithinYear(t);
    double leap = InLeapYear(t);
    double m = MonthFromTime(t);
    if(m == 0)
        return d + 1;
    if(m == 1)
        return d - 30;
    if(m == 2)
        return d - 58 - leap;
    if(m == 3)
        return d - 89 - leap;
    if(m == 4)
        return d - 119 - leap;
    if(m == 5)
        return d - 150 - leap;
    if(m == 6)
        return d - 180 - leap;
    if(m == 7)
        return d - 211 - leap;
    if(m == 8)
        return d - 242 - leap;
    if(m == 9)
        return d - 272 - leap;
    if(m == 10)
        return d - 303 - leap;
    return d - 333 - leap;
}

// 21.4.1.11 WeekDay ( t )
static double WeekDay(double t) {
    double result = std::fmod(Day(t) + 4.0, 7.0);
    if(result < 0)
        result += 7.0;
    return result;
}

// 21.4.1.12 HourFromTime ( t )
static double HourFromTime(double t) {
    double result = std::fmod(std::floor(t / MS_PER_HOUR), 24.0);
    if(result < 0)
        result += 24.0;
    return result;
}

// 21.4.1.13 MinFromTime ( t )
static double MinFromTime(double t) {
    double result = std::fmod(std::floor(t / MS_PER_MINUTE), 60.0);
    if(result < 0)
        result += 60.0;
    return result;
}

// 21.4.1.14 SecFromTime ( t )
static double SecFromTime(double t) {
    double result = std::fmod(std::floor(t / MS_PER_SECOND), 60.0);
    if(result < 0)
        result += 60.0;
    return result;
}

// 21.4.1.15 msFromTime ( t )
static double msFromTime(double t) {
    double result = std::fmod(t, MS_PER_SECOND);
    if(result < 0)
        result += MS_PER_SECOND;
    return result;
}

// 21.4.1.16 MakeTime ( hour, min, sec, ms )
static double MakeTime(double hour, double min, double sec, double ms) {
    if(!std::isfinite(hour) || !std::isfinite(min) || !std::isfinite(sec) || !std::isfinite(ms)) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    double h = std::trunc(hour);
    double m = std::trunc(min);
    double s = std::trunc(sec);
    double milli = std::trunc(ms);
    return h * MS_PER_HOUR + m * MS_PER_MINUTE + s * MS_PER_SECOND + milli;
}

// 21.4.1.17 MakeDay ( year, month, date )
static double MakeDay(double year, double month, double date) {
    if(!std::isfinite(year) || !std::isfinite(month) || !std::isfinite(date)) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    double y = std::trunc(year);
    double m = std::trunc(month);
    double dt = std::trunc(date);

    // Adjust year by month overflow
    y += std::floor(m / 12.0);
    m = std::fmod(m, 12.0);
    if(m < 0)
        m += 12.0;

    // Find day number for the first of the target month/year
    // Using the cumulative days approach
    static const int MONTH_DAYS[] = {0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334};
    int mi = static_cast<int>(m);
    double day_from_year = DayFromYear(y);

    // Check if leap year
    bool is_leap = (DaysInYear(y) == 366.0);
    double month_start = MONTH_DAYS[mi];
    if(mi >= 2 && is_leap)
        month_start += 1.0;

    return day_from_year + month_start + dt - 1.0;
}

// 21.4.1.18 MakeDate ( day, time )
static double MakeDate(double day, double time) {
    if(!std::isfinite(day) || !std::isfinite(time)) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    return day * MS_PER_DAY + time;
}

// 21.4.1.19 TimeClip ( time )
static double TimeClip(double time) {
    if(!std::isfinite(time))
        return std::numeric_limits<double>::quiet_NaN();
    if(std::abs(time) > MAX_TIME_VALUE)
        return std::numeric_limits<double>::quiet_NaN();
    return std::trunc(time) + 0.0;  // +0.0 to convert -0 to +0
}

// ============================================================================
// Timezone helpers
// SIMPLIFIED: Uses C <ctime> for local timezone conversion.
// ============================================================================

// Get local timezone offset in milliseconds for a given UTC time
static double LocalTZA(double t) {
    if(!std::isfinite(t))
        return 0.0;
    // Clamp to time_t range to avoid overflow
    double seconds = t / 1000.0;
    if(seconds < -2147483648.0 || seconds > 2147483647.0)
        return 0.0;
    time_t epoch = static_cast<time_t>(seconds);
    struct tm utc_tm{};
    struct tm local_tm{};
    gmtime_r(&epoch, &utc_tm);
    localtime_r(&epoch, &local_tm);
    // Compute offset: local - utc in seconds
    double utc_secs =
        utc_tm.tm_hour * 3600.0 + utc_tm.tm_min * 60.0 + utc_tm.tm_sec + utc_tm.tm_yday * 86400.0;
    double local_secs = local_tm.tm_hour * 3600.0 + local_tm.tm_min * 60.0 + local_tm.tm_sec +
                        local_tm.tm_yday * 86400.0;
    // Handle year boundary differences
    if(utc_tm.tm_year != local_tm.tm_year) {
        if(local_tm.tm_year > utc_tm.tm_year) {
            local_secs += 365.0 * 86400.0;
        } else {
            utc_secs += 365.0 * 86400.0;
        }
    }
    return (local_secs - utc_secs) * 1000.0;
}

// UTC to local time
static double LocalTime(double t) {
    return t + LocalTZA(t);
}

// Local time to UTC
static double UTCTime(double t) {
    // Approximate: apply negative offset
    double offset = LocalTZA(t);
    return t - offset;
}

// ============================================================================
// Internal helpers
// ============================================================================

// Get current time in milliseconds since epoch
static double currentTimeMs() {
    auto now = std::chrono::system_clock::now();
    auto duration = now.time_since_epoch();
    auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(duration).count();
    return static_cast<double>(millis);
}

// Extract [[TimeValue]] from a Date object, throw TypeError if not a Date
static double extractThisDateValue(const CallContext& ctx) {
    if(!ctx.thisValue.isObject()) {
        throw JavaScriptException(
            Value("TypeError: Date.prototype method called on incompatible receiver"));
    }
    auto* obj = ctx.thisValue.getObject();
    Value tv = obj->getProperty("[[TimeValue]]");
    if(tv.isUndefined()) {
        throw JavaScriptException(Value("TypeError: this is not a Date object"));
    }
    return tv.toNumber();
}

// Create a Date object with the given time value
static Value createDateObject(double t, rift::memory::ObjectFactory* factory) {
    auto* prototype = rift::core::BuiltinManager::getDatePrototype();
    auto* obj = factory->createJSObject(prototype);
    rift::memory::GCProtector protect(obj, factory->getObjectManager());
    obj->setProperty("[[TimeValue]]", Value(t));
    return Value(obj);
}

// ============================================================================
// ISO 8601 date parsing (basic subset)
// SIMPLIFIED: Only handles ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
// and common variants. Full Date.parse is implementation-defined.
// ============================================================================

static double parseISODate(const std::string& str) {
    // Try ISO 8601: YYYY-MM-DDTHH:mm:ss.sssZ
    int year = 0, month = 1, day = 1;
    int hour = 0, min = 0, sec = 0, ms = 0;
    bool has_time = false;
    bool is_utc = false;
    int tz_sign = 0, tz_hour = 0, tz_min = 0;

    const char* p = str.c_str();
    // Skip leading whitespace
    while(*p == ' ' || *p == '\t')
        p++;

    // Parse year (may be negative or have + prefix for extended years)
    bool neg_year = false;
    if(*p == '+' || *p == '-') {
        neg_year = (*p == '-');
        p++;
    }
    const char* year_start = p;
    while(*p >= '0' && *p <= '9')
        p++;
    if(p == year_start)
        return std::numeric_limits<double>::quiet_NaN();
    std::string year_str(year_start, p);
    year = std::stoi(year_str);
    if(neg_year)
        year = -year;

    // Parse month
    if(*p == '-') {
        p++;
        if(p[0] >= '0' && p[0] <= '9' && p[1] >= '0' && p[1] <= '9') {
            month = (p[0] - '0') * 10 + (p[1] - '0');
            p += 2;
        }
    }

    // Parse day
    if(*p == '-') {
        p++;
        if(p[0] >= '0' && p[0] <= '9' && p[1] >= '0' && p[1] <= '9') {
            day = (p[0] - '0') * 10 + (p[1] - '0');
            p += 2;
        }
    }

    // Parse time
    if(*p == 'T' || *p == 't' || *p == ' ') {
        has_time = true;
        p++;
        // Hours
        if(p[0] >= '0' && p[0] <= '9' && p[1] >= '0' && p[1] <= '9') {
            hour = (p[0] - '0') * 10 + (p[1] - '0');
            p += 2;
        }
        if(*p == ':')
            p++;
        // Minutes
        if(p[0] >= '0' && p[0] <= '9' && p[1] >= '0' && p[1] <= '9') {
            min = (p[0] - '0') * 10 + (p[1] - '0');
            p += 2;
        }
        if(*p == ':')
            p++;
        // Seconds
        if(p[0] >= '0' && p[0] <= '9' && p[1] >= '0' && p[1] <= '9') {
            sec = (p[0] - '0') * 10 + (p[1] - '0');
            p += 2;
        }
        // Milliseconds
        if(*p == '.') {
            p++;
            int frac = 0;
            int digits = 0;
            while(*p >= '0' && *p <= '9' && digits < 3) {
                frac = frac * 10 + (*p - '0');
                digits++;
                p++;
            }
            // Pad to 3 digits
            while(digits < 3) {
                frac *= 10;
                digits++;
            }
            ms = frac;
            // Skip remaining fractional digits
            while(*p >= '0' && *p <= '9')
                p++;
        }
    }

    // Timezone
    if(*p == 'Z' || *p == 'z') {
        is_utc = true;
        p++;
    } else if(*p == '+' || *p == '-') {
        is_utc = true;
        tz_sign = (*p == '+') ? 1 : -1;
        p++;
        if(p[0] >= '0' && p[0] <= '9' && p[1] >= '0' && p[1] <= '9') {
            tz_hour = (p[0] - '0') * 10 + (p[1] - '0');
            p += 2;
        }
        if(*p == ':')
            p++;
        if(p[0] >= '0' && p[0] <= '9' && p[1] >= '0' && p[1] <= '9') {
            tz_min = (p[0] - '0') * 10 + (p[1] - '0');
            p += 2;
        }
    } else if(!has_time) {
        // Date-only forms are treated as UTC per spec
        is_utc = true;
    }

    // Skip trailing whitespace
    while(*p == ' ' || *p == '\t')
        p++;
    if(*p != '\0')
        return std::numeric_limits<double>::quiet_NaN();

    // Validate ranges
    if(month < 1 || month > 12)
        return std::numeric_limits<double>::quiet_NaN();
    if(day < 1 || day > 31)
        return std::numeric_limits<double>::quiet_NaN();
    if(hour < 0 || hour > 24)
        return std::numeric_limits<double>::quiet_NaN();
    if(min < 0 || min > 59)
        return std::numeric_limits<double>::quiet_NaN();
    if(sec < 0 || sec > 59)
        return std::numeric_limits<double>::quiet_NaN();

    // Compute time value
    double day_val = MakeDay(year, month - 1.0, day);
    double time_val = MakeTime(hour, min, sec, ms);
    double date_val = MakeDate(day_val, time_val);

    if(is_utc && tz_sign != 0) {
        date_val -= tz_sign * (tz_hour * MS_PER_HOUR + tz_min * MS_PER_MINUTE);
    } else if(!is_utc) {
        // Local time: convert to UTC
        date_val = UTCTime(date_val);
    }

    return TimeClip(date_val);
}

// ============================================================================
// Formatting helpers
// ============================================================================

// Format timezone offset as "+HHmm" or "-HHmm"
static std::string formatTZOffset(double t) {
    double offset_ms = LocalTZA(t);
    int offset_min = static_cast<int>(offset_ms / MS_PER_MINUTE);
    char sign = offset_min >= 0 ? '+' : '-';
    int abs_offset = std::abs(offset_min);
    int h = abs_offset / 60;
    int m = abs_offset % 60;
    std::ostringstream oss;
    oss << sign << std::setfill('0') << std::setw(2) << h << std::setw(2) << m;
    return oss.str();
}

// Format: "Thu Jan 01 1970"
static std::string formatDatePart(double t) {
    double lt = LocalTime(t);
    int wd = static_cast<int>(WeekDay(lt));
    int mon = static_cast<int>(MonthFromTime(lt));
    int d = static_cast<int>(DateFromTime(lt));
    int y = static_cast<int>(YearFromTime(lt));
    std::ostringstream oss;
    oss << DAY_NAMES[wd] << " " << MONTH_NAMES[mon] << " " << std::setfill('0') << std::setw(2) << d
        << " ";
    if(y < 0) {
        oss << "-" << std::setfill('0') << std::setw(6) << -y;
    } else if(y > 9999) {
        oss << "+" << std::setfill('0') << std::setw(6) << y;
    } else {
        oss << std::setfill('0') << std::setw(4) << y;
    }
    return oss.str();
}

// Format: "00:00:00 GMT+0000"
static std::string formatTimePart(double t) {
    double lt = LocalTime(t);
    int h = static_cast<int>(HourFromTime(lt));
    int m = static_cast<int>(MinFromTime(lt));
    int s = static_cast<int>(SecFromTime(lt));
    std::ostringstream oss;
    oss << std::setfill('0') << std::setw(2) << h << ":" << std::setw(2) << m << ":" << std::setw(2)
        << s << " GMT" << formatTZOffset(t);
    return oss.str();
}

// Format full: "Thu Jan 01 1970 00:00:00 GMT+0000"
static std::string formatToString(double t) {
    return formatDatePart(t) + " " + formatTimePart(t);
}

// ============================================================================
// 21.4.2.1 Date ( ...values )
// @spec https://tc39.es/ecma262/#sec-date
// ============================================================================

Value Date::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();

    // If called without new, return a string representation of the current date
    if(!ctx.isConstructorCall()) {
        return Value(formatToString(currentTimeMs()));
    }

    double time_value;

    if(args.empty()) {
        // new Date() - current time
        time_value = currentTimeMs();
    } else if(args.size() == 1) {
        // new Date(value)
        Value v = args[0];
        if(v.isString()) {
            // Parse the string
            time_value = parseISODate(v.getString());
        } else {
            // ToNumber
            time_value = TimeClip(v.toNumber());
        }
    } else {
        // new Date(year, month, ...) - component form
        double y = args[0].toNumber();
        double m = args.size() > 1 ? args[1].toNumber() : 0.0;
        double dt = args.size() > 2 ? args[2].toNumber() : 1.0;
        double h = args.size() > 3 ? args[3].toNumber() : 0.0;
        double min = args.size() > 4 ? args[4].toNumber() : 0.0;
        double sec = args.size() > 5 ? args[5].toNumber() : 0.0;
        double ms = args.size() > 6 ? args[6].toNumber() : 0.0;

        // Year 0-99 adjustment: map to 1900-1999
        double yr = y;
        if(!std::isnan(y)) {
            double integer_y = std::trunc(y);
            if(integer_y >= 0.0 && integer_y <= 99.0) {
                yr = 1900.0 + integer_y;
            }
        }

        double day = MakeDay(yr, m, dt);
        double time = MakeTime(h, min, sec, ms);
        time_value = TimeClip(UTCTime(MakeDate(day, time)));
    }

    return createDateObject(time_value, factory);
}

// ============================================================================
// 21.4.3 Properties of the Date Constructor (Static Methods)
// ============================================================================

// 21.4.3.1 Date.now ( )
Value Date::now(const CallContext& /*ctx*/, const std::vector<Value>& /*args*/) {
    return Value(currentTimeMs());
}

// 21.4.3.2 Date.parse ( string )
Value Date::parse(const CallContext& /*ctx*/, const std::vector<Value>& args) {
    if(args.empty())
        return Value(std::numeric_limits<double>::quiet_NaN());
    std::string str = args[0].toString();
    return Value(parseISODate(str));
}

// 21.4.3.4 Date.UTC ( year, month, ... )
Value Date::UTC(const CallContext& /*ctx*/, const std::vector<Value>& args) {
    if(args.empty())
        return Value(std::numeric_limits<double>::quiet_NaN());

    double y = args[0].toNumber();
    double m = args.size() > 1 ? args[1].toNumber() : 0.0;
    double dt = args.size() > 2 ? args[2].toNumber() : 1.0;
    double h = args.size() > 3 ? args[3].toNumber() : 0.0;
    double min = args.size() > 4 ? args[4].toNumber() : 0.0;
    double sec = args.size() > 5 ? args[5].toNumber() : 0.0;
    double ms = args.size() > 6 ? args[6].toNumber() : 0.0;

    // Year 0-99 adjustment for Date.UTC as well
    double yr = y;
    if(!std::isnan(y)) {
        double integer_y = std::trunc(y);
        if(integer_y >= 0.0 && integer_y <= 99.0) {
            yr = 1900.0 + integer_y;
        }
    }

    double day = MakeDay(yr, m, dt);
    double time = MakeTime(h, min, sec, ms);
    return Value(TimeClip(MakeDate(day, time)));
}

// ============================================================================
// 21.4.4 Prototype Getters
// ============================================================================

Value Date::getDate(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(DateFromTime(LocalTime(t)));
}

Value Date::getDay(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(WeekDay(LocalTime(t)));
}

Value Date::getFullYear(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(YearFromTime(LocalTime(t)));
}

Value Date::getHours(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(HourFromTime(LocalTime(t)));
}

Value Date::getMilliseconds(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(msFromTime(LocalTime(t)));
}

Value Date::getMinutes(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(MinFromTime(LocalTime(t)));
}

Value Date::getMonth(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(MonthFromTime(LocalTime(t)));
}

Value Date::getSeconds(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(SecFromTime(LocalTime(t)));
}

Value Date::getTime(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    return Value(extractThisDateValue(ctx));
}

Value Date::getTimezoneOffset(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    // Returns (t - LocalTime(t)) / msPerMinute, which is -(offset in minutes)
    return Value((t - LocalTime(t)) / MS_PER_MINUTE);
}

// UTC getters
Value Date::getUTCDate(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(DateFromTime(t));
}

Value Date::getUTCDay(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(WeekDay(t));
}

Value Date::getUTCFullYear(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(YearFromTime(t));
}

Value Date::getUTCHours(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(HourFromTime(t));
}

Value Date::getUTCMilliseconds(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(msFromTime(t));
}

Value Date::getUTCMinutes(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(MinFromTime(t));
}

Value Date::getUTCMonth(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(MonthFromTime(t));
}

Value Date::getUTCSeconds(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(SecFromTime(t));
}

// ============================================================================
// 21.4.4 Prototype Setters
// ============================================================================

Value Date::setDate(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let t be ? thisTimeValue(this value).
    double t = extractThisDateValue(ctx);
    // 2. Let dt be ? ToNumber(date).
    double dt = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    // 3. If t is NaN, return NaN.
    if(std::isnan(t)) {
        ctx.thisValue.getObject()->setProperty("[[TimeValue]]",
                                               Value(std::numeric_limits<double>::quiet_NaN()));
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
    // 4. Set t to LocalTime(t).
    t = LocalTime(t);
    double new_date = MakeDate(MakeDay(YearFromTime(t), MonthFromTime(t), dt), TimeWithinDay(t));
    double u = TimeClip(UTCTime(new_date));
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(u));
    return Value(u);
}

Value Date::setFullYear(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let t be ? thisTimeValue(this value).
    double t = extractThisDateValue(ctx);
    // 2. Let y be ? ToNumber(year).
    double y = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    // 3. If t is NaN, set t to +0.
    if(std::isnan(t))
        t = 0.0;
    // 4. Set t to LocalTime(t).
    t = LocalTime(t);
    // 5-6. Let m and dt be from args or current components.
    double m = args.size() > 1 ? args[1].toNumber() : MonthFromTime(t);
    double dt = args.size() > 2 ? args[2].toNumber() : DateFromTime(t);
    double new_date = MakeDate(MakeDay(y, m, dt), TimeWithinDay(t));
    double u = TimeClip(UTCTime(new_date));
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(u));
    return Value(u);
}

Value Date::setHours(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let t be ? thisTimeValue(this value).
    double t = extractThisDateValue(ctx);
    // 2. Let h be ? ToNumber(hour).
    double h = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    // 3-5. Let m, s, ms from args.
    double m = args.size() > 1 ? args[1].toNumber() : 0.0;   // placeholder
    double s = args.size() > 2 ? args[2].toNumber() : 0.0;   // placeholder
    double ms = args.size() > 3 ? args[3].toNumber() : 0.0;  // placeholder
    // 6. If t is NaN, return NaN.
    if(std::isnan(t)) {
        ctx.thisValue.getObject()->setProperty("[[TimeValue]]",
                                               Value(std::numeric_limits<double>::quiet_NaN()));
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
    // 7. Set t to LocalTime(t).
    t = LocalTime(t);
    // Fill in defaults from t for args not provided.
    if(args.size() <= 1)
        m = MinFromTime(t);
    if(args.size() <= 2)
        s = SecFromTime(t);
    if(args.size() <= 3)
        ms = msFromTime(t);
    double new_date = MakeDate(Day(t), MakeTime(h, m, s, ms));
    double u = TimeClip(UTCTime(new_date));
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(u));
    return Value(u);
}

Value Date::setMilliseconds(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let t be ? thisTimeValue(this value).
    double t = extractThisDateValue(ctx);
    // 2. Let ms be ? ToNumber(ms).
    double ms = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    // 3. If t is NaN, return NaN.
    if(std::isnan(t)) {
        ctx.thisValue.getObject()->setProperty("[[TimeValue]]",
                                               Value(std::numeric_limits<double>::quiet_NaN()));
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
    // 4. Set t to LocalTime(t).
    t = LocalTime(t);
    double time = MakeTime(HourFromTime(t), MinFromTime(t), SecFromTime(t), ms);
    double u = TimeClip(UTCTime(MakeDate(Day(t), time)));
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(u));
    return Value(u);
}

Value Date::setMinutes(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let t be ? thisTimeValue(this value).
    double t = extractThisDateValue(ctx);
    // 2. Let m be ? ToNumber(min).
    double m = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    // 3-4. Let s, ms from args.
    double s = args.size() > 1 ? args[1].toNumber() : 0.0;   // placeholder
    double ms = args.size() > 2 ? args[2].toNumber() : 0.0;  // placeholder
    // 5. If t is NaN, return NaN.
    if(std::isnan(t)) {
        ctx.thisValue.getObject()->setProperty("[[TimeValue]]",
                                               Value(std::numeric_limits<double>::quiet_NaN()));
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
    // 6. Set t to LocalTime(t).
    t = LocalTime(t);
    // Fill in defaults from t for args not provided.
    if(args.size() <= 1)
        s = SecFromTime(t);
    if(args.size() <= 2)
        ms = msFromTime(t);
    double time = MakeTime(HourFromTime(t), m, s, ms);
    double u = TimeClip(UTCTime(MakeDate(Day(t), time)));
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(u));
    return Value(u);
}

Value Date::setMonth(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let t be ? thisTimeValue(this value).
    double t = extractThisDateValue(ctx);
    // 2. Let m be ? ToNumber(month).
    double m = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    // 3. Let dt from args.
    double dt = args.size() > 1 ? args[1].toNumber() : 0.0;  // placeholder
    // 4. If t is NaN, return NaN.
    if(std::isnan(t)) {
        ctx.thisValue.getObject()->setProperty("[[TimeValue]]",
                                               Value(std::numeric_limits<double>::quiet_NaN()));
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
    // 5. Set t to LocalTime(t).
    t = LocalTime(t);
    // Fill in default for dt if not provided.
    if(args.size() <= 1)
        dt = DateFromTime(t);
    double new_date = MakeDate(MakeDay(YearFromTime(t), m, dt), TimeWithinDay(t));
    double u = TimeClip(UTCTime(new_date));
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(u));
    return Value(u);
}

Value Date::setSeconds(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let t be ? thisTimeValue(this value).
    double t = extractThisDateValue(ctx);
    // 2. Let s be ? ToNumber(sec).
    double s = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    // 3. Let ms from args.
    double ms = args.size() > 1 ? args[1].toNumber() : 0.0;  // placeholder
    // 4. If t is NaN, return NaN.
    if(std::isnan(t)) {
        ctx.thisValue.getObject()->setProperty("[[TimeValue]]",
                                               Value(std::numeric_limits<double>::quiet_NaN()));
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
    // 5. Set t to LocalTime(t).
    t = LocalTime(t);
    // Fill in default for ms if not provided.
    if(args.size() <= 1)
        ms = msFromTime(t);
    double time = MakeTime(HourFromTime(t), MinFromTime(t), s, ms);
    double u = TimeClip(UTCTime(MakeDate(Day(t), time)));
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(u));
    return Value(u);
}

Value Date::setTime(const CallContext& ctx, const std::vector<Value>& args) {
    extractThisDateValue(ctx);  // Type check
    double t = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    double v = TimeClip(t);
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(v));
    return Value(v);
}

// UTC setters
Value Date::setUTCDate(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let t be ? thisTimeValue(this value).
    double t = extractThisDateValue(ctx);
    // 2. Let dt be ? ToNumber(date).
    double dt = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    // 3. If t is NaN, return NaN.
    if(std::isnan(t)) {
        ctx.thisValue.getObject()->setProperty("[[TimeValue]]",
                                               Value(std::numeric_limits<double>::quiet_NaN()));
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
    double new_date = MakeDate(MakeDay(YearFromTime(t), MonthFromTime(t), dt), TimeWithinDay(t));
    double v = TimeClip(new_date);
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(v));
    return Value(v);
}

Value Date::setUTCFullYear(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let t be ? thisTimeValue(this value).
    double t = extractThisDateValue(ctx);
    // 2. Let y be ? ToNumber(year).
    double y = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    // 3. If t is NaN, set t to +0.
    if(std::isnan(t))
        t = 0.0;
    // 4-5. Let m, dt from args or current components.
    double m = args.size() > 1 ? args[1].toNumber() : MonthFromTime(t);
    double dt = args.size() > 2 ? args[2].toNumber() : DateFromTime(t);
    double new_date = MakeDate(MakeDay(y, m, dt), TimeWithinDay(t));
    double v = TimeClip(new_date);
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(v));
    return Value(v);
}

Value Date::setUTCHours(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let t be ? thisTimeValue(this value).
    double t = extractThisDateValue(ctx);
    // 2. Let h be ? ToNumber(hour).
    double h = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    // 3-5. Let m, s, ms from args.
    double m = args.size() > 1 ? args[1].toNumber() : 0.0;   // placeholder
    double s = args.size() > 2 ? args[2].toNumber() : 0.0;   // placeholder
    double ms = args.size() > 3 ? args[3].toNumber() : 0.0;  // placeholder
    // 6. If t is NaN, return NaN.
    if(std::isnan(t)) {
        ctx.thisValue.getObject()->setProperty("[[TimeValue]]",
                                               Value(std::numeric_limits<double>::quiet_NaN()));
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
    // Fill in defaults from t for args not provided.
    if(args.size() <= 1)
        m = MinFromTime(t);
    if(args.size() <= 2)
        s = SecFromTime(t);
    if(args.size() <= 3)
        ms = msFromTime(t);
    double new_date = MakeDate(Day(t), MakeTime(h, m, s, ms));
    double v = TimeClip(new_date);
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(v));
    return Value(v);
}

Value Date::setUTCMilliseconds(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let t be ? thisTimeValue(this value).
    double t = extractThisDateValue(ctx);
    // 2. Let ms be ? ToNumber(ms).
    double ms = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    // 3. If t is NaN, return NaN.
    if(std::isnan(t)) {
        ctx.thisValue.getObject()->setProperty("[[TimeValue]]",
                                               Value(std::numeric_limits<double>::quiet_NaN()));
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
    double time = MakeTime(HourFromTime(t), MinFromTime(t), SecFromTime(t), ms);
    double v = TimeClip(MakeDate(Day(t), time));
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(v));
    return Value(v);
}

Value Date::setUTCMinutes(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let t be ? thisTimeValue(this value).
    double t = extractThisDateValue(ctx);
    // 2. Let m be ? ToNumber(min).
    double m = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    // 3-4. Let s, ms from args.
    double s = args.size() > 1 ? args[1].toNumber() : 0.0;   // placeholder
    double ms = args.size() > 2 ? args[2].toNumber() : 0.0;  // placeholder
    // 5. If t is NaN, return NaN.
    if(std::isnan(t)) {
        ctx.thisValue.getObject()->setProperty("[[TimeValue]]",
                                               Value(std::numeric_limits<double>::quiet_NaN()));
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
    // Fill in defaults from t for args not provided.
    if(args.size() <= 1)
        s = SecFromTime(t);
    if(args.size() <= 2)
        ms = msFromTime(t);
    double time = MakeTime(HourFromTime(t), m, s, ms);
    double v = TimeClip(MakeDate(Day(t), time));
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(v));
    return Value(v);
}

Value Date::setUTCMonth(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let t be ? thisTimeValue(this value).
    double t = extractThisDateValue(ctx);
    // 2. Let m be ? ToNumber(month).
    double m = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    // 3. Let dt from args.
    double dt = args.size() > 1 ? args[1].toNumber() : 0.0;  // placeholder
    // 4. If t is NaN, return NaN.
    if(std::isnan(t)) {
        ctx.thisValue.getObject()->setProperty("[[TimeValue]]",
                                               Value(std::numeric_limits<double>::quiet_NaN()));
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
    // Fill in default for dt if not provided.
    if(args.size() <= 1)
        dt = DateFromTime(t);
    double new_date = MakeDate(MakeDay(YearFromTime(t), m, dt), TimeWithinDay(t));
    double v = TimeClip(new_date);
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(v));
    return Value(v);
}

Value Date::setUTCSeconds(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let t be ? thisTimeValue(this value).
    double t = extractThisDateValue(ctx);
    // 2. Let s be ? ToNumber(sec).
    double s = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    // 3. Let ms from args.
    double ms = args.size() > 1 ? args[1].toNumber() : 0.0;  // placeholder
    // 4. If t is NaN, return NaN.
    if(std::isnan(t)) {
        ctx.thisValue.getObject()->setProperty("[[TimeValue]]",
                                               Value(std::numeric_limits<double>::quiet_NaN()));
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
    // Fill in default for ms if not provided.
    if(args.size() <= 1)
        ms = msFromTime(t);
    double time = MakeTime(HourFromTime(t), MinFromTime(t), s, ms);
    double v = TimeClip(MakeDate(Day(t), time));
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(v));
    return Value(v);
}

// ============================================================================
// Annex B Methods
// ============================================================================

// B.2.4.1 Date.prototype.getYear ( )
Value Date::getYear(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::numeric_limits<double>::quiet_NaN());
    return Value(YearFromTime(LocalTime(t)) - 1900.0);
}

// B.2.4.2 Date.prototype.setYear ( year )
Value Date::setYear(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let t be ? thisTimeValue(this value).
    double t = extractThisDateValue(ctx);
    // 2. Let y be ? ToNumber(year).
    double y = args.empty() ? std::numeric_limits<double>::quiet_NaN() : args[0].toNumber();
    // 3. If y is NaN, set [[DateValue]] to NaN and return NaN.
    if(std::isnan(y)) {
        ctx.thisValue.getObject()->setProperty("[[TimeValue]]",
                                               Value(std::numeric_limits<double>::quiet_NaN()));
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
    // 4. Let yi be ! ToIntegerOrInfinity(y).
    double yi = std::trunc(y);
    // 5. If 0 <= yi <= 99, let yyyy be yi + 1900. Otherwise let yyyy be y.
    double yyyy = (yi >= 0.0 && yi <= 99.0) ? yi + 1900.0 : y;
    // 6. If t is NaN, set t to +0.
    if(std::isnan(t))
        t = 0.0;
    // 7. Set t to LocalTime(t).
    t = LocalTime(t);
    double new_date = MakeDate(MakeDay(yyyy, MonthFromTime(t), DateFromTime(t)), TimeWithinDay(t));
    double u = TimeClip(UTCTime(new_date));
    ctx.thisValue.getObject()->setProperty("[[TimeValue]]", Value(u));
    return Value(u);
}

// ============================================================================
// 21.4.4 Conversion Methods
// ============================================================================

Value Date::toDateString(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::string("Invalid Date"));
    return Value(formatDatePart(t));
}

Value Date::toISOString(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t)) {
        throw JavaScriptException(Value("RangeError: Invalid time value"));
    }
    int y = static_cast<int>(YearFromTime(t));
    int m = static_cast<int>(MonthFromTime(t)) + 1;
    int d = static_cast<int>(DateFromTime(t));
    int h = static_cast<int>(HourFromTime(t));
    int min = static_cast<int>(MinFromTime(t));
    int s = static_cast<int>(SecFromTime(t));
    int ms = static_cast<int>(msFromTime(t));
    std::ostringstream oss;
    if(y < 0) {
        oss << "-" << std::setfill('0') << std::setw(6) << -y;
    } else if(y > 9999) {
        oss << "+" << std::setfill('0') << std::setw(6) << y;
    } else {
        oss << std::setfill('0') << std::setw(4) << y;
    }
    oss << "-" << std::setfill('0') << std::setw(2) << m << "-" << std::setw(2) << d << "T"
        << std::setw(2) << h << ":" << std::setw(2) << min << ":" << std::setw(2) << s << "."
        << std::setw(3) << ms << "Z";
    return Value(oss.str());
}

Value Date::toJSON(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    // 21.4.4.37 Date.prototype.toJSON ( key )
    // 1. Let O be ? ToObject(this value).
    // 2. Let tv be ? ToPrimitive(O, number).
    double t = extractThisDateValue(ctx);
    // 3. If tv is a Number and tv is not finite, return null.
    if(!std::isfinite(t))
        return Value::null();
    // 4. Return ? Invoke(O, "toISOString").
    return toISOString(ctx, {});
}

// SIMPLIFIED: No Intl support - delegate to basic formatters
Value Date::toLocaleDateString(const CallContext& ctx, const std::vector<Value>& args) {
    return toDateString(ctx, args);
}

Value Date::toLocaleString(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

Value Date::toLocaleTimeString(const CallContext& ctx, const std::vector<Value>& args) {
    return toTimeString(ctx, args);
}

Value Date::toString(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::string("Invalid Date"));
    return Value(formatToString(t));
}

Value Date::toTimeString(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::string("Invalid Date"));
    return Value(formatTimePart(t));
}

Value Date::toUTCString(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    double t = extractThisDateValue(ctx);
    if(std::isnan(t))
        return Value(std::string("Invalid Date"));
    int wd = static_cast<int>(WeekDay(t));
    int d = static_cast<int>(DateFromTime(t));
    int mon = static_cast<int>(MonthFromTime(t));
    int y = static_cast<int>(YearFromTime(t));
    int h = static_cast<int>(HourFromTime(t));
    int min = static_cast<int>(MinFromTime(t));
    int s = static_cast<int>(SecFromTime(t));
    std::ostringstream oss;
    oss << DAY_NAMES[wd] << ", " << std::setfill('0') << std::setw(2) << d << " "
        << MONTH_NAMES[mon] << " ";
    if(y < 0) {
        oss << "-" << std::setfill('0') << std::setw(6) << -y;
    } else if(y > 9999) {
        oss << "+" << std::setfill('0') << std::setw(6) << y;
    } else {
        oss << std::setfill('0') << std::setw(4) << y;
    }
    oss << " " << std::setfill('0') << std::setw(2) << h << ":" << std::setw(2) << min << ":"
        << std::setw(2) << s << " GMT";
    return Value(oss.str());
}

Value Date::valueOf(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    return Value(extractThisDateValue(ctx));
}

// 21.4.4.45 Date.prototype [ @@toPrimitive ] ( hint )
Value Date::toPrimitive(const CallContext& ctx, const std::vector<Value>& args) {
    if(!ctx.thisValue.isObject()) {
        throw JavaScriptException(
            Value("TypeError: Date.prototype[@@toPrimitive] requires object"));
    }
    std::string hint = args.empty() ? "default" : args[0].toString();

    if(hint == "string" || hint == "default") {
        // For "string" and "default" hints, return toString
        return toString(ctx, {});
    } else if(hint == "number") {
        // For "number" hint, return valueOf
        return valueOf(ctx, {});
    } else {
        throw JavaScriptException(Value("TypeError: Invalid hint: " + hint));
    }
}

// ============================================================================
// Setup methods
// ============================================================================

void Date::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "now", Date::now);
    RIFT_STATIC_METHOD(constructor, "parse", Date::parse);
    RIFT_STATIC_METHOD(constructor, "UTC", Date::UTC);

    // Fix method lengths per spec
    auto setStaticLen = [&](const char* name, double len) {
        constructor->getProperty(name).getObject()->defineProperty(
            "length", PropertyDescriptor(Value(len), false, false, true));
    };
    setStaticLen("parse", 1.0);
    setStaticLen("UTC", 7.0);
}

void Date::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // Getters
    RIFT_METHOD(prototype, "getDate", Date::getDate);
    RIFT_METHOD(prototype, "getDay", Date::getDay);
    RIFT_METHOD(prototype, "getFullYear", Date::getFullYear);
    RIFT_METHOD(prototype, "getHours", Date::getHours);
    RIFT_METHOD(prototype, "getMilliseconds", Date::getMilliseconds);
    RIFT_METHOD(prototype, "getMinutes", Date::getMinutes);
    RIFT_METHOD(prototype, "getMonth", Date::getMonth);
    RIFT_METHOD(prototype, "getSeconds", Date::getSeconds);
    RIFT_METHOD(prototype, "getTime", Date::getTime);
    RIFT_METHOD(prototype, "getTimezoneOffset", Date::getTimezoneOffset);
    RIFT_METHOD(prototype, "getUTCDate", Date::getUTCDate);
    RIFT_METHOD(prototype, "getUTCDay", Date::getUTCDay);
    RIFT_METHOD(prototype, "getUTCFullYear", Date::getUTCFullYear);
    RIFT_METHOD(prototype, "getUTCHours", Date::getUTCHours);
    RIFT_METHOD(prototype, "getUTCMilliseconds", Date::getUTCMilliseconds);
    RIFT_METHOD(prototype, "getUTCMinutes", Date::getUTCMinutes);
    RIFT_METHOD(prototype, "getUTCMonth", Date::getUTCMonth);
    RIFT_METHOD(prototype, "getUTCSeconds", Date::getUTCSeconds);

    // Setters
    RIFT_METHOD(prototype, "setDate", Date::setDate);
    RIFT_METHOD(prototype, "setFullYear", Date::setFullYear);
    RIFT_METHOD(prototype, "setHours", Date::setHours);
    RIFT_METHOD(prototype, "setMilliseconds", Date::setMilliseconds);
    RIFT_METHOD(prototype, "setMinutes", Date::setMinutes);
    RIFT_METHOD(prototype, "setMonth", Date::setMonth);
    RIFT_METHOD(prototype, "setSeconds", Date::setSeconds);
    RIFT_METHOD(prototype, "setTime", Date::setTime);
    RIFT_METHOD(prototype, "setUTCDate", Date::setUTCDate);
    RIFT_METHOD(prototype, "setUTCFullYear", Date::setUTCFullYear);
    RIFT_METHOD(prototype, "setUTCHours", Date::setUTCHours);
    RIFT_METHOD(prototype, "setUTCMilliseconds", Date::setUTCMilliseconds);
    RIFT_METHOD(prototype, "setUTCMinutes", Date::setUTCMinutes);
    RIFT_METHOD(prototype, "setUTCMonth", Date::setUTCMonth);
    RIFT_METHOD(prototype, "setUTCSeconds", Date::setUTCSeconds);

    // Annex B methods
    RIFT_METHOD(prototype, "getYear", Date::getYear);
    RIFT_METHOD(prototype, "setYear", Date::setYear);
    // toGMTString is the same function object as toUTCString
    RIFT_METHOD(prototype, "toGMTString", Date::toUTCString);

    // Conversion
    RIFT_METHOD(prototype, "toDateString", Date::toDateString);
    RIFT_METHOD(prototype, "toISOString", Date::toISOString);
    RIFT_METHOD(prototype, "toJSON", Date::toJSON);
    RIFT_METHOD(prototype, "toLocaleDateString", Date::toLocaleDateString);
    RIFT_METHOD(prototype, "toLocaleString", Date::toLocaleString);
    RIFT_METHOD(prototype, "toLocaleTimeString", Date::toLocaleTimeString);
    RIFT_METHOD(prototype, "toString", Date::toString);
    RIFT_METHOD(prototype, "toTimeString", Date::toTimeString);
    RIFT_METHOD(prototype, "toUTCString", Date::toUTCString);
    RIFT_METHOD(prototype, "valueOf", Date::valueOf);

    // Fix method lengths per spec (RIFT_METHOD defaults to 0)
    auto setLen = [&](const char* name, double len) {
        prototype->getProperty(name).getObject()->defineProperty(
            "length", PropertyDescriptor(Value(len), false, false, true));
    };
    // Setters with length > 0
    setLen("setDate", 1.0);
    setLen("setFullYear", 3.0);
    setLen("setHours", 4.0);
    setLen("setMilliseconds", 1.0);
    setLen("setMinutes", 3.0);
    setLen("setMonth", 2.0);
    setLen("setSeconds", 2.0);
    setLen("setTime", 1.0);
    setLen("setUTCDate", 1.0);
    setLen("setUTCFullYear", 3.0);
    setLen("setUTCHours", 4.0);
    setLen("setUTCMilliseconds", 1.0);
    setLen("setUTCMinutes", 3.0);
    setLen("setUTCMonth", 2.0);
    setLen("setUTCSeconds", 2.0);
    setLen("setYear", 1.0);
    // toJSON has length 1
    setLen("toJSON", 1.0);

    // @@toPrimitive: non-enumerable, non-writable, configurable
    auto* tp_fn = factory->createJSFunction(Date::toPrimitive);
    tp_fn->defineProperty(
        "name", PropertyDescriptor(Value(std::string("[Symbol.toPrimitive]")), false, false, true));
    tp_fn->defineProperty("length", PropertyDescriptor(Value(1.0), false, false, true));
    std::string to_prim_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getToPrimitiveId());
    prototype->defineProperty(to_prim_key, PropertyDescriptor(Value(tp_fn), false, false, true));

    // @@toStringTag: "Date" (non-writable, non-enumerable, configurable)
    std::string tag_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getToStringTagId());
    prototype->defineProperty(tag_key,
                              PropertyDescriptor(Value(std::string("Date")), false, false, true));
}

JSObject* Date::getGlobalPrototype() {
    return rift::core::BuiltinManager::getDatePrototype();
}

}  // namespace rift::builtins
