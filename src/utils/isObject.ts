export default function isObject(testValue: unknown) {
    return testValue !== null && typeof testValue === 'object' && !Array.isArray(testValue);
}