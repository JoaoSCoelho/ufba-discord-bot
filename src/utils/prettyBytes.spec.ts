import prettyBytes from './prettyBytes';

describe('prettyBytes', () => {
    it('should throw if the number is infinite', () => {
        expect(() => prettyBytes(Number.POSITIVE_INFINITY)).toThrow();
        expect(() => prettyBytes(Number.NEGATIVE_INFINITY)).toThrow();
    });



    describe('should format numbers', () => {
        it('should format 0 signed', () => {
            expect(prettyBytes(0, { signed: true })).toBe(' 0 B');
        });

        it('should format without options', () => {
            expect(prettyBytes(1337)).toBe('1.34 kB');
            expect(prettyBytes(100)).toBe('100 B');
            expect(prettyBytes(-54800)).toBe('-54.8 kB');
            expect(prettyBytes(0)).toBe('0 B');
            expect(prettyBytes(12_540_000)).toBe('12.5 MB');
        });

        it('should format with minimumFractionDigits', () => {
            expect(prettyBytes(5_154_651_896, { minimumFractionDigits: 4 })).toBe('5.1547 GB');
            expect(prettyBytes(2, { minimumFractionDigits: 4 })).toBe('2.0000 B');
        });

        it('should format with maximumFractionDigits', () => {
            expect(prettyBytes(5_154_651_896, { maximumFractionDigits: 4 })).toBe('5.1547 GB');
            expect(prettyBytes(2, { maximumFractionDigits: 4 })).toBe('2 B');
        });

        it('should format with brazilian locale', () => {
            expect(prettyBytes(1337, { locale: 'pt-BR' })).toBe('1,34 kB');
            expect(prettyBytes(100, { locale: 'pt-BR', signed: true })).toBe('+100 B');
            expect(prettyBytes(-54800, { locale: 'pt-BR' })).toBe('-54,8 kB');
            expect(prettyBytes(-54800, { locale: 'pt-BR', signed: true })).toBe('-54,8 kB');
            expect(prettyBytes(0, { locale: 'pt-BR' })).toBe('0 B');
            expect(prettyBytes(12_540_000, { locale: 'pt-BR' })).toBe('12,5 MB');
        });

        it('should format for bits', () => {
            expect(prettyBytes(1337, { bits: true })).toBe('1.34 kbit');
            expect(prettyBytes(100, { bits: true })).toBe('100 b');
            expect(prettyBytes(-54800, { bits: true })).toBe('-54.8 kbit');
            expect(prettyBytes(0, { bits: true })).toBe('0 b');
            expect(prettyBytes(12_540_000, { bits: true })).toBe('12.5 Mbit');
            expect(prettyBytes(1337, { bits: true, binary: true })).toBe('1.31 kibit');
            expect(prettyBytes(100, { bits: true, binary: true })).toBe('100 b');
            expect(prettyBytes(-54800, { bits: true, binary: true })).toBe('-53.5 kibit');
            expect(prettyBytes(0, { bits: true, binary: true })).toBe('0 b');
            expect(prettyBytes(12_540_000, { bits: true, binary: true })).toBe('12 Mibit');
        });
    });
});