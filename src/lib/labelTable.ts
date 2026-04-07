/**
 * Standard label → Linux evdev key code lookup table.
 *
 * Keys: lowercased keymap-drawer tap label strings.
 * Values: Linux input event key codes (from linux/input-event-codes.h).
 *
 * These codes are what /dev/input/eventN reports and what the evdev Rust crate reads.
 */

export const LABEL_TABLE: Record<string, number> = {
	// Alpha
	a: 30,
	b: 48,
	c: 46,
	d: 32,
	e: 18,
	f: 33,
	g: 34,
	h: 35,
	i: 23,
	j: 36,
	k: 37,
	l: 38,
	m: 50,
	n: 49,
	o: 24,
	p: 25,
	q: 16,
	r: 19,
	s: 31,
	t: 20,
	u: 22,
	v: 47,
	w: 17,
	x: 45,
	y: 21,
	z: 44,
	// Numbers
	"1": 2,
	"2": 3,
	"3": 4,
	"4": 5,
	"5": 6,
	"6": 7,
	"7": 8,
	"8": 9,
	"9": 10,
	"0": 11,
	// Specials
	enter: 28,
	return: 28,
	esc: 1,
	escape: 1,
	bckspc: 14,
	backspace: 14,
	tab: 15,
	space: 57,
	"-": 12,
	"=": 13,
	"[": 26,
	"]": 27,
	"\\": 43,
	";": 39,
	"'": 40,
	"`": 41,
	",": 51,
	".": 52,
	"/": 53,
	// Function keys
	f1: 59,
	f2: 60,
	f3: 61,
	f4: 62,
	f5: 63,
	f6: 64,
	f7: 65,
	f8: 66,
	f9: 67,
	f10: 68,
	f11: 87,
	f12: 88,
	// Navigation
	insert: 110,
	ins: 110,
	home: 102,
	"pg up": 104,
	pgup: 104,
	delete: 111,
	del: 111,
	end: 107,
	"pg dn": 109,
	pgdn: 109,
	right: 106,
	left: 105,
	down: 108,
	up: 103,
	// Modifiers
	lctrl: 29,
	ctrl: 29,
	rctrl: 97,
	lshift: 42,
	shift: 42,
	rshift: 54,
	lalt: 56,
	alt: 56,
	ralt: 100,
	lgui: 125,
	meta: 125,
	super: 125,
	win: 125,
	rgui: 126,
	capslock: 58,
	caps: 58,
};

/**
 * Build evdevToPos from a labelToPos map.
 * Returns { evdevCode (string) -> keypos } for the Rust backend.
 */
export function buildPosMaps(labelToPos: Map<string, number>): {
	evdevToPos: Record<string, number>;
} {
	const evdevToPos: Record<string, number> = {};
	for (const [label, pos] of labelToPos) {
		const code = LABEL_TABLE[label.toLowerCase()];
		if (code === undefined) continue;
		evdevToPos[String(code)] = pos;
	}
	return { evdevToPos };
}
