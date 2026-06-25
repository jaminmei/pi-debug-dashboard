import type { ServerResponse } from "node:http"
import type { GoalDbAccessor } from "./goal-db.ts"

const CORS = { "Access-Control-Allow-Origin": "*" }

function json(res: ServerResponse, data: unknown): void {
	res.writeHead(200, { "Content-Type": "application/json", ...CORS })
	res.end(JSON.stringify(data))
}

function jsonError(res: ServerResponse, code: number, message: string): void {
	res.writeHead(code, { "Content-Type": "application/json", ...CORS })
	res.end(JSON.stringify({ error: message }))
}

/**
 * Handles /goal/* routes. Returns true if the request was handled (matched a
 * goal route), false otherwise so the caller can continue its own routing.
 *
 * When accessor is null (no DB configured), every goal route responds 503
 * except /goal/status which reports the unconfigured state.
 */
export function handleGoalRoute(
	url: URL,
	res: ServerResponse,
	accessor: GoalDbAccessor | null,
): boolean {
	if (!url.pathname.startsWith("/goal/")) return false

	if (url.pathname === "/goal/status") {
		json(res, accessor ? accessor.status : { connected: false, error: "No goal database configured. Start with --goal-db <path>.", dbPath: null })
		return true
	}

	if (!accessor) {
		jsonError(res, 503, "No goal database configured")
		return true
	}

	if (url.pathname === "/goal/list") {
		json(res, accessor.listGoals())
		return true
	}

	if (url.pathname === "/goal/detail") {
		const goalId = url.searchParams.get("goalId")
		if (!goalId) {
			jsonError(res, 400, "Missing goalId parameter")
			return true
		}
		const goal = accessor.getGoal(goalId)
		if (!goal) {
			jsonError(res, 404, "Goal not found")
			return true
		}
		json(res, goal)
		return true
	}

	if (url.pathname === "/goal/events") {
		const goalId = url.searchParams.get("goalId")
		if (!goalId) {
			jsonError(res, 400, "Missing goalId parameter")
			return true
		}
		const since = Number.parseInt(url.searchParams.get("since") ?? "0", 10) || 0
		json(res, accessor.getEvents(goalId, since))
		return true
	}

	return false
}
