# App Storage

[![npm version](https://badge.fury.io/js/@janis-commerce%2Fapp-storage.svg)](https://www.npmjs.com/package/@janis-commerce/app-storage)

A thin wrapper around [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) with optional per-key expiration (TTL).

## Features

- 🚀 Fast and efficient key-value storage powered by MMKV
- ⏰ Optional TTL (Time To Live) for automatic key expiration
- 📦 Automatic JSON serialization for objects and arrays
- 🔒 Type-safe with TypeScript support
- 🪶 Lightweight and easy to use

## Installation

```bash
npm install @janiscommerce/app-storage
```

### Peer Dependencies

This package requires `react-native-mmkv` as a peer dependency:

```bash
npm install react-native-mmkv
```

This package uses `react-native-mmkv` as its high-performance native storage engine.
Because MMKV contains native code (Android/iOS), it must be installed in the host React Native app, not within this package, to ensure proper autolinking and native build integration.

### Why peerDependency instead of dependency?

React Native only autolinks native modules located in the app’s root node_modules.
If MMKV were installed as a regular dependency, it would live inside
node_modules/@janiscommerce/app-storage/node_modules/react-native-mmkv, preventing autolinking and causing runtime errors such as:

## Quick Start

```typescript
import Storage from '@janis-commerce/app-storage';

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
import Storage from '@janis-commerce/app-storage';

const storage = new Storage();

// Store a value that expires in 5 minutes
storage.set('session-token', 'xyz789', { expiresAt: 5 });

// After 5 minutes, this will return null
const token = storage.get('session-token');
```

## Multiple Storage Instances

You can create multiple isolated storage instances for different purposes:

```typescript
import Storage from '@janis-commerce/app-storage';

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

A thin wrapper around MMKV with optional per-key expiration (TTL).

- Serializes objects/arrays to JSON on set.
- get() attempts JSON parse; otherwise returns string/number/boolean.
- Optional per-key expiration via `expiresAt` (minutes from now).
- Expired keys are automatically removed on get().
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

Stores a value by key with optional expiration.

Semantics:

- key null/undefined: no-op
- value null/undefined: no-op (null will not be stored; it is ignored)
- string/number/boolean are stored as string
- objects/arrays are serialized to JSON

Expiration:

- options.expiresAt: minutes from now until expiration.
- Stored under `${key}:__meta` as an absolute timestamp in milliseconds.

**Kind**: instance method of [<code>Storage</code>](#Storage)

| Param   | Description                        |
| ------- | ---------------------------------- |
| key     | The storage key.                   |
| value   | The value to store.                |
| options | Optional expiration configuration. |

<a name="Storage+get"></a>

### storage.get(key) ⇒

Retrieves a value by key. If expired or metadata is invalid, the key is removed and null is returned.

**Kind**: instance method of [<code>Storage</code>](#Storage)  
**Returns**: Parsed JSON as T, or string/number/boolean; null if missing/expired/invalid.  
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

## Author

Janis Commerce
