import { gzipSync, strToU8 } from "fflate";

export interface TarInput {
	name: string;
	content: string | Uint8Array;
	/** ustar type flag; `0` is a regular file. */
	type?: string;
}

/** Builds a gzipped ustar archive: 512-byte headers, padded contents, zero-block terminator. */
export function tgz(entries: TarInput[]): Uint8Array {
	const blocks: Uint8Array[] = [];
	for (const entry of entries) {
		const bytes = typeof entry.content === "string" ? strToU8(entry.content) : entry.content;
		const header = new Uint8Array(512);
		header.set(strToU8(entry.name.slice(0, 100)), 0);
		header.set(strToU8(bytes.length.toString(8).padStart(11, "0") + " "), 124);
		header[156] = (entry.type ?? "0").charCodeAt(0);
		header.set(strToU8("ustar\0"), 257);
		blocks.push(header);
		const body = new Uint8Array(Math.ceil(bytes.length / 512) * 512);
		body.set(bytes);
		blocks.push(body);
	}
	blocks.push(new Uint8Array(1024));

	const tar = new Uint8Array(blocks.reduce((sum, block) => sum + block.length, 0));
	let offset = 0;
	for (const block of blocks) {
		tar.set(block, offset);
		offset += block.length;
	}
	return gzipSync(tar);
}
