export function normalizeArchivePath(path: string, format: 'tgz' | 'zip'): string {
	const normalized = path.replace(/^\.\/+/, '').replace(/^\/+/, '');
	if (!normalized) return '';

	if (format === 'tgz') {
		return normalized.startsWith('package/') ? normalized.slice('package/'.length) : normalized;
	}

	const firstSlash = normalized.indexOf('/');
	return firstSlash === -1 ? normalized : normalized.slice(firstSlash + 1);
}
