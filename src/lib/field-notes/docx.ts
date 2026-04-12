import 'server-only'

import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'

import type { FieldNoteRow } from '@/types/field-notes'

function labeledSection(heading: string, body: string | null | undefined): Paragraph[] {
  const t = body?.trim()
  if (!t) return []
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
      children: [new TextRun({ text: heading, bold: true })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: t })],
    }),
  ]
}

export async function buildFieldNoteDocx(note: FieldNoteRow): Promise<Buffer> {
  const meta: Paragraph[] = []
  if (note.incident_date) {
    meta.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: 'Incident date: ', bold: true }),
          new TextRun({
            text: new Date(note.incident_date + 'T12:00:00').toLocaleDateString(),
          }),
        ],
      })
    )
  }
  if (note.location_description?.trim()) {
    meta.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: 'Location: ', bold: true }),
          new TextRun({ text: note.location_description.trim() }),
        ],
      })
    )
  }

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 240 },
      children: [new TextRun({ text: note.title.trim() || 'Field note' })],
    }),
    ...meta,
    ...labeledSection('Narrative', note.narrative),
    ...labeledSection('Evidence & observations', note.evidence_notes),
    ...labeledSection('Persons of interest', note.persons_of_interest),
    ...labeledSection('Follow-up actions', note.follow_up_actions),
  ]

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}
