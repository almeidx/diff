export function compareVersions(a: string, b: string): number {
	const partsA = a.split('.').map((p) => parseInt(p, 10) || 0);
	const partsB = b.split('.').map((p) => parseInt(p, 10) || 0);

	for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
		const numA = partsA[i] || 0;
		const numB = partsB[i] || 0;
		if (numA !== numB) return numA - numB;
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
