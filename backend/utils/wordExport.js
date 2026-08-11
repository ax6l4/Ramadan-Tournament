/**
 * Builds a professional Word (.docx) registration report.
 * Layout uses stacked labeled paragraphs (no tables) so Arabic RTL
 * names render reliably in Microsoft Word.
 */

const {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  Footer,
  Packer,
  Paragraph,
  TextRun,
} = require('docx');

const ARABIC_FONT = 'Arial';

/**
 * Maps stored sport codes to the English labels requested in the export.
 */
function formatSport(sport) {
  if (sport === 'football') return 'Football';
  if (sport === 'volleyball') return 'Volleyball';
  if (sport === 'both') return 'Football & Volleyball';
  return String(sport || '-');
}

function textRun(text, options = {}) {
  return new TextRun({
    text,
    font: ARABIC_FONT,
    rightToLeft: true,
    size: options.size || 24,
    bold: Boolean(options.bold),
    color: options.color || '111111',
    italics: Boolean(options.italics),
  });
}

function paragraph(children, extra = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: extra.alignment || AlignmentType.RIGHT,
    spacing: extra.spacing || { after: 120 },
    border: extra.border,
    children,
  });
}

function labeledField(label, value) {
  return [
    paragraph([textRun(label, { bold: true, size: 22, color: '555555' })], {
      spacing: { before: 80, after: 60 },
    }),
    paragraph([textRun(value, { size: 28 })], {
      spacing: { after: 220 },
    }),
  ];
}

function divider() {
  return paragraph([], {
    spacing: { before: 160, after: 240 },
    border: {
      bottom: {
        color: '111111',
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
  });
}

/**
 * @param {object} options
 * @param {Array} options.players
 * @param {string} [options.brandName]
 * @returns {Promise<Buffer>}
 */
async function buildPlayersDocx({ players, brandName }) {
  const generatedAt = new Date();
  const dateEn = generatedAt.toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const dateAr = generatedAt.toLocaleString('ar-OM', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const brand = brandName || 'فريق الروضة';

  const children = [
    paragraph([textRun('Ramadan Tournament Player Registration', { bold: true, size: 40 })], {
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    paragraph([textRun(brand, { bold: true, size: 28 })], {
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    paragraph(
      [textRun(`Generated: ${dateEn}`, { size: 20, color: '555555', italics: true })],
      { alignment: AlignmentType.CENTER, spacing: { after: 40 } }
    ),
    paragraph(
      [textRun(`تاريخ الإصدار: ${dateAr}`, { size: 20, color: '555555' })],
      { alignment: AlignmentType.CENTER, spacing: { after: 80 } }
    ),
    paragraph(
      [textRun(`Total registered players: ${players.length}`, { size: 22 })],
      { alignment: AlignmentType.CENTER, spacing: { after: 200 } }
    ),
    divider(),
  ];

  if (players.length === 0) {
    children.push(
      paragraph([textRun('No players are registered yet.', { italics: true, size: 24 })], {
        alignment: AlignmentType.CENTER,
      })
    );
  } else {
    players.forEach((player, index) => {
      children.push(
        paragraph(
          [textRun(`Player ${index + 1}`, { bold: true, size: 26, color: '000000' })],
          { spacing: { before: 80, after: 180 } }
        ),
        ...labeledField('Player Name:', player.full_name || '-'),
        ...labeledField('Team Captain:', player.is_team_leader ? 'Yes' : 'No'),
        ...labeledField('Sports:', formatSport(player.sport))
      );

      if (index < players.length - 1) {
        children.push(divider());
      }
    });
  }

  const document = new Document({
    creator: brand,
    title: 'Ramadan Tournament Player Registration',
    description: 'Official player registration export',
    styles: {
      default: {
        document: {
          run: {
            font: ARABIC_FONT,
            rightToLeft: true,
          },
          paragraph: {
            bidirectional: true,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 864,
              right: 864,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              paragraph(
                [textRun('Ramadan Tournament  ·  Official Registration Record', { size: 18, color: '666666' })],
                { alignment: AlignmentType.CENTER, spacing: { after: 0 } }
              ),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              paragraph(
                [textRun(`${brand} — Confidential tournament document`, { size: 16, color: '777777' })],
                { alignment: AlignmentType.CENTER, spacing: { after: 0 } }
              ),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}

module.exports = {
  buildPlayersDocx,
  formatSport,
};
