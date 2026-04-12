'use client'

import { useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, EventInput } from '@fullcalendar/core'

import type { ScheduleEventRow, ScheduleEventType } from '@/types/schedule'

const colors: Record<ScheduleEventType, string> = {
  regular: '#4a7c7e',
  on_call: '#c8a84b',
  vacation: '#6b5b95',
  school: '#3d6ea4',
  in_service: '#3d6ea4',
  fto_shift: '#b5651d',
}

type ScheduleCalendarProps = {
  events: ScheduleEventRow[]
  initialView: 'dayGridMonth' | 'timeGridWeek'
  onEventClick: (event: ScheduleEventRow) => void
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
        extendedProps: { raw: e },
      })),
    [events]
  )

  function handleClick(arg: EventClickArg) {
    const raw = arg.event.extendedProps.raw as ScheduleEventRow | undefined
    if (raw) onEventClick(raw)
  }

  return (
    <div className="schedule-fc text-text-primary [&_.fc]:text-text-primary [&_.fc-button]:border-border-subtle [&_.fc-button]:bg-bg-elevated [&_.fc-button]:text-text-primary [&_.fc-button-primary]:border-accent-primary/40 [&_.fc-button-primary]:bg-accent-primary [&_.fc-button-primary]:text-bg-app [&_.fc-col-header-cell]:border-border-subtle [&_.fc-daygrid-day]:border-border-subtle [&_.fc-scrollgrid]:border-border-subtle [&_.fc-theme-standard_td]:border-border-subtle [&_.fc-timegrid-slot]:border-border-subtle [&_.fc-toolbar-title]:text-text-primary">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={initialView}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek',
        }}
        height="auto"
        events={fcEvents}
        eventClick={handleClick}
        nowIndicator
        dayMaxEvents
      />
    </div>
  )
}
