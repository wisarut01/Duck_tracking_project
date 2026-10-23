// Load api/openapi.yaml for the request/response validator.

import fs from 'node:fs';
import YAML from 'yaml';

export function loadSpec(filePath) {
  return YAML.parse(fs.readFileSync(filePath, 'utf8'));
}
