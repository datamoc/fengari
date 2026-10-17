"use strict";

/*
** C printf-style formatting of floats and strings, for string.format.
** Formats are the '%' specifications already validated by 'scanformat':
** flags, a width and a precision of 2 digits at most, then the conversion.
*/

const FLOAT_FORMAT = /^%([-+ #0]*)([0-9]*)(?:\.([0-9]*))?([eEfgG])$/;
const STRING_FORMAT = /^%([-+ #0]*)([0-9]*)(?:\.([0-9]*))?s$/;

/* pads 'body' (already carrying its sign and prefix) up to 'width' */
const pad = function(sign, body, flags, width, zeros) {
    const missing = width - sign.length - body.length;
    if (missing <= 0) return sign + body;
    if (flags.includes("-")) return sign + body + " ".repeat(missing);
    if (zeros && flags.includes("0")) return sign + "0".repeat(missing) + body;
    return " ".repeat(missing) + sign + body;
};

/* a width or precision as a number: 'absent' when missing, 0 when only the '.' is given */
const count = function(digits, absent) {
    if (digits === undefined) return absent;
    return digits === "" ? 0 : parseInt(digits, 10);
};

/*
** JS rounds exact ties up whereas C rounds them to even. 'digits' are the
** exact digits of the number (JS gives 100 of them), 'kept' how many are
** printed. It is a tie to round down when what follows is a 5 and zeros and
** the last kept digit is even: the result is then 'digits' truncated.
*/
const roundsDown = function(digits, kept) {
    const lastKept = digits.charCodeAt(kept - 1) - 48;
    return /^50*$/.test(digits.slice(kept)) && lastKept % 2 === 0;
};

/* 'toExponential' with the C exponent: at least 2 digits */
const exponential = function(x, prec, alt) {
    const exact = x.toExponential(100);
    const exactExp = exact.slice(exact.indexOf("e"));
    const digits = exact[0] + exact.slice(2, exact.indexOf("e"));
    let rounded = x.toExponential(prec);
    if (roundsDown(digits, prec + 1)) {
        const fraction = prec > 0 ? "." + digits.slice(1, prec + 1) : "";
        rounded = digits[0] + fraction + exactExp;
    }
    let [mantissa, exp] = rounded.split("e");
    if (alt && prec === 0) mantissa += ".";
    const expDigits = exp.slice(1);
    return mantissa + "e" + exp[0] + (expDigits.length < 2 ? "0" + expDigits : expDigits);
};

/* 'toFixed' that keeps plain digits above 1e21 and accepts more than 100 decimals */
const fixed = function(x, prec, alt) {
    let s;
    if (x >= 1e21) {
        s = BigInt(x).toString();
        if (prec > 0) s += "." + "0".repeat(prec);
    } else {
        s = x.toFixed(Math.min(prec, 100)) + "0".repeat(Math.max(prec - 100, 0));  /* a double has no digit past the 66th decimal when x >= 1e-4 (%g) */
        const exact = x.toFixed(100);
        const point = exact.indexOf(".");
        const digits = exact.slice(0, point) + exact.slice(point + 1);
        if (roundsDown(digits, point + prec))
            s = exact.slice(0, prec > 0 ? point + prec + 1 : point);
    }
    return alt && prec === 0 ? s + "." : s;
};

const general = function(x, prec, alt) {
    const p = prec === 0 ? 1 : prec;
    const exp = x === 0 ? 0 : Number(x.toExponential(p - 1).split("e")[1]);
    let s;
    if (exp < -4 || exp >= p) {
        s = exponential(x, p - 1, alt);
        if (!alt) s = s.replace(/\.?0+e/, "e");
    } else {
        s = fixed(x, p - 1 - exp, alt);
        if (!alt && s.includes(".")) s = s.replace(/\.?0+$/, "");
    }
    return s;
};

/* formats the number 'x' with a format ending in e, E, f, g or G */
const formatFloat = function(fmt, x) {
    const [, flags, width, precision, spec] = FLOAT_FORMAT.exec(fmt);
    const upper = spec === "E" || spec === "G";
    let sign = "";
    if (x < 0 || Object.is(x, -0)) sign = "-";
    else if (flags.includes("+")) sign = "+";
    else if (flags.includes(" ")) sign = " ";
    const a = Math.abs(x);
    let body;
    let finite = true;
    if (Number.isNaN(x)) {
        body = "nan";
        finite = false;
    } else if (a === Infinity) {
        body = "inf";
        finite = false;
    } else {
        const prec = count(precision, 6);
        const alt = flags.includes("#");
        const lower = spec.toLowerCase();
        if (lower === "e") body = exponential(a, prec, alt);
        else if (lower === "f") body = fixed(a, prec, alt);
        else body = general(a, prec, alt);
    }
    if (upper) body = body.toUpperCase();
    return pad(sign, body, flags, count(width, 0), finite);
};

/* formats the string 's' with a format ending in s */
const formatString = function(fmt, s) {
    const [, flags, width, precision] = STRING_FORMAT.exec(fmt);
    if (precision !== undefined) s = s.slice(0, count(precision));
    return pad("", s, flags, count(width, 0), false);
};

module.exports.formatFloat = formatFloat;
module.exports.formatString = formatString;
