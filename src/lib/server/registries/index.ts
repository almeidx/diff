import type { Registry } from './types.js';
import { npmRegistry } from './npm.js';
import { wordpressRegistry } from './wordpress.js';
import type { PackageType } from '$lib/types/index.js';

export function getRegistry(type: PackageType): Registry {
	switch (type) {
		case 'npm':
			return npmRegistry;
		case 'wp':
			return wordpressRegistry;
		default:
			throw new Error(`Unknown package type: ${type}`);
	}
}

export { npmRegistry, wordpressRegistry };
export type { Registry } from './types.js';
