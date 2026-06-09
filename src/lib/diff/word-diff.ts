import DiffMatchPatch from "diff-match-patch";
import type { WordChange } from "$lib/types/index.js";

const dmp = new DiffMatchPatch();
dmp.Diff_Timeout = 2;

const MAX_WORD_DIFF_LINE_LENGTH = 10_000;
const WORD_DIFF_CACHE_LIMIT = 2_000;
const wordDiffCache = new Map<string, SideWordDiffs>();

type WordDiffSide = "delete" | "add";

interface SideWordDiffs {
	delete: WordChange[];
	add: WordChange[];
}

export function getSideWordDiff(oldText: string, newText: string, side: WordDiffSide): WordChange[] | undefined {
	if (oldText.length + newText.length > MAX_WORD_DIFF_LINE_LENGTH) {
		return undefined;
	}

	const key = `${oldText}\0${newText}`;
	let cached = wordDiffCache.get(key);
	if (cached) {
		wordDiffCache.delete(key);
		wordDiffCache.set(key, cached);
		return cached[side];
	}

	const diffs = dmp.diff_main(oldText, newText);
	dmp.diff_cleanupSemantic(diffs);

	cached = {
		delete: diffs
			.filter(([op]) => op !== 1)
			.map(([op, text]) => ({
				type: op === 0 ? "equal" : "delete",
				text: detachString(text),
			})),
		add: diffs
			.filter(([op]) => op !== -1)
			.map(([op, text]) => ({
				type: op === 0 ? "equal" : "insert",
				text: detachString(text),
			})),
	};

	wordDiffCache.set(key, cached);
	if (wordDiffCache.size > WORD_DIFF_CACHE_LIMIT) {
		const oldestKey = wordDiffCache.keys().next().value;
		if (oldestKey !== undefined) {
			wordDiffCache.delete(oldestKey);
		}
	}

	return cached[side];
}

function detachString(text: string): string {
	return text.length === 0 ? "" : ` ${text}`.slice(1);
}
