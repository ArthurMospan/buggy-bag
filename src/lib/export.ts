import JSZip from 'jszip';
import type { Bug, Project } from './types';
import { format } from 'date-fns';

export async function generateProjectZip(project: Project, bugs: Bug[]): Promise<Blob> {
  const zip = new JSZip();
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const folderName = `buggy-bag-${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${dateStr}`;
  const root = zip.folder(folderName);
  
  if (!root) throw new Error('Failed to create ZIP root folder');

  // Generate summary.md
  const statusStats = bugs.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let summaryMd = `# Проєкт: ${project.name}\n`;
  summaryMd += `Дата експорту: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n`;
  if (project.connected_domain) {
    summaryMd += `Домен: ${project.connected_domain}\n`;
  }
  summaryMd += `\n## Статистика\n`;
  summaryMd += `- Всього багів: ${bugs.length}\n`;
  Object.entries(statusStats).forEach(([status, count]) => {
    summaryMd += `- ${status}: ${count}\n`;
  });

  summaryMd += `\n## Список багів\n\n`;
  bugs.forEach((b, i) => {
    summaryMd += `### ${i + 1}. [${b.status}] ${b.description?.slice(0, 50) || 'Без опису'}...\n`;
    summaryMd += `- ID: ${b.id}\n`;
    summaryMd += `- Критичність: ${b.severity}\n`;
    if (b.tech_context?.route) summaryMd += `- Маршрут: ${b.tech_context.route}\n`;
    summaryMd += `\n`;
  });

  root.file('summary.md', summaryMd);

  const bugsFolder = root.folder('bugs');
  
  if (bugsFolder) {
    await Promise.all(bugs.map(async (bug, index) => {
      const bugFolder = bugsFolder.folder(`${index + 1}-${bug.id}`);
      if (!bugFolder) return;

      bugFolder.file('details.json', JSON.stringify(bug, null, 2));
      
      const promptText = `Bug ID: ${bug.id}\nStatus: ${bug.status}\nSeverity: ${bug.severity}\nDescription: ${bug.description}\nRoute: ${bug.tech_context?.route}\n\nTechnical Details:\n${JSON.stringify(bug.tech_context, null, 2)}`;
      bugFolder.file('prompt.md', promptText);

      if (bug.image_url) {
        try {
          const res = await fetch(bug.image_url);
          const blob = await res.blob();
          bugFolder.file('screenshot.png', blob);
        } catch (e) {
          console.warn(`Failed to fetch image for bug ${bug.id}`, e);
        }
      }
    }));
  }

  return zip.generateAsync({ type: 'blob' });
}
