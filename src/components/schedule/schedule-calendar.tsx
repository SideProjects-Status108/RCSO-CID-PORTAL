'use client'

import { useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, EventContentArg, EventInput } from '@fullcalendar/core'

import type { ScheduleEventRow, ScheduleEventType } from '@/types/schedule'

const colors: Record<ScheduleEventType, string> = {
  regular: '#4a7c7e',
  on_call: '#c8a84b',
  vacation: '#6b5b95',
  school: '#1e6fd9',
  in_service: '#1e6fd9',
  fto_shift: '#b5651d',
}

export type ScheduleCalendarView = 'dayGridMonth' | 'timeGridWeek' | 'listWeek'

type ScheduleCalendarProps = {
  events: ScheduleEventRow[]
  initialView: ScheduleCalendarView
  onEventClick: (event: ScheduleEventRow) => void
}

function handleEventDidMount(arg: { el: HTMLElement; event: { extendedProps: Record<string, unknown> } }) {
  const raw = arg.event.extendedProps.raw as ScheduleEventRow | undefined
  if (!raw) return
  const color = colors[raw.event_type]
  arg.el.style.borderLeftWidth = '4px'
  arg.el.style.borderLeftStyle = 'solid'
  arg.el.style.borderLeftColor = color
}

function eventContent(arg: EventContentArg) {
  const raw = arg.event.extendedProps.raw as ScheduleEventRow | undefined
  const gcal = Boolean(raw?.gcal_event_id)
  return (
    <div className="cid-cal-event-inner flex min-h-[26px] items-center gap-1 px-0.5 py-0.5">
      {gcal ? (
        <span
          className="cid-cal-gcal-badge shrink-0 rounded px-0.5 text-[9px] font-semibold uppercase leading-none text-white/95 ring-1 ring-white/40"
          title="Synced from Google Calendar"
        >
          GCal
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate font-medium text-white">{arg.event.title}</span>
    </div>
  )
}

export function ScheduleCalendar({
  events,
  initialView,
  onEventClick,
}: ScheduleCalendarProps) {
  const fcEvents = useMemo<EventInput[]>(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title || e.event_type.replaceAll('_', ' '),
        start: e.start_datetime,
        end: e.end_datetime,
        allDay: e.is_all_day,
        backgroundColor: colors[e.event_type],
        borderColor: colors[e.event_type],
        textColor: '#ffffff',
        classNames: ['cid-cal-event'],
        extendedProps: { raw: e },
      })),
    [events]
  )

  function handleClick(arg: EventClickArg) {
    const raw = arg.event.extendedProps.raw as ScheduleEventRow | undefined
    if (raw) onEventClick(raw)
  }

  return (
    <div
      className={[
        'schedule-fc text-text-primary',
        '[&_.fc]:text-text-primary',
        '[&_.fc-toolbar-title]:font-heading [&_.fc-toolbar-title]:text-lg [&_.fc-toolbar-title]:tracking-wide [&_.fc-toolbar-title]:text-text-primary',
        '[&_.fc-button]:border-border-subtle [&_.fc-button]:bg-bg-elevated [&_.fc-button]:text-text-primary [&_.fc-button]:font-heading [&_.fc-button]:text-xs [&_.fc-button]:tracking-wide',
        '[&_.fc-button-primary]:border-accent-primary/40 [&_.fc-button-primary]:bg-accent-primary [&_.fc-button-primary]:text-bg-app',
        '[&_.fc-col-header-cell]:border-border-subtle',
        '[&_.fc-daygrid-day]:border-border-subtle',
        '[&_.fc-scrollgrid]:border-border-subtle',
        '[&_.fc-theme-standard_td]:border-border-subtle',
        '[&_.fc-timegrid-slot]:border-border-subtle',
        '[&_.fc-daygrid-day.fc-day-today]:border-t-2 [&_.fc-daygrid-day.fc-day-today]:border-t-accent-primary [&_.fc-daygrid-day.fc-day-today]:bg-accent-primary-muted/35',
        '[&_.fc-timegrid-col.fc-day-today]:border-t-2 [&_.fc-timegrid-col.fc-day-today]:border-t-accent-primary [&_.fc-timegrid-col.fc-day-today]:bg-accent-primary-muted/25',
        '[&_.fc-list-day-cushion]:bg-bg-elevated [&_.fc-list-day-cushion]:text-text-primary',
        '[&_.cid-cal-event_.fc-event-main]:overflow-hidden',
        '[&_.fc-daygrid-event-harness]:min-h-[28px]',
        '[&_.fc-timegrid-event-harness]:min-h-[28px]',
      ].join(' ')}
    >
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={initialView}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,listWeek',
        }}
        height="auto"
        events={fcEvents}
        eventClick={handleClick}
        eventDidMount={handleEventDidMount}
        eventContent={eventContent}
        nowIndicator
        dayMaxEvents
      />
    </div>
  )
}
