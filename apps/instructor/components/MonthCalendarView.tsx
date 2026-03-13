'use client';

import { useState, useMemo, type CSSProperties } from 'react';
import CalendarDayCell, { type CalendarDayData } from './CalendarDayCell';
import DayDetailModal from './DayDetailModal';
import type { CalendarEvent } from '@/lib/instructorApi';

export interface CalendarItem {
  id: string;
  type: 'booking-confirmed' | 'booking-pending' | 'google-event' | 'blocked' | 'available';
  title: string;
  startTime: string;
  endTime: string;
  customerName?: string | null;
}

interface MonthCalendarViewProps {
  bookings: CalendarItem[];
  googleEvents: CalendarItem[];
  blockedSlots: CalendarItem[];
  availableSlots?: CalendarItem[];
  onMonthChange?: (year: number, month: number) => void;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function MonthCalendarView({
  bookings,
  googleEvents,
  blockedSlots,
  availableSlots = [],
  onMonthChange,
}: MonthCalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const allItems = useMemo(() => {
    return [...bookings, ...googleEvents, ...blockedSlots, ...availableSlots];
  }, [bookings, googleEvents, blockedSlots, availableSlots]);

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days: CalendarDayData[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, items: [], isToday: false, isCurrentMonth: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dayItems = allItems.filter(item => {
        const itemDate = new Date(item.startTime);
        return isSameDay(itemDate, date);
      }).map(item => ({
        ...item,
        time: formatTime(item.startTime),
      }));

      days.push({
        date,
        items: dayItems,
        isToday: isSameDay(date, today),
        isCurrentMonth: true,
      });
    }

    const remainingCells = 42 - days.length;
    for (let i = 0; i < remainingCells; i++) {
      days.push({ date: null, items: [], isToday: false, isCurrentMonth: false });
    }

    return days;
  }, [currentYear, currentMonth, allItems, today]);

  const handlePrevMonth = () => {
    let newMonth = currentMonth - 1;
    let newYear = currentYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    onMonthChange?.(newYear, newMonth);
  };

  const handleNextMonth = () => {
    let newMonth = currentMonth + 1;
    let newYear = currentYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    onMonthChange?.(newYear, newMonth);
  };

  const handleToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    onMonthChange?.(today.getFullYear(), today.getMonth());
  };

  const handleDayClick = (date: Date | null) => {
    if (date) {
      setSelectedDay(date);
    }
  };

  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return [];
    return allItems.filter(item => {
      const itemDate = new Date(item.startTime);
      return isSameDay(itemDate, selectedDay);
    });
  }, [selectedDay, allItems]);

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
  };

  const titleStyle: CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: 'rgba(226, 232, 240, 0.95)',
  };

  const navContainerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const buttonStyle: CSSProperties = {
    padding: '0.375rem 0.75rem',
    borderRadius: '0.375rem',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    background: 'transparent',
    color: 'rgba(226, 232, 240, 0.95)',
    fontWeight: 500,
    cursor: 'pointer',
    fontSize: '0.875rem',
  };

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px',
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    border: '1px solid rgba(148, 163, 184, 0.2)',
  };

  const dayHeaderStyle: CSSProperties = {
    padding: '0.75rem 0.5rem',
    textAlign: 'center',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'rgba(148, 163, 184, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>
          {MONTHS[currentMonth]} {currentYear}
        </h2>
        <div style={navContainerStyle}>
          <button type="button" style={buttonStyle} onClick={handleToday}>
            Today
          </button>
          <button type="button" style={buttonStyle} onClick={handlePrevMonth}>
            ←
          </button>
          <button type="button" style={buttonStyle} onClick={handleNextMonth}>
            →
          </button>
        </div>
      </div>

      <div style={gridStyle}>
        {DAYS_OF_WEEK.map(day => (
          <div key={day} style={dayHeaderStyle}>
            {day}
          </div>
        ))}
        {calendarDays.map((dayData, index) => (
          <CalendarDayCell
            key={index}
            data={dayData}
            onClick={() => handleDayClick(dayData.date)}
          />
        ))}
      </div>

      {selectedDay && (
        <DayDetailModal
          date={selectedDay}
          items={selectedDayItems}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
