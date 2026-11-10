# Date formatting

Date formatting is engine-owned and follows the UTC default timezone policy. ISO output uses four-digit ordinary years and signed six-digit expanded years, always with milliseconds. Display/UTC output uses weekday/month names and at least four year digits; the UTC zone suffix is explicit. Invalid Date values produce the display text or an ISO failure sentinel for the public method to turn into RangeError.

Tests cover negative milliseconds, year zero/negative/expanded years, both clip endpoints, all display forms and ISO parse round trips. Host locale and timezone formatting are not used.

References: ECMAScript Date.prototype.toISOString, toUTCString, DateString, TimeString and ToDateString at https://tc39.es/ecma262/#sec-date-objects.
