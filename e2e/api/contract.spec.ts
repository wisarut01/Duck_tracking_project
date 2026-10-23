/**
 * Offline self-checks of the contract itself (no server needed):
 * every component schema compiles, nullable handling works, and examples embedded
 * in openapi.yaml are valid against their own schemas.
 */
import { test, expect } from '../lib/fixtures';
import { openapi, schemaNames, validate, validator } from '../lib/schema';

test.describe('contract (offline)', () => {
  test('TC-CONTRACT-001 every component schema compiles with ajv', { tag: '@P0' }, () => {
    for (const name of schemaNames()) expect(() => validator(name), name).not.toThrow();
  });

  test('TC-CONTRACT-002 OAS 3.0 nullable is honoured', { tag: '@P0' }, () => {
    const user = { id: '7f1c2a9e-0000-4000-8000-000000000001', email: 'duck@example.com', displayName: 'Duck' };
    expect({ ...user, avatarUrl: null }).toMatchSchema('User');
    expect({ ...user, avatarUrl: 42 }).not.toMatchSchema('User');
    const summary = { id: user.id, key: 'TB-1', title: 't', type: 'TASK', status: 'TODO', priority: 'LOW' };
    expect({ ...summary, assignee: null }).toMatchSchema('IssueSummary');
    expect({ ...summary, assignee: user }).toMatchSchema('IssueSummary');
    expect({ ...summary, assignee: { id: 'nope' } }).not.toMatchSchema('IssueSummary');
    expect({ ...summary, status: 'BLOCKED' }).not.toMatchSchema('IssueSummary');
  });

  test('TC-CONTRACT-003 response examples in openapi.yaml match their schemas', { tag: '@P1' }, () => {
    const doc = openapi();
    const problems: string[] = [];
    const resolveName = (s: any): string | undefined => {
      if (s?.$ref) return s.$ref.split('/').pop() + '';
      if (s?.type === 'array' && s.items?.$ref) return s.items.$ref.split('/').pop() + '[]';
    };
    const check = (where: string, media: any) => {
      const name = resolveName(media?.schema);
      if (!name || media.example === undefined) return;
      const r = validate(name, media.example);
      if (!r.ok) problems.push(`${where} (${name}):\n${r.errors}`);
    };
    for (const [n, r] of Object.entries<any>(doc.components.responses ?? {})) check(`responses.${n}`, r.content?.['application/json']);
    for (const [p, item] of Object.entries<any>(doc.paths)) {
      for (const [m, op] of Object.entries<any>(item)) {
        for (const [code, resp] of Object.entries<any>(op?.responses ?? {})) {
          check(`${m.toUpperCase()} ${p} ${code}`, resp?.content?.['application/json']);
        }
      }
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('TC-CONTRACT-004 every operation declares its 400 / 401 / 404 responses', { tag: '@P1' }, () => {
    const doc = openapi();
    const problems: string[] = [];
    for (const [p, item] of Object.entries<any>(doc.paths)) {
      const pathParams = /\{\w+\}/.test(p);
      for (const [m, op] of Object.entries<any>(item)) {
        if (!op?.responses) continue; // `parameters` on the path item
        const codes = Object.keys(op.responses);
        const params = [...(item.parameters ?? []), ...(op.parameters ?? [])];
        const secured = (op.security ?? doc.security ?? []).length > 0;
        const need = [
          ...(secured ? ['401'] : []),
          ...(pathParams || params.length > 0 || op.requestBody ? ['400'] : []),
          ...(pathParams ? ['404'] : []),
        ];
        for (const code of need) if (!codes.includes(code)) problems.push(`${m.toUpperCase()} ${p} is missing ${code}`);
      }
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
});
