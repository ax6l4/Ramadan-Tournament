/**
 * Official landscape Word report: one table row per player.
 * Mixed Arabic/English cells keep names RTL and status/sport centered.
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
  if (sport === 'football') return 'Football';
  if (sport === 'volleyball') return 'Volleyball';
  if (sport === 'both') return 'Football & Volleyball';
  return String(sport || '-');
}

function run(text, options = {}) {
  return new TextRun({
    text,
    font: FONT,
    rightToLeft: options.rtl !== false,
    size: options.size || 22,
    bold: Boolean(options.bold),
    color: options.color || '111111',
  });
}

function cellParagraph(text, options = {}) {
  return new Paragraph({
    bidirectional: options.rtl !== false,
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
  const generatedAt = new Date();
  const dateLabel = generatedAt.toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const brand = brandName || 'فريق الروضة';

  // Landscape widths: # | Player Name | Team Captain | Sport
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
        rtl: false,
      }),
      makeCell('Player Name', {
        width: colWidths[1],
        bold: true,
        shading: headerFill,
        color: headerColor,
        rtl: false,
      }),
      makeCell('Team Captain', {
        width: colWidths[2],
        bold: true,
        shading: headerFill,
        color: headerColor,
        rtl: false,
      }),
      makeCell('Sport', {
        width: colWidths[3],
        bold: true,
        shading: headerFill,
        color: headerColor,
        rtl: false,
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
        makeCell(String(index + 1), {
          width: colWidths[0],
          rtl: false,
        }),
        makeCell(player.full_name || '-', {
          width: colWidths[1],
          alignment: AlignmentType.RIGHT,
          rtl: true,
        }),
        makeCell(isLeader ? 'Yes' : 'No', {
          width: colWidths[2],
          rtl: false,
        }),
        makeCell(sportLabel(player.sport), {
          width: colWidths[3],
          rtl: false,
        }),
      ],
    });
  });

  const emptyRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 4,
        borders: CELL_BORDERS,
        children: [
          cellParagraph('No players are registered yet.', { rtl: false }),
        ],
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
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        run('Ramadan Tournament Player Registration', {
          bold: true,
          size: 36,
          rtl: false,
        }),
      ],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [run(brand, { bold: true, size: 28, rtl: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        run(`Generated: ${dateLabel}`, {
          size: 20,
          color: '555555',
          rtl: false,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [
        run(`Total players: ${players.length}`, {
          size: 20,
          color: '555555',
          rtl: false,
        }),
      ],
    }),
  ];

  const document = new Document({
    creator: brand,
    title: 'Ramadan Tournament Player Registration',
    description: 'Official player registration report',
    styles: {
      default: {
        document: {
          run: { font: FONT },
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
                alignment: AlignmentType.CENTER,
                children: [
                  run('Official Tournament Registration Report', {
                    size: 18,
                    color: '666666',
                    rtl: false,
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
                children: [
                  run(`${brand}  —  Confidential`, {
                    size: 16,
                    color: '777777',
                    rtl: true,
                  }),
                ],
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
