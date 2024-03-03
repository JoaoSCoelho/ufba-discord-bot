// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function isObject(testValue: any) {
    return testValue !== null && typeof testValue === 'object' && !Array.isArray(testValue);
}