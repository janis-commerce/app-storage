/**
 * Serializes a value for storage in MMKV.
 *
 * - Strings are stored as-is
 * - Numbers and booleans are converted to string
 * - Objects/arrays are JSON.stringify'd with fallback to String()
 *
 * @param value - The value to serialize
 * @returns String representation suitable for MMKV storage
 *
 * @example
 * serializeValue('hello')        // => 'hello'
 * serializeValue(42)             // => '42'
 * serializeValue(true)           // => 'true'
 * serializeValue({ a: 1 })       // => '{"a":1}'
 * serializeValue([1, 2])         // => '[1,2]'
 */
export const serializeValue = (value: unknown): string => {
	const valueType = typeof value;

	if (valueType === 'string') return value as string;
	if (valueType === 'number' || valueType === 'boolean') return String(value);

	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
};
