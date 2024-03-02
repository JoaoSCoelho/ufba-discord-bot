/* eslint-disable @typescript-eslint/no-explicit-any */








/**
 * THIS CODE IS A ADAPTATION FOR LIBRARY pretty-bytes@6.1.1
 * ALL RIGHTS RESERVED TO LIBRARY AUTHOR sindresorhus
 * SEE THE ORIGINAL CODE IN https://github.com/sindresorhus/pretty-bytes
 */









export type Options = {
	/**
	Include plus sign for positive numbers. If the difference is exactly zero a space character will be prepended instead for better alignment.

	@default false
	*/
	readonly signed?: boolean;

	/**
	- If `false`: Output won't be localized.
	- If `true`: Localize the output using the system/browser locale.
	- If `string`: Expects a [BCP 47 language tag](https://en.wikipedia.org/wiki/IETF_language_tag) (For example: `en`, `de`, …)
	- If `string[]`: Expects a list of [BCP 47 language tags](https://en.wikipedia.org/wiki/IETF_language_tag) (For example: `en`, `de`, …)

	@default false
	*/
	readonly locale?: boolean | string | readonly string[];

	/**
	Format the number as [bits](https://en.wikipedia.org/wiki/Bit) instead of [bytes](https://en.wikipedia.org/wiki/Byte). This can be useful when, for example, referring to [bit rate](https://en.wikipedia.org/wiki/Bit_rate).

	@default false

	@example
	```
	import prettyBytes from 'pretty-bytes';

	prettyBytes(1337, {bits: true});
	//=> '1.34 kbit'
	```
	*/
	readonly bits?: boolean;

	/**
	Format the number using the [Binary Prefix](https://en.wikipedia.org/wiki/Binary_prefix) instead of the [SI Prefix](https://en.wikipedia.org/wiki/SI_prefix). This can be useful for presenting memory amounts. However, this should not be used for presenting file sizes.

	@default false

	@example
	```
	import prettyBytes from 'pretty-bytes';

	prettyBytes(1000, {binary: true});
	//=> '1000 bit'

	prettyBytes(1024, {binary: true});
	//=> '1 kiB'
	```
	*/
	readonly binary?: boolean;

	/**
	The minimum number of fraction digits to display.

	If neither `minimumFractionDigits` or `maximumFractionDigits` are set, the default behavior is to round to 3 significant digits.

	@default undefined

	@example
	```
	import prettyBytes from 'pretty-bytes';

	// Show the number with at least 3 fractional digits
	prettyBytes(1900, {minimumFractionDigits: 3});
	//=> '1.900 kB'

	prettyBytes(1900);
	//=> '1.9 kB'
	```
	*/
	readonly minimumFractionDigits?: number;

	/**
	The maximum number of fraction digits to display.

	If neither `minimumFractionDigits` or `maximumFractionDigits` are set, the default behavior is to round to 3 significant digits.

	@default undefined

	@example
	```
	import prettyBytes from 'pretty-bytes';

	// Show the number with at most 1 fractional digit
	prettyBytes(1920, {maximumFractionDigits: 1});
	//=> '1.9 kB'

	prettyBytes(1920);
	//=> '1.92 kB'
	```
	*/
	readonly maximumFractionDigits?: number;

	/**
	Put a space between the number and unit.

	@default true

	@example
	```
	import prettyBytes from 'pretty-bytes';

	prettyBytes(1920, {space: false});
	//=> '1.9kB'

	prettyBytes(1920);
	//=> '1.92 kB'
	```
	*/
	readonly space?: boolean;
};

/**
Convert bytes to a human readable string: `1337` → `1.34 kB`.

@param number - The number to format.

@example
```
import prettyBytes from 'pretty-bytes';

prettyBytes(1337);
//=> '1.34 kB'

prettyBytes(100);
//=> '100 B'

// Display file size differences
prettyBytes(42, {signed: true});
//=> '+42 B'

// Localized output using German locale
prettyBytes(1337, {locale: 'de'});
//=> '1,34 kB'
```
*/


const BYTE_UNITS = [
    'B',
    'kB',
    'MB',
    'GB',
    'TB',
    'PB',
    'EB',
    'ZB',
    'YB',
];

const BIBYTE_UNITS = [
    'B',
    'KiB',
    'MiB',
    'GiB',
    'TiB',
    'PiB',
    'EiB',
    'ZiB',
    'YiB',
];

const BIT_UNITS = [
    'b',
    'kbit',
    'Mbit',
    'Gbit',
    'Tbit',
    'Pbit',
    'Ebit',
    'Zbit',
    'Ybit',
];

const BIBIT_UNITS = [
    'b',
    'kibit',
    'Mibit',
    'Gibit',
    'Tibit',
    'Pibit',
    'Eibit',
    'Zibit',
    'Yibit',
];

/*
Formats the given number using `Number#toLocaleString`.
- If locale is a string, the value is expected to be a locale-key (for example: `de`).
- If locale is true, the system default locale is used for translation.
- If no value for locale is specified, the number is returned unmodified.
*/
const toLocaleString = (number: any, locale: any, options: any) => {
    let result = number;
    if (typeof locale === 'string' || Array.isArray(locale)) {
        result = number.toLocaleString(locale, options);
    } else if (locale === true || options !== undefined) {
        result = number.toLocaleString(undefined, options);
    }

    return result;
};

export default function prettyBytes(number: number, options?: Options) {
    if (!Number.isFinite(number)) {
        throw new TypeError(`Expected a finite number, got ${typeof number}: ${number}`);
    }

    options = {
        bits: false,
        binary: false,
        space: true,
        ...options,
    };

    const UNITS = options.bits
        ? (options.binary ? BIBIT_UNITS : BIT_UNITS)
        : (options.binary ? BIBYTE_UNITS : BYTE_UNITS);

    const separator = options.space ? ' ' : '';

    if (options.signed && number === 0) {
        return ` 0${separator}${UNITS[0]}`;
    }

    const isNegative = number < 0;
    const prefix = isNegative ? '-' : (options.signed ? '+' : '');

    if (isNegative) {
        number = -number;
    }

    let localeOptions;

    if (options.minimumFractionDigits !== undefined) {
        localeOptions = {minimumFractionDigits: options.minimumFractionDigits};
    }

    if (options.maximumFractionDigits !== undefined) {
        localeOptions = {maximumFractionDigits: options.maximumFractionDigits, ...localeOptions};
    }

    if (number < 1) {
        const numberString = toLocaleString(number, options.locale, localeOptions);
        return prefix + numberString + separator + UNITS[0];
    }

    const exponent = Math.min(Math.floor(options.binary ? Math.log(number) / Math.log(1024) : Math.log10(number) / 3), UNITS.length - 1);
    number /= (options.binary ? 1024 : 1000) ** exponent;

    if (!localeOptions) {
        number = number.toPrecision(3) as any;
    }

    const numberString = toLocaleString(Number(number), options.locale, localeOptions);

    const unit = UNITS[exponent];

    return prefix + numberString + separator + unit;
}
