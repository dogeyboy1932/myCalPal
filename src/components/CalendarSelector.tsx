'use client';

import { useState, useEffect } from 'react';

interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary: boolean;
  accessRole: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

interface CalendarSelectorProps {
  selectedCalendarId?: string;
  onCalendarSelect: (calendarId: string) => void;
  disabled?: boolean;
}

export default function CalendarSelector({ 
  selectedCalendarId, 
  onCalendarSelect, 
  disabled = false 
}: CalendarSelectorProps) {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCalendars();
  }, []);

  const fetchCalendars = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/calendar/list');
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendars');
      }
      
      const data = await response.json();
      setCalendars(data.calendars || []);
      
      // Auto-select primary calendar if no selection exists
      if (!selectedCalendarId && data.calendars?.length > 0) {
        const primaryCalendar = data.calendars.find((cal: Calendar) => cal.primary);
        if (primaryCalendar) {
          onCalendarSelect(primaryCalendar.id);
        } else {
          onCalendarSelect(data.calendars[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching calendars:', err);
      setError('Failed to load calendars');
    } finally {
      setLoading(false);
    }
  };

  const selectedCalendar = calendars.find(cal => cal.id === selectedCalendarId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
        <span className="text-sm text-gray-500">Loading calendars...</span>
      </div>
    );
  }

  if (error || calendars.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-red-300 rounded-lg bg-red-50">
        
        <span className="text-sm text-red-600">
          {error || 'No calendars available'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 border rounded-lg text-sm
          ${disabled 
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer'
          }
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >

        <span className="truncate max-w-[150px]">
          {selectedCalendar?.summary || 'Select Calendar'}
        </span>
      </button>

      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
            {calendars.map((calendar) => (
              <button
                key={calendar.id}
                type="button"
                onClick={() => {
                  onCalendarSelect(calendar.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2
                  ${calendar.id === selectedCalendarId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                  ${calendar.primary ? 'font-medium' : ''}
                `}
              >
                <div 
                  className="w-3 h-3 rounded-full border"
                  style={{ 
                    backgroundColor: calendar.backgroundColor || '#4285f4',
                    borderColor: calendar.foregroundColor || '#ffffff'
                  }}
                />
                <div className="flex-1 truncate">
                  <div className="truncate">
                    {calendar.summary}
                    {calendar.primary && (
                      <span className="ml-1 text-xs text-blue-600">(Primary)</span>
                    )}
                  </div>
                  {calendar.description && (
                    <div className="text-xs text-gray-500 truncate">
                      {calendar.description}
                    </div>
                  )}
                </div>
                {calendar.id === selectedCalendarId && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}