import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'node_modules', 'buggy-bag-widget', 'dist', 'buggy-bag-standalone.global.js');
    const content = fs.readFileSync(filePath, 'utf8');
    return new Response(content, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (err) {
    return new Response('Standalone widget file not found', { status: 404 });
  }
}
