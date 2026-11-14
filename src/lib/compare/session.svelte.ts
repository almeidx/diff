import { AppError } from "#lib/errors.js";
import { compare } from "./client.js";
import type { ChangedFile, DiffItem } from "./diff.js";
import type { CompareEvent, CompareRequest } from "./protocol.js";

export interface DownloadProgress {
	loaded: number;
	total: number | null;
	done: boolean;
}

/**
 * Reactive view of one running comparison. Diff payloads are large, so they
 * are kept out of `$state` and pushed to a single subscriber (the viewer).
 */
export class CompareSession {
	phase = $state<"metadata" | "download" | "diff" | "done" | "error">("metadata");
	downloads = $state<Record<"from" | "to", DownloadProgress>>({
		from: { loaded: 0, total: null, done: false },
		to: { loaded: 0, total: null, done: false },
	});
	files = $state.raw<ChangedFile[] | null>(null);
	diffed = $state(0);
	additions = $state(0);
	deletions = $state(0);
	error = $state.raw<AppError | null>(null);

	readonly request: CompareRequest;
	readonly #items: DiffItem[] = [];
	#listener: ((items: DiffItem[]) => void) | null = null;
	readonly #controller = new AbortController();

	constructor(request: CompareRequest) {
		this.request = request;
		compare(request, (event) => this.#apply(event), this.#controller.signal).then(
			() => {
				this.phase = "done";
			},
			(error: unknown) => {
				if (this.#controller.signal.aborted) return;
				this.error = error instanceof AppError ? error : new AppError(String(error));
				this.phase = "error";
			},
		);
	}

	/** Replays every diff delivered so far, then forwards new batches. */
	subscribe(listener: (items: DiffItem[]) => void): () => void {
		if (this.#items.length > 0) listener(this.#items.slice());
		this.#listener = listener;
		return () => {
			if (this.#listener === listener) this.#listener = null;
		};
	}

	cancel(): void {
		this.#controller.abort();
	}

	#apply(event: CompareEvent): void {
		switch (event.type) {
			case "metadata":
				this.phase = "metadata";
				break;
			case "download":
				this.phase = "download";
				this.downloads[event.side] = { loaded: event.loaded, total: event.total, done: event.done };
				break;
			case "files":
				this.phase = "diff";
				this.files = event.files;
				break;
			case "diffs": {
				let additions = 0;
				let deletions = 0;
				for (const item of event.items) {
					this.#items.push(item);
					additions += item.additions;
					deletions += item.deletions;
				}
				this.additions += additions;
				this.deletions += deletions;
				this.diffed = event.completed;
				this.#listener?.(event.items);
				break;
			}
		}
	}
}
