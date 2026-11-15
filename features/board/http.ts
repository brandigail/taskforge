/** Tiny JSON fetch helper for the board. Errors carry the server's own message so they can be shown as is. */
export async function call<T>(path: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "Something went wrong";
    throw new Error(message);
  }
  return data as T;
}
