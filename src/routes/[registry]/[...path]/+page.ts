import { error } from "@sveltejs/kit";
import { LIMITS_OFF_VALUE, LIMITS_PARAM } from "#lib/archive/limits.js";
import { getRegistry } from "#lib/registries/index.js";
import { parseComparePath } from "#lib/url.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params, url }) => {
	const registry = getRegistry(params.registry);
	if (!registry) error(404, "Page not found");

	const parsed = parseComparePath(params.path);
	if (!parsed || !registry.isValidName(parsed.name) || parsed.from.length > 256 || parsed.to.length > 256) {
		error(400, `Expected a link like /${registry.id}/<${registry.nameLabel.toLowerCase()}>/<from>...<to>`);
	}

	return {
		registry: registry.id,
		...parsed,
		unlimited: url.searchParams.get(LIMITS_PARAM) === LIMITS_OFF_VALUE,
	};
};
