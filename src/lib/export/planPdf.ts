import { jsPDF } from 'jspdf';
import type { FloorPlan } from '../../types/floorPlan';
import { renderPlanExportImage } from './renderPlanImage';

function safeFilename(name: string): string {
  return name.replace(/[^\w\-]+/g, '-').replace(/-+/g, '-').slice(0, 80) || 'floor-plan';
}

export async function downloadPlanPdf(plan: FloorPlan, projectName: string): Promise<void> {
  const dataUrl = await renderPlanExportImage(plan);
  if (!dataUrl) {
    throw new Error('Add walls or furniture before exporting a PDF.');
  }

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const headerH = 50;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(projectName, margin, 32);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  let metaY = 48;
  if (plan.scale) {
    pdf.text(`Scale: ${plan.scale.pixelsPerUnit.toFixed(1)} px / ${plan.unit}`, margin, metaY);
    metaY += 14;
  }
  pdf.text(`Exported ${new Date().toLocaleString()}`, margin, metaY);

  const imgW = pageW - margin * 2;
  const imgH = pageH - margin - headerH;
  pdf.addImage(dataUrl, 'PNG', margin, headerH, imgW, imgH);

  pdf.save(`${safeFilename(projectName)}-floor-plan.pdf`);
}
