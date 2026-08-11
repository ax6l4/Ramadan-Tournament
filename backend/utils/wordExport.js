/**
 * كشف تسجيل اللاعبين بصيغة Word
 * نفس أعمدة لوحة التحكم (بدون الهاتف) على صفحة أفقية عربية
 */

const {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  Footer,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} = require('docx');

const ARABIC_FONT = 'Arial';
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: 'C8C8C4' };
const CELL_BORDERS = {
  top: BORDER,
  bottom: BORDER,
  left: BORDER,
  right: BORDER,
};

function textRun(text, options = {}) {
  return new TextRun({
    text,
    font: ARABIC_FONT,
    rightToLeft: true,
    size: options.size || 22,
    bold: Boolean(options.bold),
    color: options.color || '111111',
  });
}

function cellParagraph(text, options = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: options.alignment || AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    children: [textRun(text, options)],
  });
}

function makeCell(text, options = {}) {
  return new TableCell({
    width: { size: options.width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    borders: CELL_BORDERS,
    shading: options.shading
      ? { type: ShadingType.CLEAR, fill: options.shading }
      : undefined,
    children: [cellParagraph(text, options)],
  });
}

function mark(isSelected) {
  return isSelected ? '✓' : '✗';
}

async function buildPlayersDocx({ players, brandName }) {
  const generatedAt = new Date();
  const dateAr = generatedAt.toLocaleString('ar-OM', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const brand = brandName || 'فريق الروضة';

  // عرض أفقي: الرقم | الاسم | قائد | قدم | طائرة
  const colWidths = [900, 7200, 1600, 1600, 1600];

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      makeCell('#', { width: colWidths[0], bold: true, shading: 'F4F4F2' }),
      makeCell('الاسم الكامل', {
        width: colWidths[1],
        bold: true,
        shading: 'F4F4F2',
        alignment: AlignmentType.RIGHT,
      }),
      makeCell('قائد', { width: colWidths[2], bold: true, shading: 'F4F4F2' }),
      makeCell('قدم', { width: colWidths[3], bold: true, shading: 'F4F4F2' }),
      makeCell('طائرة', { width: colWidths[4], bold: true, shading: 'F4F4F2' }),
    ],
  });

  const bodyRows = players.map((player, index) => {
    const isLeader =
      player.is_team_leader === true ||
      player.is_team_leader === 1 ||
      player.is_team_leader === '1';

    return new TableRow({
      children: [
        makeCell(String(index + 1), { width: colWidths[0] }),
        makeCell(player.full_name || '-', {
          width: colWidths[1],
          alignment: AlignmentType.RIGHT,
        }),
        makeCell(mark(isLeader), { width: colWidths[2], bold: true, size: 28 }),
        makeCell(mark(player.plays_football), {
          width: colWidths[3],
          bold: true,
          size: 28,
        }),
        makeCell(mark(player.plays_volleyball), {
          width: colWidths[4],
          bold: true,
          size: 28,
        }),
      ],
    });
  });

  const emptyRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 5,
        borders: CELL_BORDERS,
        children: [
          cellParagraph('لا يوجد لاعبون مسجلون حالياً.', {
            italics: true,
          }),
        ],
      }),
    ],
  });

  const table = new Table({
    visuallyRightToLeft: true,
    width: { size: 12900, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...(players.length ? bodyRows : [emptyRow])],
  });

  const titleBlock = [
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [textRun('تسجيل لاعبي المسابقات الرمضانية', { bold: true, size: 36 })],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [textRun(brand, { bold: true, size: 26 })],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        textRun(`تاريخ الإصدار: ${dateAr}  —  العدد: ${players.length}`, {
          size: 20,
          color: '555555',
        }),
      ],
    }),
  ];

  const document = new Document({
    creator: brand,
    title: 'تسجيل لاعبي المسابقات الرمضانية',
    styles: {
      default: {
        document: {
          run: { font: ARABIC_FONT, rightToLeft: true },
          paragraph: { bidirectional: true },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 560, bottom: 560, left: 720, right: 720 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.CENTER,
                children: [
                  textRun('المسابقات الرمضانية — كشف التسجيل', {
                    size: 18,
                    color: '666666',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.CENTER,
                children: [textRun(`${brand} — وثيقة رسمية`, { size: 16, color: '777777' })],
              }),
            ],
          }),
        },
        children: [...titleBlock, table],
      },
    ],
  });

  return Packer.toBuffer(document);
}

module.exports = {
  buildPlayersDocx,
};
