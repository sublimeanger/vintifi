# Fix eBay Publish: Invalid Condition Enum

## Root Cause

The eBay Inventory API uses a strict `ConditionEnum`. The current `mapConditionToEbay` function returns values like `"GOOD"` and `"ACCEPTABLE"` which **do not exist** in eBay's enum. The API cannot serialize them, causing the 400 error on every publish attempt.

Your listings have these conditions in the database:

- "New with tags"
- "New without tags"  
- "Very good" / "Very Good"
- "Good"
- "Excellent"

## Current (Broken) Mapping

```text
"new"              -> "NEW"           (valid)
"new with tags"    -> "NEW_WITH_TAGS" (valid)
"new without tags" -> "NEW_WITHOUT_TAGS" (valid)
"very good"        -> "LIKE_NEW"      (wrong semantic, but valid enum)
"good"             -> "GOOD"          (INVALID - does not exist)
"satisfactory"     -> "ACCEPTABLE"    (INVALID - does not exist)
"excellent"        -> not mapped      (falls back to "GOOD" which is INVALID)
default            -> "GOOD"          (INVALID)
```

## Correct Mapping (per eBay API docs)

The valid ConditionEnum values for used clothing are:

- `NEW`, `NEW_WITH_TAGS`, `NEW_WITHOUT_TAGS`, `NEW_OTHER`
- `LIKE_NEW`
- `USED_EXCELLENT`, `USED_VERY_GOOD`, `USED_GOOD`, `USED_ACCEPTABLE`
- `FOR_PARTS_OR_NOT_WORKING`

## The Fix

Update `mapConditionToEbay` in `supabase/functions/publish-to-platform/index.ts`:

```text
"new"              -> "NEW"
"new with tags"    -> "NEW_WITH_TAGS"
"new without tags" -> "NEW_WITHOUT_TAGS"
"excellent"        -> "USED_EXCELLENT"
"very good"        -> "USED_VERY_GOOD"
"good"             -> "USED_GOOD"
"satisfactory"     -> "USED_ACCEPTABLE"
default fallback   -> "USED_GOOD"  (safe default)
```

This is a 6-line change in a single file. The edge function will be redeployed automatically.  
  
maybe we have an AI engine that makes sure that the listing formats are precisely correct when a user wants to list their item on ebay. Becuase obviously they're going to want a completely optimkised listing and if a listing hasn't been optimised, then they shouldn't really poublish (the system should cross check tehy're happy to proceed without optimisation maybe? I want you to come up iwth a best in class way to do all of this)