import Database from "better-sqlite3"
import type { Database as DatabaseConnection } from "better-sqlite3"
import { resolve } from "node:path"

/**
 * Read-only SQLite accessor for the oh-my-goal runtime database.
 *
 * Opens the SAME db file that oh-my-goal writes to, but in read-only mode
 * ({ readonly: true, fileMustExist: true }) so the dashboard can never corrupt
 * the runtime. WAL mode (set by the writer) allows safe concurrent reads.
 *
 * Connection pattern mirrors oh-my-goal's `src/database/connection.ts`:
 *   - path resolution via path.resolve()
 *   - default path ".new_symphony/data/new_symphony.db"
 *   - read-only: we do NOT set journal_mode (write-only pragma)
 */

export const DEFAULT_GOAL_DB_PATH = ".new_symphony/data/new_symphony.db"

const MAX_EVENTS = 500

export interface GoalSummary {
	goal_id: string
	status: string
	objective: string
	goal_style: string
	current_iteration: number
	max_iterations: number
	runtime_phase: string | null
	created_at: string
	updated_at: string
	closed_at: string | null
}

export interface GoalDetail extends GoalSummary {
	parent_goal_id: string | null
	root_goal_id: string | null
	acceptance_criteria_json: string
	constraints_json: string | null
	budget_json: string | null
	created_by: string
	version: number
	active_orchestration_session_id: string | null
	active_dispatch_job_id: string | null
	active_worker_session_id: string | null
	active_judge_session_id: string | null
	current_pipeline_step_index: number | null
	last_worker_output_id: string | null
	last_summary_id: string | null
	last_verdict_id: string | null
	last_human_block_id: string | null
	consecutive_judge_parse_failures: number | null
	lease_owner: string | null
	lease_expires_at: string | null
	heartbeat_at: string | null
	last_error: string | null
	runtime_version: number | null
}

export interface GoalEvent {
	event_id: string
	sequence_no: number
	event_type: string
	aggregate_type: string
	aggregate_id: string
	actor_type: string
	actor_id: string | null
	old_state: string | null
	new_state: string | null
	payload_json: string | null
	causation_id: string | null
	correlation_id: string | null
	created_at: string
}

export interface GoalDbStatus {
	readonly connected: boolean
	readonly error: string | null
	readonly dbPath: string
}

export interface GoalDbAccessor {
	readonly status: GoalDbStatus
	listGoals(): GoalSummary[]
	getGoal(goalId: string): GoalDetail | null
	getEvents(goalId: string, sinceSeq: number): GoalEvent[]
	reconnect(): void
	close(): void
}

const SQL_LIST_GOALS = `
	SELECT
		g.goal_id, g.status, g.objective, g.goal_style,
		g.current_iteration, g.max_iterations,
		g.created_at, g.updated_at, g.closed_at,
		s.runtime_phase
	FROM goals g
	LEFT JOIN goal_runtime_state s ON s.goal_id = g.goal_id
	ORDER BY g.updated_at DESC
`

const SQL_GET_GOAL = `
	SELECT
		g.goal_id, g.parent_goal_id, g.root_goal_id, g.status, g.objective,
		g.goal_style, g.acceptance_criteria_json, g.constraints_json, g.budget_json,
		g.max_iterations, g.current_iteration, g.created_by,
		g.created_at, g.updated_at, g.closed_at, g.version,
		s.runtime_phase,
		s.active_orchestration_session_id, s.active_dispatch_job_id,
		s.active_worker_session_id, s.active_judge_session_id,
		s.current_pipeline_step_index, s.last_worker_output_id, s.last_summary_id,
		s.last_verdict_id, s.last_human_block_id, s.consecutive_judge_parse_failures,
		s.lease_owner, s.lease_expires_at, s.heartbeat_at, s.last_error,
		s.version AS runtime_version
	FROM goals g
	LEFT JOIN goal_runtime_state s ON s.goal_id = g.goal_id
	WHERE g.goal_id = ?
`

const SQL_GET_EVENTS = `
	SELECT
		event_id, sequence_no, event_type, aggregate_type, aggregate_id,
		actor_type, actor_id, old_state, new_state, payload_json,
		causation_id, correlation_id, created_at
	FROM goal_event_ledger
	WHERE goal_id = ? AND sequence_no > ?
	ORDER BY sequence_no ASC
	LIMIT ${MAX_EVENTS}
`

export function createGoalDbAccessor(dbPath: string): GoalDbAccessor {
	const resolvedPath = resolve(dbPath)
	let db: DatabaseConnection | null = null
	let error: string | null = null

	function status(): GoalDbStatus {
		ensureOpen()
		return { connected: db !== null, error, dbPath: resolvedPath }
	}

	function ensureOpen(): DatabaseConnection | null {
		if (db) return db
		try {
			const conn = new Database(resolvedPath, { readonly: true, fileMustExist: true })
			conn.pragma("foreign_keys = ON")
			db = conn
			error = null
			return conn
		} catch (e) {
			error = e instanceof Error ? e.message : String(e)
			return null
		}
	}

	function safeAll<T>(sql: string, params: unknown[], fallback: T[]): T[] {
		const conn = ensureOpen()
		if (!conn) return fallback
		try {
			return conn.prepare(sql).all(...params) as T[]
		} catch (e) {
			error = e instanceof Error ? e.message : String(e)
			return fallback
		}
	}

	function safeGet<T>(sql: string, params: unknown[]): T | null {
		const conn = ensureOpen()
		if (!conn) return null
		try {
			return (conn.prepare(sql).get(...params) as T) ?? null
		} catch (e) {
			error = e instanceof Error ? e.message : String(e)
			return null
		}
	}

	return {
		get status() {
			return status()
		},
		listGoals() {
			return safeAll<GoalSummary>(SQL_LIST_GOALS, [], [])
		},
		getGoal(goalId: string) {
			return safeGet<GoalDetail>(SQL_GET_GOAL, [goalId])
		},
		getEvents(goalId: string, sinceSeq: number) {
			return safeAll<GoalEvent>(SQL_GET_EVENTS, [goalId, sinceSeq], [])
		},
		reconnect() {
			if (db) {
				try {
					db.close()
				} catch {}
				db = null
			}
			error = null
			ensureOpen()
		},
		close() {
			if (db) {
				try {
					db.close()
				} catch {}
				db = null
			}
			error = null
		},
	}
}
