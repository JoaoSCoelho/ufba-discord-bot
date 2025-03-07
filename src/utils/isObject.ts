/**
 * Checks if a value is an object.
 * @param testValue The value to check.
 * @returns `true` if the value is an object, `false` otherwise.
 */
export default function isObject(testValue: unknown) {
    return testValue !== null && typeof testValue === 'object' && !Array.isArray(testValue);
}