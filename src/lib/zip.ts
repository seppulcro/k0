/**
 * Minimal ZIP read/write using native browser APIs only (no dependencies).
 *
 * Supports STORE (uncompressed) entries — sufficient for text-based
 * keymap YAML + SVG files where compression gains are negligible.
 */

const SIGNATURE_LOCAL = 0x04034b50;
const SIGNATURE_CENTRAL = 0x02014b50;
const SIGNATURE_END = 0x06054b50;

export interface ZipEntry {
	name: string;
	data: Uint8Array;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Extract all entries from a ZIP ArrayBuffer. */
export function unzip(buffer: ArrayBuffer): ZipEntry[] {
	const view = new DataView(buffer);
	const entries: ZipEntry[] = [];
	let offset = 0;

	while (offset + 4 <= buffer.byteLength) {
		const sig = view.getUint32(offset, true);
		if (sig !== SIGNATURE_LOCAL) break;

		const nameLen = view.getUint16(offset + 26, true);
		const extraLen = view.getUint16(offset + 28, true);
		const compSize = view.getUint32(offset + 18, true);
		const name = new TextDecoder().decode(
			new Uint8Array(buffer, offset + 30, nameLen),
		);

		const dataStart = offset + 30 + nameLen + extraLen;
		const data = new Uint8Array(buffer, dataStart, compSize);

		entries.push({ name, data });
		offset = dataStart + compSize;
	}

	return entries;
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/** Create a ZIP blob from name→content pairs (STORE, no compression). */
export function zip(files: Record<string, string>): Blob {
	const encoder = new TextEncoder();
	const entries: { name: Uint8Array; data: Uint8Array; offset: number }[] = [];

	// Pass 1: build local file headers + data
	const parts: Uint8Array[] = [];
	let offset = 0;

	for (const [name, content] of Object.entries(files)) {
		const nameBytes = encoder.encode(name);
		const dataBytes = encoder.encode(content);
		const crc = crc32(dataBytes);

		// Local file header (30 bytes + name + data)
		const header = new ArrayBuffer(30);
		const hv = new DataView(header);
		hv.setUint32(0, SIGNATURE_LOCAL, true);
		hv.setUint16(4, 20, true); // version needed
		hv.setUint16(6, 0, true); // flags
		hv.setUint16(8, 0, true); // compression: STORE
		hv.setUint16(10, 0, true); // mod time
		hv.setUint16(12, 0, true); // mod date
		hv.setUint32(14, crc, true);
		hv.setUint32(18, dataBytes.length, true); // compressed size
		hv.setUint32(22, dataBytes.length, true); // uncompressed size
		hv.setUint16(26, nameBytes.length, true);
		hv.setUint16(28, 0, true); // extra length

		entries.push({ name: nameBytes, data: dataBytes, offset });

		const headerBytes = new Uint8Array(header);
		parts.push(headerBytes, nameBytes, dataBytes);
		offset += headerBytes.length + nameBytes.length + dataBytes.length;
	}

	// Pass 2: central directory
	const centralStart = offset;
	for (const entry of entries) {
		const crc = crc32(entry.data);
		const cd = new ArrayBuffer(46);
		const cv = new DataView(cd);
		cv.setUint32(0, SIGNATURE_CENTRAL, true);
		cv.setUint16(4, 20, true); // version made by
		cv.setUint16(6, 20, true); // version needed
		cv.setUint16(8, 0, true); // flags
		cv.setUint16(10, 0, true); // compression: STORE
		cv.setUint16(12, 0, true); // mod time
		cv.setUint16(14, 0, true); // mod date
		cv.setUint32(16, crc, true);
		cv.setUint32(20, entry.data.length, true);
		cv.setUint32(24, entry.data.length, true);
		cv.setUint16(28, entry.name.length, true);
		cv.setUint16(30, 0, true); // extra length
		cv.setUint16(32, 0, true); // comment length
		cv.setUint16(34, 0, true); // disk number
		cv.setUint16(36, 0, true); // internal attrs
		cv.setUint32(38, 0, true); // external attrs
		cv.setUint32(42, entry.offset, true); // local header offset

		const cdBytes = new Uint8Array(cd);
		parts.push(cdBytes, entry.name);
		offset += cdBytes.length + entry.name.length;
	}

	// End of central directory
	const centralSize = offset - centralStart;
	const end = new ArrayBuffer(22);
	const ev = new DataView(end);
	ev.setUint32(0, SIGNATURE_END, true);
	ev.setUint16(4, 0, true); // disk number
	ev.setUint16(6, 0, true); // disk with CD
	ev.setUint16(8, entries.length, true);
	ev.setUint16(10, entries.length, true);
	ev.setUint32(12, centralSize, true);
	ev.setUint32(16, centralStart, true);
	ev.setUint16(20, 0, true); // comment length
	parts.push(new Uint8Array(end));

	return new Blob(parts, { type: "application/zip" });
}

// ---------------------------------------------------------------------------
// CRC-32 (standard ZIP/PNG polynomial)
// ---------------------------------------------------------------------------

let crcTable: Uint32Array | null = null;

function ensureCrcTable(): Uint32Array {
	if (crcTable) return crcTable;
	crcTable = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let j = 0; j < 8; j++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		crcTable[i] = c;
	}
	return crcTable;
}

function crc32(data: Uint8Array): number {
	const table = ensureCrcTable();
	let crc = 0xffffffff;
	for (let i = 0; i < data.length; i++) {
		crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}
