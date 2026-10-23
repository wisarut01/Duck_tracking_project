/**
 * Contract validation against api/openapi.yaml (OpenAPI 3.0.3).
 *
 * OAS 3.0 is not plain JSON Schema: `nullable: true` has no meaning to Ajv, so we
 * rewrite the component schemas first:
 *   { type: T, nullable: true }  ->  { type: [T, 'null'] }   (+ null added to enum)
 * "User or null" is written as anyOf [ $ref User, { type: object, nullable: true, enum: [null] } ],
 * so it needs nothing extra here.
 * `$ref: '#/components/schemas/X'` keeps working because the whole components
 * tree is registered as one schema document with $id "openapi".
 */
import fs from 'node:fs';
import path from 'node:path';
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

export const OPENAPI_PATH =
  process.env.OPENAPI_PATH ?? path.resolve(__dirname, '..', '..', 'api', 'openapi.yaml');

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export function convertNullable(node: Json): Json {
  if (Array.isArray(node)) return node.map(convertNullable);
  if (node === null || typeof node !== 'object') return node;

  const out: { [k: string]: Json } = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === 'nullable' || k === 'example') continue; // `example` is OAS-only noise
    out[k] = convertNullable(v);
  }
  if (node.nullable !== true || typeof out.type !== 'string') return out;

  out.type = [out.type, 'null'];
  if (Array.isArray(out.enum) && !out.enum.includes(null)) out.enum = [...out.enum, null];
  return out;
}

let doc: any;
export function openapi(): any {
  if (!doc) doc = YAML.parse(fs.readFileSync(OPENAPI_PATH, 'utf8'));
  return doc;
}

let ajv: Ajv | undefined;
function getAjv(): Ajv {
  if (ajv) return ajv;
  ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schemas = openapi()?.components?.schemas;
  if (!schemas) throw new Error(`No components.schemas in ${OPENAPI_PATH}`);
  ajv.addSchema({ $id: 'openapi', components: { schemas: convertNullable(schemas) } });
  return ajv;
}

export function schemaNames(): string[] {
  return Object.keys(openapi().components.schemas);
}

const cache = new Map<string, ValidateFunction>();
export function validator(name: string): ValidateFunction {
  let fn = cache.get(name);
  if (!fn) {
    if (!openapi().components.schemas[name]) throw new Error(`Unknown schema "${name}" in openapi.yaml`);
    fn = getAjv().getSchema(`openapi#/components/schemas/${name}`);
    if (!fn) throw new Error(`Ajv could not compile schema "${name}"`);
    cache.set(name, fn);
  }
  return fn;
}

export function formatErrors(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? [])
    .map((e) => `  - ${e.instancePath || '(root)'} ${e.message}${e.params ? ' ' + JSON.stringify(e.params) : ''}`)
    .join('\n');
}

/** Validate `data` against a component schema, or an array of it with `name[]`. */
export function validate(name: string, data: unknown): { ok: boolean; errors: string } {
  const isArray = name.endsWith('[]');
  const fn = validator(isArray ? name.slice(0, -2) : name);
  if (isArray) {
    if (!Array.isArray(data)) return { ok: false, errors: '  - (root) must be array' };
    const errs: string[] = [];
    data.forEach((item, i) => {
      if (!fn(item)) errs.push(formatErrors(fn.errors).replace(/^ {2}- /gm, `  - [${i}]`));
    });
    return { ok: errs.length === 0, errors: errs.join('\n') };
  }
  const ok = fn(data) as boolean;
  return { ok, errors: ok ? '' : formatErrors(fn.errors) };
}
