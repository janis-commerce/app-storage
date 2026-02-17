/**
 * Serializes a value for storage in MMKV.
 *
 * All values are JSON.stringify'd to preserve type information.
 * This ensures strings like "42" or "true" don't get misinterpreted
 * as numbers or booleans during deserialization.
 *
 * For values that JSON.stringify cannot serialize (undefined, functions, symbols),
 * falls back to String() conversion.
 *
 * @param value - The value to serialize
 * @returns String representation suitable for MMKV storage
 *
 * @example
 * serializeValue('hello')        // => '"hello"'
 * serializeValue('42')           // => '"42"'
 * serializeValue(42)             // => '42'
 * serializeValue(true)           // => 'true'
 * serializeValue({ a: 1 })       // => '{"a":1}'
 * serializeValue([1, 2])         // => '[1,2]'
 * serializeValue(undefined)      // => 'undefined'
 * serializeValue(() => {})       // => 'function'
 */
export const serializeValue = (value: unknown): string => {
	try {
		const result = JSON.stringify(value);
		// JSON.stringify returns undefined for undefined, functions, and symbols
		return result !== undefined ? result : String(value);
	} catch {
		return String(value);
	}
};
