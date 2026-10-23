import createClient from 'openapi-fetch';
import type { paths } from '@/types/openapi.gen';
import type { ApiError, ErrorCode } from '@/types/api';
import { getToken, setToken } from './token';

/**
 * HTTP client ที่ type มาจาก openapi.yaml โดยตรง (openapi-fetch)
 * เช่น api.GET('/issues/{issueKey}', { params: { path: { issueKey } } })
 * → TS รู้เองว่า path นี้มีจริง, params ต้องมีอะไร และ data เป็น Issue
 *
 * ค่า default ชี้ไปที่ mock API (:4010) — Phase 2 ตอนมี gateway จริงให้ตั้ง
 * VITE_API_BASE_URL=http://localhost:8080/api/v1
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4010/api/v1';

export const api = createClient<paths>({ baseUrl: API_BASE_URL });

// ใส่ Bearer token ให้ทุก request อัตโนมัติ
api.use({
  onRequest({ request }) {
    const token = getToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
});

/** error ที่ hook ทุกตัวโยนออกมา — มี status + code ตามที่ตกลงใน spec */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | 'NETWORK_ERROR',
    message: string,
  ) {
    super(message);
  }
}

/**
 * แกะผลจาก openapi-fetch: สำเร็จ → คืน data, ไม่สำเร็จ → throw ApiRequestError
 * react-query ต้องการให้ queryFn "throw เมื่อ error" จึงต้องมีตัวช่วยนี้
 */
export async function unwrap<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  let result: Awaited<typeof request>;
  try {
    result = await request;
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', `ติดต่อ API ไม่ได้ (${API_BASE_URL})`);
  }
  const { data, error, response } = result;
  if (response.ok) return data as T;

  // token หมดอายุ / ไม่ถูกต้อง → ล้าง token แล้ว RequireAuth จะพาไปหน้า login เอง
  if (response.status === 401) setToken(null);
  const body = error as Partial<ApiError> | undefined;
  throw new ApiRequestError(response.status, body?.error?.code ?? 'INTERNAL', body?.error?.message ?? response.statusText);
}

/** ข้อความที่อ่านรู้เรื่องจาก error อะไรก็ได้ */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
