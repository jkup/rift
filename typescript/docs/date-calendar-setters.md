# Date calendar setters

TS-402 implements local/UTC setFullYear, setMonth and setDate under the UTC timezone policy. Component balancing shares Date's MakeDay implementation. All methods snapshot the original time before converting arguments. FullYear recovers an invalid original time using epoch zero; Month and Date return NaN without overwriting changes performed by argument hooks. Year zero stays year zero, without the constructor's 0–99 remapping.

Tests cover leap overflow, negative months/days, preserved time within day, missing and explicit undefined arguments, conversion order and mutation, range endpoints, frozen objects and defining-Realm errors. Legacy setYear remains separate work.
