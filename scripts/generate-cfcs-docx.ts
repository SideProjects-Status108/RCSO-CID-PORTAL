/**
 * Generates both Case File Cover Sheet Word documents from `scripts/cfcs/sections-content.ts`.
 *
 *   npx tsx scripts/generate-cfcs-docx.ts
 *   # or: npm run generate:cfcs
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  LineRuleType,
  Packer,
  Paragraph,
  Table,
  TableBorders,
  TableCell,
  TableRow,
  TextRun,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  TextWrappingType,
  TableLayoutType,
  VerticalAlignTable,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  WidthType,
} from 'docx'

import {
  CFCS_EXTRA_BLANK_LINES_PER_SECTION,
  type CfcsSection,
  leftColumnSections,
  rightColumnSections,
} from './cfcs/sections-content'

const CHECK = '\u2610'

// Font sizes are half-points (Word convention): 8pt=16, 9pt=18, 10pt=20, 12pt=24
const RUN = 18
const TINY = 16
const SECT = 20
const TITLE = 32

// Twips: 1 pt = 20 twips, 1" = 72 pt = 1440 twips
const MARGIN = 400 // ≈0.28"

function loadWatermarkPng(): Buffer {
  const p = path.join(process.cwd(), 'public', 'branding', 'rcso-cfcs-watermark.png')
  if (!fs.existsSync(p)) {
    throw new Error(
      `Missing ${p}. Run: npx tsx scripts/strip-brand-backgrounds.ts to generate the watermark.`
    )
  }
  return fs.readFileSync(p)
}

function makeWatermarkHeader(wm: Buffer): Header {
  // Centered, behind text; 682x1024 aspect
  const w = 300
  const h = Math.round((300 * 1024) / 682)
  const run = new ImageRun({
    data: wm,
    type: 'png',
    transformation: { width: w, height: h },
    altText: { name: 'RCSO badge watermark', description: 'Watermark', title: 'Watermark' },
    floating: {
      behindDocument: true,
      allowOverlap: true,
      zIndex: 0,
      horizontalPosition: {
        relative: HorizontalPositionRelativeFrom.PAGE,
        align: HorizontalPositionAlign.CENTER,
      },
      verticalPosition: {
        relative: VerticalPositionRelativeFrom.PAGE,
        align: VerticalPositionAlign.CENTER,
      },
      wrap: { type: TextWrappingType.NONE },
    },
  })
  return new Header({
    children: [new Paragraph({ children: [run] })],
  })
}

function cfcsRow(
  line: string,
  opts: { size?: number; tabIndent?: number } = {}
): Paragraph {
  const { size = RUN, tabIndent = 0 } = opts
  const children: (TextRun | string)[] = [new TextRun({ text: CHECK, size, font: 'Segoe UI Symbol' })]
  if (tabIndent > 0) {
    children.push(new TextRun({ text: '\t'.repeat(tabIndent), size }))
  }
  children.push(new TextRun({ text: ` ${line}`.trimStart(), size, font: 'Calibri' }))
  return new Paragraph({
    spacing: { after: 12, line: 240, lineRule: LineRuleType.AT_LEAST },
    children: children,
  })
}

function sectionHeading(section: CfcsSection): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.START,
    spacing: { after: 40, before: section.number === 1 || section.number === 5 ? 0 : 120, line: 240 },
    border: { bottom: { size: 4, color: '333333', style: BorderStyle.SINGLE } },
    children: [
      new TextRun({
        text: `Section ${section.number} \u2013 ${section.title}`,
        bold: true,
        size: SECT,
        font: 'Calibri',
        underline: {},
      }),
    ],
  })
}

function buildSectionBlock(section: CfcsSection, extraLines: number): (Paragraph | Table)[] {
  const out: Paragraph[] = []
  out.push(sectionHeading(section))
  for (const item of section.items) {
    out.push(cfcsRow(item, { size: RUN }))
  }
  for (let e = 0; e < extraLines; e++) {
    out.push(cfcsRow('________________________', { size: TINY }))
  }
  return out
}

function twoColumnTable(leftParts: (Paragraph | Table)[], rightParts: (Paragraph | Table)[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [5500, 5500],
    layout: TableLayoutType.FIXED,
    borders: TableBorders.NONE,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            margins: { right: 120, left: 0, top: 0, bottom: 0 },
            children: leftParts,
          }),
          new TableCell({
            margins: { left: 120, right: 0, top: 0, bottom: 0 },
            children: rightParts,
          }),
        ],
      }),
    ],
  })
}

function routineIntro(): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'CASE FILE \u2013 TABLE OF CONTENTS',
          bold: true,
          size: TITLE,
          allCaps: true,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Routine case file submission (manila folder)',
          italics: true,
          size: RUN,
          font: 'Calibri',
        }),
      ],
    }),
  ]
}

function majorHeaderBlock(
  wm: Buffer
): (Paragraph | Table)[] {
  // Small inline badge (same asset as watermark; not floating)
  const w = 52
  const h = Math.round((w * 1024) / 682)
  const logo = new ImageRun({
    data: wm,
    type: 'png',
    transformation: { width: w, height: h },
    altText: { name: 'RCSO badge', description: 'Badge', title: 'Badge' },
  })
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [900, 8000],
      layout: TableLayoutType.FIXED,
      borders: TableBorders.NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({ verticalAlign: VerticalAlignTable.TOP, children: [new Paragraph({ children: [logo] })] }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 100 },
                  children: [
                    new TextRun({
                      text: 'Criminal Investigations Division',
                      bold: true,
                      size: 28,
                      color: 'C00000',
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    // Case fields: two equal columns of labels/underscores
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [5500, 5500],
      layout: TableLayoutType.FIXED,
      borders: TableBorders.NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'CASE #: __________________', size: TINY, font: 'Calibri' })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'OFFENSE: __________________________', size: TINY, font: 'Calibri' })],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'DETECTIVE: __________________', size: TINY, font: 'Calibri' }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'VICTIM: __________________________', size: TINY, font: 'Calibri' })],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: ' ', size: TINY, font: 'Calibri' })],
      spacing: { after: 40, before: 0 },
      border: {
        bottom: { size: 4, color: '000000', style: BorderStyle.SINGLE },
      },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: 'Major crime case file submission (large or multi-binder format)',
          italics: true,
          size: TINY,
          font: 'Calibri',
        }),
      ],
    }),
  ]
}

function buildDocument(
  bodyChildren: (Paragraph | Table)[],
  wm: Buffer
): Document {
  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: MARGIN,
              right: MARGIN,
              bottom: MARGIN,
              left: MARGIN,
            },
            size: { width: 12240, height: 15840 },
          },
        },
        headers: { default: makeWatermarkHeader(wm) },
        children: bodyChildren,
      },
    ],
  })
}

async function main() {
  const outDir = path.join(process.cwd(), 'docs', 'case-file-cover-sheet')
  fs.mkdirSync(outDir, { recursive: true })
  const wm = loadWatermarkPng()

  const ex = CFCS_EXTRA_BLANK_LINES_PER_SECTION
  const left = leftColumnSections()
  const right = rightColumnSections()
  const leftBlock = left.flatMap((s) => buildSectionBlock(s, ex)) as (Paragraph | Table)[]
  const rightBlock = right.flatMap((s) => buildSectionBlock(s, ex)) as (Paragraph | Table)[]

  const routine = buildDocument(
    [...routineIntro(), twoColumnTable(leftBlock, rightBlock)] as (Paragraph | Table)[],
    wm
  )
  const major = buildDocument(
    [...(majorHeaderBlock(wm) as (Paragraph | Table)[]), twoColumnTable(leftBlock, rightBlock)] as (
      | Paragraph
      | Table
    )[],
    wm
  )

  const p1 = path.join(outDir, 'cfcs-routine-manila.docx')
  const p2 = path.join(outDir, 'cfcs-major-crime.docx')
  await fs.promises.writeFile(p1, await Packer.toBuffer(routine))
  await fs.promises.writeFile(p2, await Packer.toBuffer(major))
  console.log('Wrote', p1, p2)
}

void main()
