export function isNotFoundError(error: unknown): boolean {
	return error instanceof Error && /not found/i.test(error.message);
}

export function getErrorMessage(error: unknown, fallback: string): string {
	if (!(error instanceof Error) || !error.message) return fallback;

	const msg = error.message;
	if (/https?:\/\//i.test(msg)) return fallback;
	if (msg.length > 300) return fallback;

	return msg;
}
