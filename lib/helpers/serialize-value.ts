/**
 * Serializes a value for storage in MMKV.
 *
 * All values are JSON.stringify'd to preserve type information.
 * This ensures strings like "42" or "true" don't get misinterpreted
 * as numbers or booleans during deserialization.
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
 */
export const serializeValue = (value: unknown): string => {
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
};
