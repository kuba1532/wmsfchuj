import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ─────────── Typy ─────────── */

interface DocumentPDFData {
  type: 'PZ' | 'MM' | 'RW';
  number: string;
  date: string;
  header: { label: string; value: string }[];
  items: { product: string; sku?: string; quantity: number }[];
  status: string;
}

const TYPE_TITLES: Record<string, string> = {
  PZ: 'Przyjecie zewnetrzne',
  MM: 'Przesuniecie miedzymagazynowe',
  RW: 'Wydanie',
};

const TYPE_FULL_NAMES: Record<string, string> = {
  PZ: 'Przyjecie Zewnetrzne nr',
  MM: 'Przesuniecie Miedzymagazynowe nr',
  RW: 'Wydanie nr',
};

/* ─────────── Helpery ─────────── */

const MARGIN = 14;
const BLUE: [number, number, number] = [21, 101, 192];
const GRAY_LINE: [number, number, number] = [180, 180, 180];
const LIGHT_BG: [number, number, number] = [245, 245, 245];
const SUMMARY_BG: [number, number, number] = [255, 243, 224];
const RED: [number, number, number] = [211, 47, 47];

function drawPageBorder(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...GRAY_LINE);
  doc.setLineWidth(0.5);
  doc.rect(8, 8, w - 16, h - 16);
}

function drawFooter(doc: jsPDF, text?: string) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);

    // Separator
    doc.setDrawColor(...GRAY_LINE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, h - 22, w - MARGIN, h - 22);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);

    // Left
    doc.text('Druk: WMS System', MARGIN, h - 16);

    // Center
    const centerText = text || 'Dokument wygenerowany automatycznie';
    doc.text(centerText, w / 2, h - 16, { align: 'center' });

    // Right
    doc.text(`Strona: ${i}/${pages}`, w - MARGIN, h - 16, { align: 'right' });
  }
}

function drawSignatures(
  doc: jsPDF,
  y: number,
  leftLabel: string,
  leftName: string,
  rightLabel: string,
  rightName: string,
) {
  const w = doc.internal.pageSize.getWidth();
  const leftX = MARGIN + 30;
  const rightX = w - MARGIN - 30;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);

  // Signature lines
  doc.setDrawColor(150);
  doc.setLineWidth(0.3);
  doc.line(leftX - 30, y, leftX + 30, y);
  doc.line(rightX - 30, y, rightX + 30, y);

  // Labels
  doc.text(leftLabel, leftX, y + 6, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(leftName, leftX, y + 12, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(rightLabel, rightX, y + 6, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(rightName, rightX, y + 12, { align: 'center' });
}

/* ─────────── Generator dokumentow PZ/MM/RW ─────────── */

export const generateDocumentPDF = (data: DocumentPDFData) => {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  drawPageBorder(doc);

  // ── Top left: date & place ──
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`Wystawiono dnia: ${data.date}`, MARGIN, 18);

  // ── Top right: document type & number ──
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`${TYPE_FULL_NAMES[data.type]} ${data.number}`, w - MARGIN, 18, { align: 'right' });

  // ── Company name / logo area ──
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('WMS System', MARGIN, 34);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('System Zarzadzania Magazynem', MARGIN, 41);

  // ── Horizontal separator ──
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 45, w - MARGIN, 45);

  // ── Left column: sender/source ──
  let y = 55;
  const leftColX = MARGIN;
  const rightColX = w / 2 + 10;

  // Build left/right sections based on document type
  if (data.type === 'PZ') {
    // Left: Magazyn (receiver)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Magazyn:', leftColX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    doc.text('Magazyn Glowny', leftColX, y + 6);
    doc.text('WMS System', leftColX, y + 12);

    // Right: Dostawca
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Dostawca:', rightColX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    const supplier = data.header.find((h) => h.label === 'Dostawca')?.value || '-';
    doc.text(supplier, rightColX, y + 6);
  } else if (data.type === 'MM') {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Z lokalizacji:', leftColX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    const fromLoc = data.header.find((h) => h.label === 'Z lokalizacji')?.value || '-';
    doc.text(fromLoc, leftColX, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Do lokalizacji:', rightColX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    const toLoc = data.header.find((h) => h.label === 'Do lokalizacji')?.value || '-';
    doc.text(toLoc, rightColX, y + 6);
  } else if (data.type === 'RW') {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Magazyn:', leftColX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    doc.text('Magazyn Glowny', leftColX, y + 6);
    doc.text('WMS System', leftColX, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Odbiorca:', rightColX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    const recipient = data.header.find((h) => h.label === 'Odbiorca')?.value || '-';
    doc.text(recipient, rightColX, y + 6);
  }

  // ── Status ──
  y += 24;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Status: ${data.status}`, w - MARGIN, y, { align: 'right' });

  // ── POZYCJE header ──
  y += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('POZYCJE', MARGIN, y);
  y += 4;

  // ── Items table ──
  const tableData = data.items.map((item, index) => [
    String(index + 1),
    item.product,
    item.sku || '-',
    'szt.',
    String(item.quantity),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['LP', 'Nazwa towaru', 'SKU', 'Jedn.', 'Ilosc']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: BLUE,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: LIGHT_BG,
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  // ── PODSUMOWANIE ──
  const tableEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let sumY = tableEndY + 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('PODSUMOWANIE', MARGIN, sumY);
  sumY += 4;

  const totalQty = data.items.reduce((sum, item) => sum + item.quantity, 0);

  autoTable(doc, {
    startY: sumY,
    head: [['', 'Ilosc']],
    body: [
      ['Liczba pozycji:', String(data.items.length)],
      ['Laczna ilosc:', String(totalQty)],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: BLUE,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 50 },
    },
    // Highlight last row (totals)
    didParseCell: (cellData) => {
      if (cellData.section === 'body' && cellData.row.index === 1) {
        cellData.cell.styles.fillColor = SUMMARY_BG;
        cellData.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: 130,
  });

  const sumEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ── Signatures ──
  const sigY = Math.max(sumEndY + 35, 220);
  const pageH = doc.internal.pageSize.getHeight();

  if (sigY < pageH - 40) {
    if (data.type === 'PZ') {
      drawSignatures(
        doc,
        sigY,
        'Przyjal',
        '......................',
        'Wydal (dostawca)',
        '......................',
      );
    } else if (data.type === 'MM') {
      drawSignatures(
        doc,
        sigY,
        'Wydal',
        '......................',
        'Przyjal',
        '......................',
      );
    } else {
      drawSignatures(
        doc,
        sigY,
        'Wydal',
        '......................',
        'Odebral',
        '......................',
      );
    }
  }

  drawFooter(doc);
  doc.save(`${data.type}_${data.number.replace(/\//g, '_')}.pdf`);
};

/* ─────────── Generator inwentaryzacji ─────────── */

export const generateInventoryPDF = (
  number: string,
  date: string,
  type: string,
  status: string,
  items: {
    locationCode: string;
    productName: string;
    sku: string;
    systemQuantity: number;
    actualQuantity: number;
    difference: number;
  }[],
) => {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  drawPageBorder(doc);

  // ── Top left: date ──
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`Wystawiono dnia: ${date}`, MARGIN, 18);

  // ── Top right: document number ──
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`Inwentaryzacja nr ${number}`, w - MARGIN, 18, { align: 'right' });

  // ── Company name ──
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('WMS System', MARGIN, 34);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('System Zarzadzania Magazynem', MARGIN, 41);

  // ── Separator ──
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 45, w - MARGIN, 45);

  // ── Details ──
  let y = 55;
  const leftColX = MARGIN;
  const rightColX = w / 2 + 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Typ inwentaryzacji:', leftColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  doc.text(type, leftColX + 45, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Status:', rightColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  doc.text(status, rightColX + 20, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Data:', leftColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  doc.text(date, leftColX + 45, y);

  const differences = items.filter((i) => i.difference !== 0).length;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Roznice:', rightColX, y);
  doc.setFont('helvetica', 'normal');
  if (differences > 0) {
    doc.setTextColor(...RED);
  } else {
    doc.setTextColor(0, 150, 0);
  }
  doc.text(
    differences > 0 ? `${differences} znalezionych` : 'Brak (stany zgodne)',
    rightColX + 20,
    y,
  );

  // ── POROWNANIE STANOW ──
  y += 16;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('POROWNANIE STANOW', MARGIN, y);
  y += 4;

  const tableData = items.map((item) => [
    item.locationCode,
    `${item.sku} - ${item.productName}`,
    String(item.systemQuantity),
    String(item.actualQuantity),
    item.difference > 0 ? `+${item.difference}` : String(item.difference),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Lokalizacja', 'Produkt', 'Stan syst.', 'Stan fakt.', 'Roznica']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: BLUE,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: LIGHT_BG,
    },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
    },
    didParseCell: (cellData) => {
      if (cellData.section === 'body' && cellData.column.index === 4) {
        const raw = String(cellData.cell.raw).replace('+', '');
        const val = Number(raw);
        if (val !== 0) {
          cellData.cell.styles.textColor = RED;
          cellData.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  // ── PODSUMOWANIE ──
  const tableEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let sumY = tableEndY + 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('PODSUMOWANIE', MARGIN, sumY);
  sumY += 4;

  autoTable(doc, {
    startY: sumY,
    head: [['', 'Wartosc']],
    body: [
      ['Sprawdzonych lokalizacji:', String(items.length)],
      ['Znalezionych roznic:', String(differences)],
      ['Zgodnych pozycji:', String(items.length - differences)],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: BLUE,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 50 },
    },
    didParseCell: (cellData) => {
      // Highlight differences row in red if > 0
      if (cellData.section === 'body' && cellData.row.index === 1 && differences > 0) {
        cellData.cell.styles.fillColor = [255, 235, 235] as [number, number, number];
        if (cellData.column.index === 1) {
          cellData.cell.styles.textColor = RED;
          cellData.cell.styles.fontStyle = 'bold';
        }
      }
      // Highlight last row (zgodne)
      if (cellData.section === 'body' && cellData.row.index === 2) {
        cellData.cell.styles.fillColor = [235, 255, 235] as [number, number, number];
      }
    },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: 130,
  });

  const sumEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ── Signatures ──
  const sigY = Math.max(sumEndY + 35, 220);
  const pageH = doc.internal.pageSize.getHeight();

  if (sigY < pageH - 40) {
    drawSignatures(
      doc,
      sigY,
      'Liczyl',
      '......................',
      'Zatwierdzil',
      '......................',
    );
  }

  drawFooter(doc);
  doc.save(`INW_${number.replace(/\//g, '_')}.pdf`);
};
