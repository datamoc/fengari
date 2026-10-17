"use strict";

const { formatFloat, formatString } = require('../src/cformat.js');

/* expected values are what C's printf produces */
describe('formatFloat', () => {
    test.each([
        ['%f', 3.14159265358979, '3.141593'],
        ['%.0f', 2.5, '2'],  /* exact ties go to the even digit, as in C */
        ['%.0f', 3.5, '4'],
        ['%.0f', 0.5, '0'],
        ['%.2f', 0.125, '0.12'],
        ['%.2f', 0.375, '0.38'],
        ['%.3f', -1.0005, '-1.000'],  /* not a tie: 1.0005 is slightly below */
        ['%#.0f', 3, '3.'],
        ['%.2f', 1e21, '1000000000000000000000.00'],
        ['%.0f', 1e22, '10000000000000000000000'],
        ['%10.3f', 3.14159, '     3.142'],
        ['%-10.3f', 3.14159, '3.142     '],
        ['%010.3f', -3.14159, '-00003.142'],
        ['%+f', 1, '+1.000000'],
        ['% f', 1, ' 1.000000'],
        ['%f', -0, '-0.000000'],
    ])('%s of %p is %s', (fmt, x, expected) => {
        expect(formatFloat(fmt, x)).toBe(expected);
    });

    test.each([
        ['%e', 12345.6789, '1.234568e+04'],
        ['%E', 0.00012345, '1.234500E-04'],
        ['%.0e', 5, '5e+00'],
        ['%.0e', 2.5, '2e+00'],
        ['%#.0e', 5, '5.e+00'],
        ['%e', 0, '0.000000e+00'],
        ['%.2e', 1e100, '1.00e+100'],
        ['%12.3e', 1234.5, '   1.234e+03'],
    ])('%s of %p is %s', (fmt, x, expected) => {
        expect(formatFloat(fmt, x)).toBe(expected);
    });

    test.each([
        ['%g', 0, '0'],
        ['%g', 100000, '100000'],
        ['%g', 1e6, '1e+06'],
        ['%g', 123456789, '1.23457e+08'],
        ['%g', 0.0001, '0.0001'],
        ['%g', 0.00001, '1e-05'],
        ['%g', 0.5, '0.5'],
        ['%g', 999999.5, '1e+06'],
        ['%.14g', 0.1, '0.1'],
        ['%.14g', 1 / 3, '0.33333333333333'],
        ['%.3g', 1234, '1.23e+03'],
        ['%.0g', 12, '1e+01'],
        ['%#g', 1, '1.00000'],
        ['%#.3g', 1e10, '1.00e+10'],
        ['%G', 1e-10, '1E-10'],
        ['%10g', 1.5, '       1.5'],
        ['%-10g', 1.5, '1.5       '],
        ['%g', -0, '-0'],
    ])('%s of %p is %s', (fmt, x, expected) => {
        expect(formatFloat(fmt, x)).toBe(expected);
    });

    test.each([
        ['%f', Infinity, 'inf'],
        ['%f', -Infinity, '-inf'],
        ['%E', Infinity, 'INF'],
        ['%G', NaN, 'NAN'],
        ['%e', NaN, 'nan'],
        ['%+f', Infinity, '+inf'],
        ['%8f', Infinity, '     inf'],
        ['%08f', Infinity, '     inf'],  /* the '0' flag does not apply to inf/nan */
        ['%-8f', NaN, 'nan     '],
    ])('%s of %p is %s', (fmt, x, expected) => {
        expect(formatFloat(fmt, x)).toBe(expected);
    });
});

describe('formatString', () => {
    test.each([
        ['%s', 'abc', 'abc'],
        ['%5s', 'abc', '  abc'],
        ['%-5s', 'abc', 'abc  '],
        ['%.2s', 'abc', 'ab'],
        ['%.0s', 'abc', ''],
        ['%.s', 'abc', ''],
        ['%5.1s', 'abc', '    a'],
        ['%2s', 'abc', 'abc'],
        ['%05s', 'abc', '  abc'],
    ])('%s of %p is %p', (fmt, s, expected) => {
        expect(formatString(fmt, s)).toBe(expected);
    });
});

describe('precision limits', () => {
    test('%g accepts the 99 digits Lua allows, even where JS toFixed stops at 100', () => {
        expect(formatFloat('%.99g', 0.0001)).toBe('0.000100000000000000004792173602385929598312941379845142364501953125');
        expect(formatFloat('%.99g', 1)).toBe('1');
        expect(formatFloat('%#.99g', 1)).toBe('1.' + '0'.repeat(98));
    });
    test('%f and %e accept a precision of 99', () => {
        expect(formatFloat('%.99f', 0.5)).toBe('0.5' + '0'.repeat(98));
        expect(formatFloat('%.99e', 1)).toBe('1.' + '0'.repeat(99) + 'e+00');
    });
});
