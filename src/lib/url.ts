import { LIMITS_OFF_VALUE, LIMITS_PARAM } from "#lib/archive/limits.js";

/** Like `encodeURIComponent`, but keeps `@` readable for scoped npm names. */
function encodeSegment(segment: string): string {
	return encodeURIComponent(segment).replaceAll("%40", "@");
}

/** `/npm/@scope/name/1.0.0...2.0.0`: the name may contain slashes, versions never do. */
export function comparePath(registry: string, name: string, from: string, to: string, unlimited = false): string {
	const path = `/${registry}/${name.split("/").map(encodeSegment).join("/")}/${encodeSegment(from)}...${encodeSegment(to)}`;
	return unlimited ? `${path}?${LIMITS_PARAM}=${LIMITS_OFF_VALUE}` : path;
}

/** Parses the decoded rest of a compare URL after the registry segment. */
export function parseComparePath(rest: string): { name: string; from: string; to: string } | null {
	const slash = rest.lastIndexOf("/");
	const range = rest.slice(slash + 1).split("...");
	if (slash <= 0 || range.length !== 2 || !range[0] || !range[1]) return null;
	return { name: rest.slice(0, slash), from: range[0], to: range[1] };
}

/** Home page link that preselects a package. */
export function pickerPath(registry: string, name?: string): string {
	const params = new URLSearchParams({ registry });
	if (name) params.set("name", name);
	return `/?${params}`;
}
