/**
 * Type stubs for pi extension API.
 *
 * Minimal subset used by the debug dashboard extension.
 * For the full API, see: https://github.com/earendil-works/pi-mono
 * Source version: >= 0.75.0
 */

// -- Context types used by the dashboard --

export interface ContextUsage {
	tokens: number | null;
	contextWindow: number;
	percent: number | null;
}

export interface ExtensionUIContext {
	notify(message: string, type?: "info" | "warning" | "error"): void;
	setStatus(key: string, text: string | undefined): void;
}

export interface ReadonlySessionManager {
	getSessionFile(): string | undefined;
}

export interface ExtensionContext {
	ui: ExtensionUIContext;
	sessionManager: ReadonlySessionManager;
	getContextUsage(): ContextUsage | undefined;
}

// -- Event handler type --

export type ExtensionHandler<E, R = undefined> = (
	event: E,
	ctx: ExtensionContext,
) => Promise<R | void> | R | void;

// -- Command registration --

export interface CommandArgumentCompletion {
	value: string;
	label: string;
}

export interface RegisteredCommand {
	description: string;
	getArgumentCompletions?(argumentPrefix: string): CommandArgumentCompletion[];
	handler: (args: string, ctx: ExtensionContext) => Promise<void> | void;
}

// -- Extension API --

export interface ExtensionAPI {
	on(event: string, handler: ExtensionHandler<any>): void;
	registerCommand(
		name: string,
		options: Omit<RegisteredCommand, "name" | "sourceInfo">,
	): void;
}
