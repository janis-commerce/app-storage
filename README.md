# App Storage

[![npm version](https://img.shields.io/npm/v/@janiscommerce/app-storage)](https://www.npmjs.com/package/@janiscommerce/app-storage)
[![package size](https://img.shields.io/npm/unpacked-size/@janiscommerce/app-storage)](https://www.npmjs.com/package/@janiscommerce/app-storage)

A thin wrapper around [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) with optional per-key expiration (TTL) and version-based invalidation.

## Features

- Fast and efficient key-value storage powered by MMKV
- Optional TTL (Time To Live) for automatic key expiration
- Version-based invalidation: automatically expire data when the app version changes
- Automatic JSON serialization for objects and arrays
- Type-safe with TypeScript support
- Lightweight and easy to use

## Installation

```bash
npm install @janiscommerce/app-storage
```

### Peer Dependencies

This package requires the following peer dependencies:

```bash
npm install react-native-mmkv @janiscommerce/app-device-info
```

| Package | Required for |
| --- | --- |
| `react-native-mmkv` | High-performance native storage engine |
| `@janiscommerce/app-device-info` | Required peer dependency (provides app version for version-based invalidation) |

### Why peerDependency instead of dependency?

React Native only autolinks native modules located in the app's root node_modules.
If these packages were installed as regular dependencies, they would be nested inside
`node_modules/@janiscommerce/app-storage/node_modules/`, preventing autolinking and causing runtime errors.

## Quick Start

```typescript
import Storage from '@janiscommerce/app-storage';

// Create a storage instance
const storage = new Storage({ id: 'my-app-storage' });

// Store values
storage.set('token', 'abc123');
storage.set('user', { name: 'Jane', age: 30 });

// Retrieve values
const token = storage.get<string>('token'); // 'abc123'
const user = storage.get<{ name: string; age: number }>('user'); // { name: 'Jane', age: 30 }

// Remove a key
storage.remove('token');

// Clear all keys
storage.clear();
```

## Usage with TTL (Time To Live)

```typescript
import Storage from '@janiscommerce/app-storage';

const storage = new Storage();

// Store a value that expires in 5 minutes
storage.set('session-token', 'xyz789', { expiresAt: 5 });

// After 5 minutes, this will return null
const token = storage.get('session-token');
```

## Usage with Version-based Invalidation

You can mark stored data to automatically expire when the app version changes. This is useful for cached data that should be refreshed after an app update (e.g., feature flags, remote config, API responses tied to a specific app version).

```typescript
import Storage from '@janiscommerce/app-storage';

const storage = new Storage();

// Store a value that expires when the app version changes
storage.set('feature-flags', { darkMode: true, newUI: false }, { expireWithVersion: true });

// On the same app version, this returns the stored value
const flags = storage.get('feature-flags'); // { darkMode: true, newUI: false }

// After an app update (version change), this returns null
const staleFlags = storage.get('feature-flags'); // null (invalidated)
```

### Combining TTL and Version-based Invalidation

Both options can be used together. The data will be invalidated if **either** condition is met: the TTL expires **or** the app version changes, whichever comes first.

```typescript
import Storage from '@janiscommerce/app-storage';

const storage = new Storage();

// Expires after 60 minutes OR when the app version changes
storage.set('api-config', { baseUrl: 'https://api.example.com' }, {
  expiresAt: 60,
  expireWithVersion: true,
});
```

### How it works

When `expireWithVersion: true` is passed to `set()`, the current app version (obtained from `@janiscommerce/app-device-info`) is saved alongside the value in its metadata. On `get()`, the stored version is compared against the current app version. If they differ, the key is invalidated and `null` is returned.

The version check is performed **before** the TTL check. This means version-invalidated data is cleaned up immediately, without waiting for the TTL to expire.

## Multiple Storage Instances

You can create multiple isolated storage instances for different purposes:

```typescript
import Storage from '@janiscommerce/app-storage';

const userStorage = new Storage({ id: 'user-data' });
const cacheStorage = new Storage({ id: 'cache' });
const sessionStorage = new Storage({ id: 'session' });

userStorage.set('profile', { name: 'John' });
cacheStorage.set('last-fetch', Date.now(), { expiresAt: 10 }); // expires in 10 minutes
sessionStorage.set('temp-data', { foo: 'bar' });
```

## API Documentation

<a name="Storage"></a>

## Storage

A thin wrapper around MMKV with optional per-key expiration (TTL) and version-based invalidation.

- Serializes objects/arrays to JSON on set.
- get() attempts JSON parse; otherwise returns string/number/boolean.
- Optional per-key expiration via `expiresAt` (minutes from now).
- Optional version-based invalidation via `expireWithVersion`.
- Expired or version-invalidated keys are automatically removed on get().
- remove() deletes the value and its expiration metadata.

**Kind**: global class
**Access**: public

- [Storage](#Storage)
    - [new Storage(options)](#new_Storage_new)
    - [.set(key, value, options)](#Storage+set)
    - [.get(key)](#Storage+get) ⇒
    - [.remove(key)](#Storage+remove)
    - [.clear()](#Storage+clear)

<a name="new_Storage_new"></a>

### new Storage(options)

Creates a new Storage instance.

| Param   | Description                                              |
| ------- | -------------------------------------------------------- |
| options | Initialization options for the underlying MMKV instance. |

<a name="Storage+set"></a>

### storage.set(key, value, options)

Stores a value by key with optional expiration and version tracking.

Semantics:

- key null/undefined: no-op
- value null/undefined: no-op (null will not be stored; it is ignored)
- string/number/boolean are stored as string
- objects/arrays are serialized to JSON

Expiration:

- `options.expiresAt`: minutes from now until expiration. Stored under `${key}:__meta` as an absolute timestamp in milliseconds.
- `options.expireWithVersion`: when `true`, the current app version is saved in metadata. On retrieval, if the stored version differs from the current version, the key is invalidated.

**Kind**: instance method of [<code>Storage</code>](#Storage)

| Param   | Type | Description |
| ------- | ---- | --- |
| key     | `string` | The storage key. |
| value   | `unknown` | The value to store. |
| options | `object` | Optional configuration. |
| options.expiresAt | `number` | Minutes from now until expiration. |
| options.expireWithVersion | `boolean` | If `true`, stores the current app version and invalidates the key when the version changes. |

<a name="Storage+get"></a>

### storage.get(key) ⇒

Retrieves a value by key. Returns `null` and cleans up stored data if any of these conditions are met:
- The stored app version differs from the current app version (version invalidation).
- The TTL has expired (time-based expiration).
- The metadata is corrupted or invalid.

Version check is performed **before** TTL check.

**Kind**: instance method of [<code>Storage</code>](#Storage)
**Returns**: Parsed JSON as T, or string/number/boolean; null if missing/expired/version-invalidated/invalid.
**Typeparam**: T - Expected value type after JSON parse.

| Param | Description      |
| ----- | ---------------- |
| key   | The storage key. |

<a name="Storage+remove"></a>

### storage.remove(key)

Removes a key and its expiration metadata.

**Kind**: instance method of [<code>Storage</code>](#Storage)

| Param | Description                |
| ----- | -------------------------- |
| key   | The storage key to remove. |

<a name="Storage+clear"></a>

### storage.clear()

Clears all keys from the current MMKV instance.

**Kind**: instance method of [<code>Storage</code>](#Storage)

## Use Cases

### Recommended use cases for `expireWithVersion`

| Use case | Why |
| --- | --- |
| Feature flags / remote config | Ensures stale flags from a previous version are not applied after an update. |
| Cached API responses | API contracts may change between app versions; cached responses could become incompatible. |
| Onboarding / tutorial state | After an update you may want to re-show onboarding for new features. |
| Computed or derived data | Cached computations that depend on app logic which may have changed. |

### NOT recommended for `expireWithVersion`

| Use case | Why |
| --- | --- |
| User preferences (theme, language) | These should persist across updates. Use plain `set()` without `expireWithVersion`. |
| Authentication tokens | Tokens have their own expiration mechanisms. Use `expiresAt` instead. |
| User-generated content (drafts, notes) | Losing user data on update is a poor experience. |
| Data unrelated to app version | If the data does not depend on the app version, there is no reason to invalidate it. |

## Error Handling

### Version retrieval failure

If `@janiscommerce/app-device-info` is not installed or `DeviceInfo.getVersion()` throws an error, the library degrades gracefully:

- **On `set()` with `expireWithVersion: true`:** If the version cannot be obtained, the `appVersion` field is **not** written to metadata. The value is still stored normally, and will behave as if `expireWithVersion` was not set.
- **On `get()`:** If the version cannot be obtained at read time but metadata contains an `appVersion`, the data is invalidated for safety. This prevents serving potentially incompatible cached data after an app update when version lookup temporarily fails. If metadata does not contain an `appVersion`, the value is returned normally (subject to TTL expiration if configured).

This ensures that a missing or broken dependency never causes data loss or crashes, while maintaining strict version validation when version tracking is enabled.

### Corrupted metadata

If the metadata stored under `${key}:__meta` is corrupted (invalid JSON), both the key and its metadata are deleted, and `get()` returns `null`. This prevents inconsistent state from persisting.

## Backward Compatibility

This feature is fully backward compatible:

- **Existing stored data** (without `appVersion` in metadata) continues to work normally. The absence of `appVersion` is treated as "no version constraint" -- the key is never invalidated by version checks.
- **The `set()` API** remains unchanged for existing usage. The `expireWithVersion` option is purely additive; omitting it preserves the previous behavior.
- **Metadata format** is extended, not replaced. The `__meta` key now supports an optional `appVersion` field alongside the existing `expiresAt` field:

```json
// Before (TTL only)
{ "expiresAt": 1700000000000 }

// After (TTL + version)
{ "expiresAt": 1700000000000, "appVersion": "2.1.0" }

// Version only (no TTL)
{ "appVersion": "2.1.0" }
```

## Implementation Details

- The app version is obtained via `DeviceInfo.getVersion()` from `@janiscommerce/app-device-info`.
- Version comparison uses strict string equality (`===`). For example, `"1.0.0"` and `"1.0.1"` are considered different versions.
- The version string is stored as-is in the metadata. No semantic version parsing is performed.
- On `get()`, the validation order is: **version check** then **TTL check**. If the version is invalid, the key is removed immediately without evaluating TTL.
- The `getAppVersion()` helper is wrapped in a try-catch. Any exception results in a `console.warn` and a `null` return value, ensuring robust behavior even when the device info package is unavailable.

## Author

Janis Commerce
