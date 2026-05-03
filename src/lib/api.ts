export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new ApiError(`Request failed: ${url}`, res.status);
  }
  return res.json();
}

const SYMBOL_RE = /^[A-Z0-9^.=\-]{1,20}$/;

export function validateSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (!SYMBOL_RE.test(upper)) {
    throw new ApiError("Invalid stock symbol", 400);
  }
  return upper;
}
