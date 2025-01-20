import isObject from './isObject';

describe('isObject', () => {
    it('should return true if the value is an empty object', () => {
        expect(isObject({})).toBe(true);
    });

    it('should return true for different objects', () => {
        expect(isObject({ a: 1 })).toBe(true);
        expect(isObject({ a: 1, b: '654' })).toBe(true);
        expect(isObject({ a: 1, b: true, c: 3.54 })).toBe(true);
        expect(isObject({ a: 1, b: '¨#$%$#', c: '📢', d: null })).toBe(true);
        expect(isObject({ a: 1, b: Symbol(54654), 5: 3, d: 4, e: 5 })).toBe(true);
        expect(isObject({ a: 1, b: { c: 3 }, d: [], 0: undefined })).toBe(true);
        expect(isObject({ 0: 1, 1: { c: 3, another: { 0: 4 } }, 2: [], 3: undefined })).toBe(true);
    });

    it('should return true if the value is an instanceof a Class', () => {
        class Test { }
        class Test2 { public 1 = 5; private a = 3; protected b = 4; public static c = 5; }

        expect(isObject(new Date())).toBe(true);
        expect(isObject(new Error())).toBe(true);
        expect(isObject(new Test())).toBe(true);
        expect(isObject(new Test2())).toBe(true);
        expect(isObject(new Map())).toBe(true);
        expect(isObject(new Set())).toBe(true);
        expect(isObject(new WeakMap())).toBe(true);
    });

    it('should return false if the value is an array', () => {
        const testObj = { prop: ['a', 'b'] };

        expect(isObject([])).toBe(false);
        expect(isObject(['a', 'b'])).toBe(false);
        expect(isObject([1, 2, 3])).toBe(false);
        expect(isObject([1, 'a', 3])).toBe(false);
        expect(isObject([1, { a: 1 }, 3])).toBe(false);
        expect(isObject(new Array(3))).toBe(false);
        expect(isObject(testObj.prop)).toBe(false);
    });

    it('should return false if the value is null', () => {
        expect(isObject(null)).toBe(false);
    });

    it('should return false if the value is undefined', () => {
        expect(isObject(undefined)).toBe(false);
    });

    it('should return false if the value is a string', () => {
        expect(isObject('')).toBe(false);
        expect(isObject('a')).toBe(false);
    });

    it('should return false if the value is a number', () => {
        expect(isObject(0)).toBe(false);
        expect(isObject(1)).toBe(false);
        expect(isObject(1.15)).toBe(false);
        expect(isObject(-10.99)).toBe(false);
        expect(isObject(-10n)).toBe(false); // Test for bigint
    });

    it('should return false if the value is a boolean', () => {
        expect(isObject(true)).toBe(false);
        expect(isObject(false)).toBe(false);
    });

    it('should return false if the value is a symbol', () => {
        expect(isObject(Symbol(1))).toBe(false);
    });
});