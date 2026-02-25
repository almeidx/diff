import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { npmRegistry } from "$lib/server/registries/npm";
import { wordpressRegistry } from "$lib/server/registries/wordpress";
import { getErrorMessage, isNotFoundError } from "$lib/server/errors";

export const GET: RequestHandler = async ({ url }) => {
	const type = url.searchParams.get("type");
	const name = url.searchParams.get("name");

	if (!type || !name) {
		throw error(400, "Missing type or name parameter");
	}

	if (type !== "npm" && type !== "wp") {
		throw error(400, "Invalid type parameter");
	}

	try {
		const registry = type === "npm" ? npmRegistry : wordpressRegistry;
		const versions = await registry.getVersions(name);
		return json({ versions });
	} catch (e) {
		const message = getErrorMessage(e, "Failed to fetch versions");
		throw error(isNotFoundError(e) ? 404 : 502, message);
	}
};
