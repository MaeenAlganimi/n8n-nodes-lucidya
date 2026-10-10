import { json } from '@/lib/http';
import { loadOpenApi } from '@/lib/openapi';

export function GET() {
  return json(loadOpenApi());
}
