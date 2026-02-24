export function isNotFoundError(error: unknown): boolean {
	return error instanceof Error && /not found/i.test(error.message);
}

export function getErrorMessage(error: unknown, fallback: string): string {
	return error instanceof Error && error.message ? error.message : fallback;
}
