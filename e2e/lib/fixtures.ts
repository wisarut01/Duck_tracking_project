import { test as base, expect as baseExpect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import { validate } from './schema';

// ---------- custom matchers ----------
export const expect = baseExpect.extend({
  /** expect(body).toMatchSchema('Issue') or 'Issue[]' for arrays */
  toMatchSchema(received: unknown, schemaName: string) {
    const { ok, errors } = validate(schemaName, received);
    return {
      pass: ok,
      name: 'toMatchSchema',
      message: () =>
        ok
          ? `expected body NOT to match schema ${schemaName}`
          : `body does not match openapi schema ${schemaName}:\n${errors}\nbody: ${JSON.stringify(received, null, 2).slice(0, 2000)}`,
    };
  },
});

// ---------- helpers ----------
const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
/** Unique key matching ^[A-Z][A-Z0-9]{1,9}$ (project / space keys). */
export function uniqueKey(prefix = 'Q'): string {
  const bytes = randomBytes(10);
  let s = prefix.toUpperCase().slice(0, 1);
  for (let i = 0; s.length < 10; i++) s += ALNUM[bytes[i] % ALNUM.length];
  return s;
}
export function uniqueToken(): string {
  return 'qa' + randomBytes(6).toString('hex');
}
export function uniqueEmail(): string {
  return `qa+${randomUUID()}@example.com`;
}
/** "TB-12" -> 12 */
export function issueNumber(key: string): number {
  const m = /^[A-Z][A-Z0-9]{1,9}-(\d+)$/.exec(key);
  if (!m) throw new Error(`not an issue key: ${key}`);
  return Number(m[1]);
}

/** Thin wrapper: strips leading "/" so baseURL's /api/v1 prefix is kept, adds bearer token. */
export class ApiClient {
  constructor(private readonly req: APIRequestContext, public token?: string) {}
  withToken(token?: string) {
    return new ApiClient(this.req, token);
  }
  private opts(data?: unknown, headers: Record<string, string> = {}) {
    const h: Record<string, string> = { ...headers };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return data === undefined ? { headers: h } : { headers: h, data };
  }
  private p(path: string) {
    return path.replace(/^\/+/, '');
  }
  get(path: string, params?: Record<string, string | number>, headers?: Record<string, string>) {
    return this.req.get(this.p(path), { ...this.opts(undefined, headers), params });
  }
  post(path: string, data?: unknown, headers?: Record<string, string>) {
    return this.req.post(this.p(path), this.opts(data ?? {}, headers));
  }
  patch(path: string, data?: unknown, headers?: Record<string, string>) {
    return this.req.patch(this.p(path), this.opts(data ?? {}, headers));
  }
  /** No endpoint uses PUT — only for checking that unknown methods are rejected. */
  put(path: string, data?: unknown, headers?: Record<string, string>) {
    return this.req.put(this.p(path), this.opts(data ?? {}, headers));
  }
  delete(path: string, headers?: Record<string, string>) {
    return this.req.delete(this.p(path), this.opts(undefined, headers));
  }
}

async function bodyOf(res: APIResponse): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Assert status (+ JSON content-type + schema) and return parsed body.
 * Failure messages include method/url/body so mock-vs-spec mismatches are obvious.
 */
export async function expectResponse<T = any>(
  res: APIResponse,
  status: number,
  schemaName?: string,
): Promise<T> {
  const body = await bodyOf(res);
  baseExpect(res.status(), `${res.url()} -> ${res.status()} body=${JSON.stringify(body)?.slice(0, 1000)}`).toBe(status);
  if (status === 204) return body as T;
  baseExpect(res.headers()['content-type'] ?? '', `content-type of ${res.url()}`).toContain('application/json');
  if (schemaName) expect(body).toMatchSchema(schemaName);
  return body as T;
}

/** Assert the shared error format { error: { code, message } } with given HTTP status + code. */
export async function expectError(res: APIResponse, status: number, code: string) {
  const body = await expectResponse<any>(res, status, 'Error');
  baseExpect(body.error.code, `error.code for ${res.url()}`).toBe(code);
  baseExpect(typeof body.error.message === 'string' && body.error.message.length > 0, 'error.message non-empty').toBe(true);
  return body;
}

// ---------- data builders (each test creates its own data) ----------
export async function createProject(api: ApiClient, over: Record<string, unknown> = {}) {
  const key = uniqueKey('P');
  const res = await api.post('/projects', { key, name: `QA project ${key}`, description: null, ...over });
  return expectResponse<any>(res, 201, 'Project');
}
export async function createIssue(api: ApiClient, projectKey: string, over: Record<string, unknown> = {}) {
  const res = await api.post(`/projects/${projectKey}/issues`, {
    title: `QA issue ${uniqueToken()}`,
    type: 'TASK',
    priority: 'MEDIUM',
    labels: ['qa'],
    ...over,
  });
  return expectResponse<any>(res, 201, 'Issue');
}
export async function createSpace(api: ApiClient, over: Record<string, unknown> = {}) {
  const key = uniqueKey('S');
  const res = await api.post('/spaces', { key, name: `QA space ${key}`, ...over });
  return expectResponse<any>(res, 201, 'Space');
}
export async function createPage(api: ApiClient, spaceKey: string, over: Record<string, unknown> = {}) {
  const res = await api.post(`/spaces/${spaceKey}/pages`, {
    title: `QA page ${uniqueToken()}`,
    parentId: null,
    contentMd: '# QA',
    ...over,
  });
  return expectResponse<any>(res, 201, 'Page');
}

export interface Session {
  token: string;
  user: any;
  email: string;
  password: string;
}

/** Register a fresh user (falls back to the seed user from env if register is unavailable). */
export async function newSession(anon: ApiClient): Promise<Session> {
  const email = uniqueEmail();
  const password = 'password123';
  const reg = await anon.post('/auth/register', { email, password, displayName: 'QA Bot' });
  if (reg.status() === 201) {
    const body = await reg.json();
    return { token: body.accessToken, user: body.user, email, password };
  }
  const seedEmail = process.env.TEST_USER_EMAIL ?? 'duck@example.com';
  const seedPassword = process.env.TEST_USER_PASSWORD ?? 'password123';
  const login = await anon.post('/auth/login', { email: seedEmail, password: seedPassword });
  const body = await expectResponse<any>(login, 200, 'AuthResponse');
  return { token: body.accessToken, user: body.user, email: seedEmail, password: seedPassword };
}

type Fixtures = {
  anon: ApiClient;
  session: Session;
  api: ApiClient;
  project: any;
  space: any;
};

export const test = base.extend<Fixtures>({
  anon: async ({ request }, use) => use(new ApiClient(request)),
  session: async ({ anon }, use) => use(await newSession(anon)),
  api: async ({ anon, session }, use) => use(anon.withToken(session.token)),
  project: async ({ api }: { api: ApiClient }, use: (p: any) => Promise<void>) => {
    const p = await createProject(api);
    await use(p);
  },
  space: async ({ api }: { api: ApiClient }, use: (s: any) => Promise<void>) => {
    const s = await createSpace(api);
    await use(s);
  },
});
