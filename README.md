# App Storage (MMKV Wrapper)

Pequeño wrapper sobre `react-native-mmkv` con namespacing para usar en múltiples apps.

## Instalación

```bash
npm install @janis-commerce/app-storage
# peer deps si las hubiera
```

## Uso básico

```js
import { createAppStorage } from '@janis-commerce/app-storage';

// Una instancia por app/namespace
const storage = createAppStorage({ namespace: 'appA' });

storage.set('token', 'abc123');
storage.set('profile', { name: 'Jane' });

const token = storage.get('token');
const profile = storage.get('profile'); // { name: 'Jane' }

storage.remove('token');
storage.clear(); // limpia solo las claves de appA
```

Para tus 3 apps, crea una instancia por app cambiando `namespace` (`appA`, `appB`, `appC`).

## API

- `createAppStorage(options?)`: Crea una instancia aislada.
  - **options.namespace**: string. Prefijo de claves (default: `default`).
  - **options.id**: string. Id interno de MMKV (opcional).
- `storage.set(key, value)`: Guarda valores primitivos u objetos (se serializan en JSON).
- `storage.get(key, defaultValue?)`: Devuelve el valor parseado (intenta JSON/boolean/number) o `defaultValue` si no existe.
- `storage.remove(key)`: Elimina una clave.
- `storage.clear()`: Elimina todas las claves del namespace.

## Notas

- Evita colisiones usando distintos `namespace` por app.
- Al guardar objetos se usa `JSON.stringify`; al leer se intenta `JSON.parse` y se hace fallback a string/number/boolean.

