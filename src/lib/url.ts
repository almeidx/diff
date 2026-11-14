import type { CompareRequest } from "#lib/compare/protocol.js";

const UNLIMITED_PARAM = "limits";
const UNLIMITED_VALUE = "off";
const MAX_VERSION_LENGTH = 256;

/** Like `encodeURIComponent`, but keeps `@` readable for scoped npm names. */
function encodeSegment(segment: string): string {
	return encodeURIComponent(segment).replaceAll("%40", "@");
}

/** `/npm/@scope/name/1.0.0...2.0.0`: the name may contain slashes, versions never do. */
export function comparePath({ registry, name, from, to, unlimited }: CompareRequest): string {
	const path = `/${registry}/${name.split("/").map(encodeSegment).join("/")}/${encodeSegment(from)}...${encodeSegment(to)}`;
	return unlimited ? `${path}?${UNLIMITED_PARAM}=${UNLIMITED_VALUE}` : path;
}

/** `rest` is the decoded path after the registry segment. */
export function parseComparePath(registry: string, rest: string, search: URLSearchParams): CompareRequest | null {
	const slash = rest.lastIndexOf("/");
	const [from, to, ...extra] = rest.slice(slash + 1).split("...");
	if (slash <= 0 || !from || !to || extra.length > 0) return null;
	if (from.length > MAX_VERSION_LENGTH || to.length > MAX_VERSION_LENGTH) return null;
	return { registry, name: rest.slice(0, slash), from, to, unlimited: search.get(UNLIMITED_PARAM) === UNLIMITED_VALUE };
}

/** Home page link that preselects a package. */
export function pickerPath(registry: string, name?: string): string {
	const params = new URLSearchParams({ registry });
	if (name) params.set("name", name);
	return `/?${params}`;
}

export function parsePickerPath(search: URLSearchParams): { registry: string | null; name: string | null } {
	return { registry: search.get("registry"), name: search.get("name") };
}
