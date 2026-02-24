const fallbackVersionCollator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base'
});

interface ParsedVersion {
	core: number[];
	preRelease: string[] | null;
}

export function compareVersions(a: string, b: string): number {
	const parsedA = parseComparableVersion(a);
	const parsedB = parseComparableVersion(b);

	if (!parsedA || !parsedB) {
		return fallbackVersionCollator.compare(a, b);
	}

	const coreLength = Math.max(parsedA.core.length, parsedB.core.length);
	for (let i = 0; i < coreLength; i++) {
		const partA = parsedA.core[i] ?? 0;
		const partB = parsedB.core[i] ?? 0;

		if (partA !== partB) {
			return partA - partB;
		}
	}

	if (!parsedA.preRelease && !parsedB.preRelease) return 0;
	if (!parsedA.preRelease) return 1;
	if (!parsedB.preRelease) return -1;

	const preLength = Math.max(parsedA.preRelease.length, parsedB.preRelease.length);
	for (let i = 0; i < preLength; i++) {
		const idA = parsedA.preRelease[i];
		const idB = parsedB.preRelease[i];

		if (idA === undefined) return -1;
		if (idB === undefined) return 1;

		const numericA = isNumericIdentifier(idA);
		const numericB = isNumericIdentifier(idB);

		if (numericA && numericB) {
			const numA = Number(idA);
			const numB = Number(idB);
			if (numA !== numB) return numA - numB;
			continue;
		}

		if (numericA) return -1;
		if (numericB) return 1;

		const lexical = idA.localeCompare(idB);
		if (lexical !== 0) return lexical;
	}

	return 0;
}

export function parseVersionRange(versionPart: string): { fromVersion: string; toVersion: string } | null {
	const match = versionPart.match(/^(.+?)\.\.\.(.+)$/);
	if (!match) return null;

	return {
		fromVersion: match[1],
		toVersion: match[2]
	};
}

export function formatInvalidVersionError(
	fromVersion: string,
	toVersion: string,
	fromValid: boolean,
	toValid: boolean
): string {
	const invalidVersions = [];
	if (!fromValid) invalidVersions.push(fromVersion);
	if (!toValid) invalidVersions.push(toVersion);

	return `Invalid version${invalidVersions.length > 1 ? 's' : ''}: ${invalidVersions.join(', ')}`;
}

function parseComparableVersion(version: string): ParsedVersion | null {
	const normalized = version.trim().replace(/^v(?=\d)/i, '');
	const match = normalized.match(/^(\d+(?:\.\d+)*)(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/);
	if (!match) return null;

	const core = match[1].split('.').map((part) => Number.parseInt(part, 10));
	if (core.some(Number.isNaN)) return null;

	const preRelease = match[2] ? match[2].split('.') : null;
	return { core, preRelease };
}

function isNumericIdentifier(value: string): boolean {
	return /^\d+$/.test(value);
}
