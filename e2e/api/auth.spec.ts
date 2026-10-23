import { test, expect, expectResponse, expectError, uniqueEmail } from '../lib/fixtures';

test.describe('auth', () => {
  test('TC-AUTH-001 register new user returns 201 + AuthResponse', { tag: '@P0' }, async ({ anon }) => {
    const email = uniqueEmail();
    const body = await expectResponse<any>(
      await anon.post('/auth/register', { email, password: 'password123', displayName: 'QA Reg' }),
      201,
      'AuthResponse',
    );
    expect(body.accessToken.length).toBeGreaterThan(0);
    expect(body.user.email).toBe(email);
    expect(body.user.displayName).toBe('QA Reg');
  });

  test('TC-AUTH-002 register duplicate email returns 409 ALREADY_EXISTS', { tag: '@P1' }, async ({ anon }) => {
    const email = uniqueEmail();
    const payload = { email, password: 'password123', displayName: 'QA Dup' };
    await expectResponse(await anon.post('/auth/register', payload), 201);
    await expectError(await anon.post('/auth/register', payload), 409, 'ALREADY_EXISTS');
  });

  test('TC-AUTH-003 register with short password returns 400 VALIDATION_FAILED', { tag: '@P1' }, async ({ anon }) => {
    await expectError(
      await anon.post('/auth/register', { email: uniqueEmail(), password: 'short', displayName: 'QA' }),
      400,
      'VALIDATION_FAILED',
    );
  });

  test('TC-AUTH-004 login with valid credentials returns 200 + token', { tag: '@P0' }, async ({ anon, session }) => {
    const body = await expectResponse<any>(
      await anon.post('/auth/login', { email: session.email, password: session.password }),
      200,
      'AuthResponse',
    );
    expect(body.accessToken.length).toBeGreaterThan(0);
    expect(body.user.email).toBe(session.email);
  });

  test('TC-AUTH-005 login with wrong password returns 401 UNAUTHENTICATED', { tag: '@P0' }, async ({ anon, session }) => {
    await expectError(
      await anon.post('/auth/login', { email: session.email, password: 'wrong-password-xyz' }),
      401,
      'UNAUTHENTICATED',
    );
  });

  test('TC-AUTH-006 GET /auth/me with token returns current user', { tag: '@P0' }, async ({ api, session }) => {
    const me = await expectResponse<any>(await api.get('/auth/me'), 200, 'User');
    expect(me.id).toBe(session.user.id);
    expect(me.email).toBe(session.email);
  });

  // 401 without token on every kind of protected endpoint
  const protectedCalls: Array<[string, string, unknown?]> = [
    ['GET', '/auth/me'],
    ['GET', '/users'],
    ['GET', '/projects'],
    ['POST', '/projects', { key: 'NOAUTH', name: 'x' }],
    ['GET', '/projects/TB/issues'],
    ['GET', '/issues/TB-1'],
    ['POST', '/issues/TB-1/move', { status: 'DONE' }],
    ['GET', '/spaces'],
    ['GET', '/search?q=x'],
  ];
  for (const [method, path, data] of protectedCalls) {
    test(`TC-AUTH-007 ${method} ${path} without token returns 401`, { tag: '@P0' }, async ({ anon }) => {
      const res = method === 'GET' ? await anon.get(path) : await anon.post(path, data);
      await expectError(res, 401, 'UNAUTHENTICATED');
    });
  }

  test('TC-AUTH-008 invalid / malformed bearer token returns 401', { tag: '@P0' }, async ({ anon }) => {
    await expectError(await anon.withToken('not.a.valid.jwt').get('/auth/me'), 401, 'UNAUTHENTICATED');
  });

  test('TC-AUTH-009 GET /users returns User[] including me', { tag: '@P1' }, async ({ api, session }) => {
    const users = await expectResponse<any[]>(await api.get('/users'), 200, 'User[]');
    expect(users.map((u) => u.id)).toContain(session.user.id);
  });
});
