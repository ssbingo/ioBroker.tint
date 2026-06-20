'use strict';

/**
 * Color utility functions for Müller Licht tint adapter
 * - CIE xy ↔ sRGB Hex conversion
 * - Tint Remote color wheel position map (36 positions × 10°)
 * - Brightness % ↔ deCONZ bri (0–254)
 * - Color temperature Kelvin ↔ Mired
 */

// ─── Brightness ───────────────────────────────────────────────────────────────

/**
 * deCONZ bri (0–254) → percentage (0–100)
 *
 * @param {number} bri - deCONZ brightness value (0–254)
 * @returns {number} Brightness percentage (0–100)
 */
function briToPercent(bri) {
	return Math.round((Math.max(0, Math.min(254, bri)) / 254) * 100);
}

/**
 * Percentage (0–100) → deCONZ bri (0–254)
 *
 * @param {number} pct - Brightness percentage (0–100)
 * @returns {number} deCONZ brightness value (0–254)
 */
function percentToBri(pct) {
	return Math.round((Math.max(0, Math.min(100, pct)) / 100) * 254);
}

// ─── Color Temperature ────────────────────────────────────────────────────────

/**
 * Mired → Kelvin
 *
 * deCONZ reports ct=0 for lights/groups that don't support color temperature
 * (e.g. plugs, or a group with no CT-capable members) — clamp to the
 * colorTemp state's declared range (2000–6500 K) instead of letting that
 * sentinel produce a huge out-of-range value.
 *
 * @param {number} mired - Color temperature in Mired
 * @returns {number} Color temperature in Kelvin
 */
function miredToKelvin(mired) {
	return Math.max(2000, Math.min(6500, Math.round(1000000 / Math.max(1, mired))));
}

/**
 * Kelvin → Mired
 *
 * @param {number} kelvin - Color temperature in Kelvin
 * @returns {number} Color temperature in Mired
 */
function kelvinToMired(kelvin) {
	return Math.round(1000000 / Math.max(1, kelvin));
}

// ─── CIE xy → sRGB Hex ───────────────────────────────────────────────────────

/**
 * Convert CIE 1931 xy chromaticity + brightness to sRGB Hex string.
 * Uses Wide Gamut D65 matrix (matches Philips Hue / Müller Licht tint)
 *
 * @param {number} x - CIE x chromaticity (0.0–1.0)
 * @param {number} y - CIE y chromaticity (0.0–1.0)
 *  @param {number} [bri] - deCONZ brightness (0–254, default 254) (0–254)
 * @returns {string} sRGB hex color string e.g. "#FF4400"
 */
function xyToHex(x, y, bri = 254) {
	if (y === 0) {
		return '#000000';
	}

	const Y = bri / 254;
	const X = (Y / y) * x;
	const Z = (Y / y) * (1.0 - x - y);

	// Wide Gamut D65 matrix (sRGB)
	let r = X * 1.656492 - Y * 0.354851 - Z * 0.255038;
	let g = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
	let b = X * 0.051713 - Y * 0.121364 + Z * 1.01153;

	// Clamp negatives
	r = Math.max(0, r);
	g = Math.max(0, g);
	b = Math.max(0, b);

	// Normalise so largest channel = 1.0
	const max = Math.max(r, g, b, 1);
	r /= max;
	g /= max;
	b /= max;

	// Gamma correction (sRGB)
	const gamma = v => (v <= 0.0031308 ? 12.92 * v : (1.0 + 0.055) * Math.pow(v, 1.0 / 2.4) - 0.055);

	const R = Math.round(gamma(r) * 255);
	const G = Math.round(gamma(g) * 255);
	const B = Math.round(gamma(b) * 255);

	return `#${[R, G, B]
		.map(v => v.toString(16).padStart(2, '0'))
		.join('')
		.toUpperCase()}`;
}

/**
 * sRGB Hex → CIE xy array [x, y].
 * Useful for writing a hex color to a light.
 *
 * @param {string} hex - sRGB hex color e.g. "#FF4400" or "FF4400"
 * @returns {[number, number]} CIE xy chromaticity pair
 */
function hexToXy(hex) {
	const clean = hex.replace('#', '');
	const R = parseInt(clean.slice(0, 2), 16) / 255;
	const G = parseInt(clean.slice(2, 4), 16) / 255;
	const B = parseInt(clean.slice(4, 6), 16) / 255;

	// Reverse gamma
	const linear = v => (v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92);

	const r = linear(R);
	const g = linear(G);
	const b = linear(B);

	// Wide Gamut D65 (inverse of the matrix above, approximate)
	const X = r * 0.664511 + g * 0.154324 + b * 0.162028;
	const Y = r * 0.283881 + g * 0.668433 + b * 0.047685;
	const Z = r * 0.000088 + g * 0.07231 + b * 0.986039;

	const sum = X + Y + Z;
	if (sum === 0) {
		return [0, 0];
	}

	return [Math.round((X / sum) * 10000) / 10000, Math.round((Y / sum) * 10000) / 10000];
}

// ─── Tint Remote color wheel (36 positions, 10° steps) ───────────────────────
//
// Source: empirical measurements from the community
// (github.com/dresden-elektronik/deconz-rest-plugin, xaviml/controllerx)
// angle → CIE xy sent by the remote on buttonevent 6002

/**
 * Tint Remote color wheel map: angle (0–350°, 10° steps) → CIE xy
 *
 *  {Record<number, {x: number, y: number}>}
 */
const COLOR_WHEEL_MAP = {
	0: { x: 0.7, y: 0.299 }, // Red
	10: { x: 0.68, y: 0.305 },
	20: { x: 0.65, y: 0.32 },
	30: { x: 0.61, y: 0.36 }, // Red-Orange
	40: { x: 0.57, y: 0.39 },
	50: { x: 0.53, y: 0.43 }, // Orange
	60: { x: 0.49, y: 0.45 },
	70: { x: 0.45, y: 0.47 }, // Yellow-Orange
	80: { x: 0.42, y: 0.5 },
	90: { x: 0.38, y: 0.52 }, // Yellow
	100: { x: 0.34, y: 0.54 },
	110: { x: 0.3, y: 0.54 },
	120: { x: 0.25, y: 0.53 }, // Yellow-Green
	130: { x: 0.21, y: 0.51 },
	140: { x: 0.18, y: 0.48 }, // Green
	150: { x: 0.16, y: 0.44 },
	160: { x: 0.15, y: 0.39 },
	170: { x: 0.155, y: 0.34 }, // Cyan-Green
	180: { x: 0.165, y: 0.29 }, // Cyan
	190: { x: 0.175, y: 0.25 },
	200: { x: 0.19, y: 0.21 },
	210: { x: 0.21, y: 0.175 }, // Cyan-Blue
	220: { x: 0.23, y: 0.15 },
	230: { x: 0.25, y: 0.13 }, // Blue
	240: { x: 0.2, y: 0.1 },
	250: { x: 0.16, y: 0.08 },
	260: { x: 0.14, y: 0.065 }, // Dark Blue
	270: { x: 0.16, y: 0.065 }, // Violet-Blue
	280: { x: 0.195, y: 0.075 },
	290: { x: 0.24, y: 0.085 }, // Violet
	300: { x: 0.28, y: 0.1 },
	310: { x: 0.33, y: 0.11 }, // Magenta
	320: { x: 0.39, y: 0.13 },
	330: { x: 0.46, y: 0.16 }, // Pink-Red
	340: { x: 0.54, y: 0.2 },
	350: { x: 0.62, y: 0.25 }, // Red-Pink
};

/**
 * Tint Remote zone group IDs → zone number (1–3)
 *
 *  {Record<number, number>}
 */
const ZONE_GROUP_MAP = {
	16388: 1,
	16389: 2,
	16390: 3,
};

/**
 * Decode the active zone from the sensor config.group string.
 * Returns 0 when "all" or undetermined.
 *
 * @param {string} groupString - Comma-separated group ids e.g. "16388" or "16388,16389,16390"
 * @returns {number} Zone number 0=all, 1=zone1, 2=zone2, 3=zone3
 */
function decodeRemoteZone(groupString) {
	if (!groupString) {
		return 0;
	}
	const parts = groupString.split(',').map(Number);
	if (parts.length === 1) {
		return ZONE_GROUP_MAP[parts[0]] || 0;
	}
	return 0; // multiple groups = "all"
}

module.exports = {
	briToPercent,
	percentToBri,
	miredToKelvin,
	kelvinToMired,
	xyToHex,
	hexToXy,
	COLOR_WHEEL_MAP,
	decodeRemoteZone,
};
