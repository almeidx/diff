import { json, error, isHttpError } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { npmRegistry } from "$lib/server/registries/npm";
import { wordpressRegistry } from "$lib/server/registries/wordpress";
import { loadFileContents } from "$lib/server/diff/load-file-contents";
import { getErrorMessage, isNotFoundError } from "$lib/server/errors";

const MAX_NAME_LENGTH = 300;
const MAX_VERSION_LENGTH = 256;
const MAX_PATH_LENGTH = 1000;

export const GET: RequestHandler = async ({ url, platform }) => {
	const type = url.searchParams.get("type");
	const name = url.searchParams.get("name")?.trim();
	const fromVersion = url.searchParams.get("from")?.trim();
	const toVersion = url.searchParams.get("to")?.trim();
	const path = url.searchParams.get("path");

	if (!type || !name || !fromVersion || !toVersion || !path) {
		error(400, "Missing type, name, from, to, or path parameter");
	}

	if (type !== "npm" && type !== "wp") {
		error(400, "Invalid type parameter");
	}

	if (name.length > MAX_NAME_LENGTH || fromVersion.length > MAX_VERSION_LENGTH) {
		error(400, "Package name or version string too long");
	}

	if (toVersion.length > MAX_VERSION_LENGTH || path.length > MAX_PATH_LENGTH) {
		error(400, "Version string or file path too long");
	}

	const waitUntil = platform?.context
		? (promise: Promise<unknown>) => {
				platform.context.waitUntil(promise);
			}
		: undefined;

	try {
		const contents = await loadFileContents({
			registry: type === "npm" ? npmRegistry : wordpressRegistry,
			packageType: type,
			packageName: name,
			fromVersion,
			toVersion,
			archiveFormat: type === "npm" ? "tgz" : "zip",
			path,
			waitUntil,
		});

		if (!contents) {
			error(404, "File contents are not available for expansion");
		}

		return json(contents);
	} catch (e) {
		if (isHttpError(e)) throw e;

		const message = getErrorMessage(e, "Failed to load file contents");
		error(isNotFoundError(e) ? 404 : 502, message);
	}
};
