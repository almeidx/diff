import { dev } from "$app/environment";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;
const isTestEnvironment = import.meta.env?.MODE === "test";

function serializeValue(value: unknown): unknown {
	if (value instanceof Error) {
		return {
			name: value.name,
			message: value.message,
			stack: value.stack,
		};
	}

	if (Array.isArray(value)) {
		return value.map((entry) => serializeValue(entry));
	}

	if (value && typeof value === "object") {
		const serialized: Record<string, unknown> = {};
		for (const [key, nested] of Object.entries(value)) {
			serialized[key] = serializeValue(nested);
		}
		return serialized;
	}

	return value;
}

function writeLog(level: LogLevel, message: string, context: LogContext = {}): void {
	if (isTestEnvironment) {
		return;
	}

	if (!dev && level === "debug") {
		return;
	}

	const payload: Record<string, unknown> = {
		timestamp: new Date().toISOString(),
		level,
		message,
	};

	for (const [key, value] of Object.entries(context)) {
		payload[key] = serializeValue(value);
	}

	const line = JSON.stringify(payload);
	if (level === "error") {
		console.error(line);
		return;
	}

	if (level === "warn") {
		console.warn(line);
		return;
	}

	console.log(line);
}

export function logDebug(message: string, context?: LogContext): void {
	writeLog("debug", message, context);
}

export function logInfo(message: string, context?: LogContext): void {
	writeLog("info", message, context);
}

export function logWarn(message: string, context?: LogContext): void {
	writeLog("warn", message, context);
}

export function logError(message: string, context?: LogContext): void {
	writeLog("error", message, context);
}
