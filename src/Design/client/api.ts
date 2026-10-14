export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = { method, headers: {}, signal: AbortSignal.timeout(15000) };
  if (body) {
    (opts.headers as Record<string, string>)["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(path, opts);
  let data: any;
  try {
    data = await r.json();
  } catch {
    throw new Error(r.ok ? "The design service returned an invalid response." : `Design request failed (${r.status}).`);
  }
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data as T;
}
