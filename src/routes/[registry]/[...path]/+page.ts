import { error } from "@sveltejs/kit";
import { getRegistry } from "#lib/registries/index.js";
import { parseComparePath } from "#lib/url.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params, url }) => {
	const registry = getRegistry(params.registry);
	if (!registry) error(404, "Page not found");

	const request = parseComparePath(registry.id, params.path, url.searchParams);
	if (!request || !registry.isValidName(request.name)) {
		error(400, `Expected a link like /${registry.id}/<${registry.nameLabel.toLowerCase()}>/<from>...<to>`);
	}
	return { registry, request };
};
