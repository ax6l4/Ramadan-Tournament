/**
 * تقرير تسجيل اللاعبين بصيغة Word
 * الصفحة أفقية (عرض) والنصوص عربية RTL بدون جداول
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
  TabStopType,
  TextRun,
} = require('docx');

const ARABIC_FONT = 'Arial';

function formatSport(sport) {
  if (sport === 'football') return 'كرة قدم';
  if (sport === 'volleyball') return 'كرة طائرة';
  if (sport === 'both') return 'كرة قدم وكرة طائرة';
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
    tabStops: extra.tabStops,
    children,
  });
}

function divider() {
  return paragraph([], {
    spacing: { before: 80, after: 160 },
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
 * صف أفقي واحد لكل لاعب: الاسم | قائد الفريق | الرياضة
 * يعتمد على عرض الصفحة الأفقي ومواضع الجدولة
 */
function playerRow(player, index) {
  const captain = player.is_team_leader ? 'نعم' : 'لا';
  const sport = formatSport(player.sport);

  return paragraph(
    [
      textRun(`اللاعب ${index + 1}`, { bold: true, size: 24 }),
      new TextRun({ text: '\t', font: ARABIC_FONT }),
      textRun('اسم اللاعب: ', { bold: true, size: 22, color: '555555' }),
      textRun(player.full_name || '-', { size: 24 }),
      new TextRun({ text: '\t', font: ARABIC_FONT }),
      textRun('قائد فريق: ', { bold: true, size: 22, color: '555555' }),
      textRun(captain, { size: 24 }),
      new TextRun({ text: '\t', font: ARABIC_FONT }),
      textRun('الرياضة: ', { bold: true, size: 22, color: '555555' }),
      textRun(sport, { size: 24 }),
    ],
    {
      spacing: { before: 140, after: 140 },
      tabStops: [
        { type: TabStopType.RIGHT, position: 2200 },
        { type: TabStopType.RIGHT, position: 9000 },
        { type: TabStopType.RIGHT, position: 12800 },
      ],
    }
  );
}

async function buildPlayersDocx({ players, brandName }) {
  const generatedAt = new Date();
  const dateAr = generatedAt.toLocaleString('ar-OM', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const brand = brandName || 'فريق الروضة';

  const children = [
    paragraph([textRun('تسجيل لاعبي المسابقات الرمضانية', { bold: true, size: 40 })], {
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    paragraph([textRun(brand, { bold: true, size: 28 })], {
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    paragraph(
      [textRun(`تاريخ الإصدار: ${dateAr}`, { size: 20, color: '555555' })],
      { alignment: AlignmentType.CENTER, spacing: { after: 40 } }
    ),
    paragraph(
      [textRun(`عدد اللاعبين المسجلين: ${players.length}`, { size: 22 })],
      { alignment: AlignmentType.CENTER, spacing: { after: 160 } }
    ),
    divider(),
  ];

  if (players.length === 0) {
    children.push(
      paragraph([textRun('لا يوجد لاعبون مسجلون حالياً.', { italics: true, size: 24 })], {
        alignment: AlignmentType.CENTER,
      })
    );
  } else {
    children.push(
      paragraph(
        [
          textRun('الرقم', { bold: true, size: 20, color: '555555' }),
          new TextRun({ text: '\t', font: ARABIC_FONT }),
          textRun('اسم اللاعب', { bold: true, size: 20, color: '555555' }),
          new TextRun({ text: '\t', font: ARABIC_FONT }),
          textRun('قائد فريق', { bold: true, size: 20, color: '555555' }),
          new TextRun({ text: '\t', font: ARABIC_FONT }),
          textRun('الرياضة', { bold: true, size: 20, color: '555555' }),
        ],
        {
          spacing: { after: 80 },
          tabStops: [
            { type: TabStopType.RIGHT, position: 2200 },
            { type: TabStopType.RIGHT, position: 9000 },
            { type: TabStopType.RIGHT, position: 12800 },
          ],
        }
      )
    );

    players.forEach((player, index) => {
      children.push(playerRow(player, index));
    });
  }

  const document = new Document({
    creator: brand,
    title: 'تسجيل لاعبي المسابقات الرمضانية',
    description: 'كشف رسمي بتسجيل اللاعبين',
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
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: {
              top: 560,
              bottom: 560,
              left: 720,
              right: 720,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              paragraph(
                [textRun('المسابقات الرمضانية — كشف التسجيل الرسمي', { size: 18, color: '666666' })],
                { alignment: AlignmentType.CENTER, spacing: { after: 0 } }
              ),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              paragraph(
                [textRun(`${brand} — وثيقة رسمية للبطولة`, { size: 16, color: '777777' })],
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
