import DiffMatchPatch from 'diff-match-patch';
import type { WordChange } from '$lib/types/index.js';

const dmp = new DiffMatchPatch();

export function computeWordDiff(oldText: string, newText: string): WordChange[] {
	const diffs = dmp.diff_main(oldText, newText);
	dmp.diff_cleanupSemantic(diffs);

	return diffs.map(([op, text]) => ({
		type: op === 0 ? 'equal' : op === 1 ? 'insert' : 'delete',
		text
	}));
}

export function hasSignificantChanges(wordDiff: WordChange[]): boolean {
	return wordDiff.some((change) => change.type !== 'equal');
}
