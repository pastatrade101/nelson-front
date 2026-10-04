/**
 * The traveller's downloadable trip brief, as a branded A4 PDF.
 *
 * Built in the browser with jsPDF (loaded on click, so it never weighs on the
 * planner page). Pure layout over plain data: the planner passes its brief
 * rows, and the logo arrives as a data URL, which keeps this testable outside
 * a browser. Standard PDF fonts only cover Latin-1, so text is normalised
 * first rather than printing boxes for curly quotes or arrows.
 */

export type TripBrief = {
  reference: string;
  preparedFor: string;
  rows: string[][];
  startingPoints: string[];
  details: string[][];
  specialRequests: string;
  notes: string;
  contact: { email: string; phone: string; website: string };
  /** JPEG (or PNG) data URL of the logo, already composited on the header colour. */
  logo?: string | null;
  logoRatio?: number;
};

const C = {
  charcoal: [28, 26, 22],
  bark: [74, 55, 40],
  gold: [197, 162, 101],
  linen: [232, 224, 210],
  ivory: [250, 250, 247],
  muted: [118, 110, 100],
  white: [255, 255, 255]
} as const;

/** Latin-1 only: the standard PDF fonts have no glyphs beyond it. */
export const pdfText = (value: unknown): string =>
  String(value ?? '')
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/→/g, 'to')
    .replace(/…/g, '...')
    .replace(/[•●]/g, '·')
    .replace(/ /g, ' ')
    .replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, '')
    .trim();

export async function buildTripBriefPdf(brief: TripBrief) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 18, FOOT = 22;
    let y = 0;

  const fill = (c: readonly number[]) => doc.setFillColor(c[0], c[1], c[2]);
  const ink = (c: readonly number[]) => doc.setTextColor(c[0], c[1], c[2]);
  const stroke = (c: readonly number[]) => doc.setDrawColor(c[0], c[1], c[2]);
  const font = (face: 'times' | 'helvetica', style: 'normal' | 'bold' | 'italic', size: number) => { doc.setFont(face, style); doc.setFontSize(size); };
  const lines = (text: string, width: number) => doc.splitTextToSize(pdfText(text), width) as string[];
  const lh = (size: number) => size * 0.3528 * 1.38;
  const spacedRight = (text: string, x: number, at: number, space: number) => {
    doc.setCharSpace(space);
    const width = doc.getTextWidth(text) + space * Math.max(0, text.length - 1);
    doc.text(text, x - width, at);
    doc.setCharSpace(0);
  };

  const eyebrow = (label: string) => {
    font('helvetica', 'bold', 7.5); ink(C.gold); doc.setCharSpace(0.9);
    doc.text(pdfText(label).toUpperCase(), M, y); doc.setCharSpace(0);
    y += 2.5;
    stroke(C.gold); doc.setLineWidth(0.35); doc.line(M, y, M + 14, y);
    y += 5;
  };

  const footer = () => {
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      stroke(C.linen); doc.setLineWidth(0.3); doc.line(M, H - FOOT + 4, W - M, H - FOOT + 4);
      font('helvetica', 'normal', 7.8); ink(C.muted);
      doc.text(pdfText('A planning request, not a confirmed booking. No payment has been taken.'), M, H - FOOT + 9.5);
      const contact = [brief.contact.email, brief.contact.phone, brief.contact.website].filter(Boolean).map(pdfText).join('   ·   ');
      font('helvetica', 'bold', 7.8); ink(C.bark);
      doc.text(contact, M, H - FOOT + 14);
      font('helvetica', 'normal', 7.8); ink(C.muted);
      doc.text(`${pdfText(brief.reference)}  ·  ${p} / ${pages}`, W - M, H - FOOT + 14, { align: 'right' });
    }
  };

  const continuationHeader = () => {
    fill(C.charcoal); doc.rect(0, 0, W, 14, 'F');
    font('helvetica', 'bold', 7.5); ink(C.gold); doc.setCharSpace(0.9);
    doc.text('EMNEL ADVENTURES  ·  YOUR TRIP BRIEF', M, 9); doc.setCharSpace(0);
    font('helvetica', 'normal', 8); ink(C.linen);
    doc.text(pdfText(brief.reference), W - M, 9, { align: 'right' });
    y = 26;
  };

  /** Starts a new page when the next block will not fit above the footer. */
  const ensure = (height: number) => {
    if (y + height <= H - FOOT - 2) return;
    doc.addPage(); fill(C.ivory); doc.rect(0, 0, W, H, 'F'); continuationHeader();
  };

  // ── Page background + header band ──────────────────────────────────────
  fill(C.ivory); doc.rect(0, 0, W, H, 'F');
  fill(C.charcoal); doc.rect(0, 0, W, 46, 'F');
  fill(C.gold); doc.rect(0, 46, W, 1.1, 'F');
  if (brief.logo) {
    const lw = 52, lhgt = lw / (brief.logoRatio || 2.54);
    try { doc.addImage(brief.logo, M - 2, 23 - lhgt / 2, lw, lhgt); } catch { /* fall back to the wordmark below */ }
  } else {
    font('times', 'normal', 24); ink(C.ivory); doc.setCharSpace(2.4); doc.text('EMNEL', M, 23); doc.setCharSpace(0);
    font('helvetica', 'bold', 7.5); ink(C.gold); doc.setCharSpace(2.2); doc.text('ADVENTURES', M + 1, 29); doc.setCharSpace(0);
  }
  font('helvetica', 'bold', 7.5); ink(C.gold);
  spacedRight('YOUR TRIP BRIEF', W - M, 16, 1.1);
  font('times', 'normal', 21); ink(C.white);
  doc.text(pdfText(brief.reference), W - M, 26, { align: 'right' });
  font('helvetica', 'normal', 8.5); ink(C.linen);
  const prepared = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Prepared ${prepared}`, W - M, 32.5, { align: 'right' });

  // ── Title ──────────────────────────────────────────────────────────────
  y = 59;
  font('times', 'normal', 24); ink(C.charcoal);
  doc.text('Your safari, taking shape.', M, y);
  y += 7;
  font('helvetica', 'normal', 9.5); ink(C.muted);
  font('helvetica', 'normal', 9.5);
  const intro = lines(`Prepared for ${brief.preparedFor}. This is the starting point your local Emnel specialist will shape into a route, stays and a personal quote.`, W - M * 2);
  doc.text(intro, M, y); y += intro.length * lh(9.5) + 6;

  // ── Two-column label / value grid ──────────────────────────────────────
  const grid = (pairs: string[][], cols = 3) => {
    const gap = 7;
    const cw = (W - M * 2 - gap * (cols - 1)) / cols;
    for (let i = 0; i < pairs.length; i += cols) {
      const cells = pairs.slice(i, i + cols).map(([label, value]) => {
        font('helvetica', 'normal', 10);
        return { label: pdfText(label).toUpperCase(), value: lines(value || '-', cw) };
      });
      const height = 4.6 + Math.max(...cells.map((c) => c.value.length)) * lh(10) + 2.6;
      ensure(height + 2);
      cells.forEach((cell, k) => {
        const x = M + k * (cw + gap);
        font('helvetica', 'bold', 6.8); ink(C.muted); doc.setCharSpace(0.55);
        doc.text(cell.label, x, y); doc.setCharSpace(0);
        font('helvetica', 'normal', 10); ink(C.charcoal);
        doc.text(cell.value, x, y + 4.6);
      });
      y += height;
      stroke(C.linen); doc.setLineWidth(0.25); doc.line(M, y - 1.2, W - M, y - 1.2);
      y += 2;
    }
  };

  /** A linen panel holding wrapped text, e.g. notes. */
  const panel = (label: string, text: string) => {
    font('helvetica', 'normal', 10); const body = lines(text, W - M * 2 - 12);
    const height = 8 + body.length * lh(10) + 3;
    ensure(height + 3);
    fill(C.linen); doc.roundedRect(M, y, W - M * 2, height, 1.5, 1.5, 'F');
    fill(C.gold); doc.rect(M, y, 1.1, height, 'F');
    font('helvetica', 'bold', 7); ink(C.bark); doc.setCharSpace(0.6);
    doc.text(pdfText(label).toUpperCase(), M + 6, y + 6.5); doc.setCharSpace(0);
    font('helvetica', 'normal', 10); ink(C.charcoal);
    doc.text(body, M + 6, y + 11);
    y += height + 3;
  };

  ensure(30); eyebrow('Your journey');
  grid(brief.rows);

  if (brief.startingPoints.length) {
    y += 1;
    panel('Your starting point', brief.startingPoints.map((s) => `· ${s}`).join('\n'));
  }

  y += 2; ensure(26); eyebrow('Your details');
  grid(brief.details);

  const notes = [['Special requests', brief.specialRequests], ['Your notes', brief.notes]].filter(([, v]) => pdfText(v));
  if (notes.length) {
    y += 1;
    for (const [label, value] of notes) panel(label, value);
  }

  // ── What happens next ──────────────────────────────────────────────────
  // Eyebrow (7.5mm) + three short steps (~24mm).
  y += 2; ensure(31.5); eyebrow('What happens next');
  const steps = [
    ['A specialist reads your brief', 'A local Emnel planner reviews every detail you shared.'],
    ['Route, stays and a quote', 'We come back with route ideas, lodge options and a personal price.'],
    ['Shaped together', 'We refine it with you. Nothing is booked or paid until you confirm.']
  ];
  const sw = (W - M * 2 - 12) / 3;
  const stepTop = y;
  let tallest = 0;
  steps.forEach(([title, body], k) => {
    const x = M + k * (sw + 6);
    font('times', 'normal', 20); ink(C.gold); doc.text(String(k + 1).padStart(2, '0'), x, stepTop + 5);
    font('helvetica', 'bold', 9.5); ink(C.charcoal);
    const t = lines(title, sw); doc.text(t, x, stepTop + 11);
    font('helvetica', 'normal', 8.8); ink(C.muted);
    const b = lines(body, sw); doc.text(b, x, stepTop + 11 + t.length * lh(9.5) + 0.8);
    tallest = Math.max(tallest, 11 + t.length * lh(9.5) + 0.8 + b.length * lh(8.8));
  });
  y = stepTop + tallest + 4;

  footer();
  return doc;
}

export async function downloadTripBriefPdf(brief: TripBrief, filename: string) {
  const doc = await buildTripBriefPdf(brief);
  doc.save(filename);
}

/** The site logo drawn onto the header colour, as a JPEG data URL (null if it cannot load). */
export async function loadBriefLogo(src = '/emnel.avif'): Promise<{ dataUrl: string; ratio: number } | null> {
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('logo')); img.src = src; });
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth * scale; canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx || !canvas.width) return null;
    ctx.fillStyle = `rgb(${C.charcoal.join(',')})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // JPEG: the header behind the logo is solid, and PNG made a 1.5 MB brief.
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.9), ratio: img.naturalWidth / img.naturalHeight };
  } catch {
    return null;
  }
}
