import { readFileSync } from 'node:fs';
import path from 'node:path';

export type OpenApiDocument = {
  openapi: string;
  info: { title: string; version: string; description: string };
  paths: Record<string, Record<string, { summary?: string; description?: string }>>;
};

export function loadOpenApi(): OpenApiDocument {
  const candidates = [
    path.resolve(process.cwd(), 'openapi/openapi.json'),
    path.resolve(process.cwd(), '../../openapi/openapi.json'),
  ];
  for (const candidate of candidates) {
    try {
      return JSON.parse(readFileSync(candidate, 'utf8')) as OpenApiDocument;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  throw new Error('OpenAPI document not found');
}
