import metrics from '@/content/model-metrics.json';
import { json } from '@/lib/http';

export function GET() {
  return json(metrics);
}
