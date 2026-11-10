# Duration JSON and locale fallback

Branded `toJSON` and the non-Intl `toLocaleString` fallback use exact automatic ISO
duration formatting. They ignore reserved arguments and public field/toString
overrides. JSON.stringify can now serialize durations through the normal toJSON
protocol. Option-aware toString remains a separate task.

The methods follow [Duration toJSON](https://tc39.es/proposal-temporal/#sec-temporal-duration-prototype-tojson)
and the non-Intl locale fallback. Tests verify exact fractions and bounds, signs,
zero, JSON integration, ignored arguments, branding, metadata, subclasses and
cross-Realm errors. Evidence is retained under build/temporal-duration-serialization-*;
combined acceptance is required before publication.
