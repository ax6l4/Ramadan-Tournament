/**
 * تقرير تسجيل عربي رسمي: جدول أفقي RTL
 * الأعمدة: الرقم | اسم اللاعب | قائد الفريق | الرياضة
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

const FONT = 'Arial';
const BORDER = { style: BorderStyle.SINGLE, size: 8, color: '1A1A1A' };
const CELL_BORDERS = {
  top: BORDER,
  bottom: BORDER,
  left: BORDER,
  right: BORDER,
};

function sportLabel(sport) {
  if (sport === 'football') return 'كرة القدم';
  if (sport === 'volleyball') return 'الكرة الطائرة';
  if (sport === 'both') return 'كرة القدم والكرة الطائرة';
  return '-';
}

function run(text, options = {}) {
  return new TextRun({
    text,
    font: FONT,
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
    spacing: { before: 80, after: 80 },
    children: [run(text, options)],
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
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [cellParagraph(text, options)],
  });
}

async function buildPlayersDocx({ players, brandName }) {
  const dateAr = new Date().toLocaleString('ar-OM', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const brand = brandName || 'فريق الروضة';
  const colWidths = [1100, 7200, 2400, 3600];
  const headerFill = '1A1A1A';
  const headerColor = 'FFFFFF';

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      makeCell('#', {
        width: colWidths[0],
        bold: true,
        shading: headerFill,
        color: headerColor,
      }),
      makeCell('اسم اللاعب', {
        width: colWidths[1],
        bold: true,
        shading: headerFill,
        color: headerColor,
        alignment: AlignmentType.RIGHT,
      }),
      makeCell('قائد الفريق', {
        width: colWidths[2],
        bold: true,
        shading: headerFill,
        color: headerColor,
      }),
      makeCell('الرياضة', {
        width: colWidths[3],
        bold: true,
        shading: headerFill,
        color: headerColor,
      }),
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
        makeCell(isLeader ? 'نعم' : 'لا', { width: colWidths[2] }),
        makeCell(sportLabel(player.sport), { width: colWidths[3] }),
      ],
    });
  });

  const emptyRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 4,
        borders: CELL_BORDERS,
        children: [cellParagraph('لا يوجد لاعبون مسجلون حالياً.')],
      }),
    ],
  });

  const table = new Table({
    visuallyRightToLeft: true,
    width: { size: 14300, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...(players.length ? bodyRows : [emptyRow])],
  });

  const titleBlock = [
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [run('تسجيل لاعبي المسابقات الرمضانية', { bold: true, size: 36 })],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [run(brand, { bold: true, size: 28 })],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [run(`تاريخ الإنشاء: ${dateAr}`, { size: 20, color: '555555' })],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [run(`عدد اللاعبين: ${players.length}`, { size: 20, color: '555555' })],
    }),
  ];

  const document = new Document({
    creator: brand,
    title: 'تسجيل لاعبي المسابقات الرمضانية',
    description: 'كشف رسمي بتسجيل اللاعبين',
    styles: {
      default: {
        document: {
          run: { font: FONT, rightToLeft: true },
          paragraph: { bidirectional: true },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, bottom: 640, left: 720, right: 720 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.CENTER,
                children: [
                  run('كشف التسجيل الرسمي — المسابقات الرمضانية', {
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
                children: [run(`${brand} — وثيقة رسمية`, { size: 16, color: '777777' })],
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
