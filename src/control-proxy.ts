import { request, type IncomingMessage, type ServerResponse } from "node:http"

export function handleControlProxy(
	req: IncomingMessage,
	url: URL,
	res: ServerResponse,
	controlUrl: string | null,
): boolean {
	if (!url.pathname.startsWith("/control/")) return false

	if (!controlUrl) {
		res.writeHead(503, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
		res.end(
			JSON.stringify({
				error: "No control server configured. Start oh-my-goal control server: npm run control --db <path>",
			}),
		)
		return true
	}

	const target = new URL(url.pathname + url.search, controlUrl)
	const proxyReq = request(target, {
		method: req.method,
		headers: { ...req.headers, host: target.host },
	}, (proxyRes) => {
		res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers)
		proxyRes.pipe(res)
	})
	proxyReq.on("error", (e) => {
		res.writeHead(502, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
		res.end(JSON.stringify({ error: "Control server unreachable: " + e.message }))
	})
	req.pipe(proxyReq)
	return true
}
