import { readFile, writeFile } from "node:fs/promises";

const path = "worker-configuration.d.ts";

// `wrangler types` pins Cloudflare.GlobalProps.mainModule to the built worker
// entry (.svelte-kit/cloudflare/_worker.js). That file only exists after a
// build, and importing it drags the entire untyped server bundle into type
// checking. We never consume GlobalProps, so neutralize the reference.
let source = await readFile(path, "utf8");
source = source.replaceAll('typeof import("./.svelte-kit/cloudflare/_worker");', "unknown");
await writeFile(path, source);
