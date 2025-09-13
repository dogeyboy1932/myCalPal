'use client';

import { useState } from 'react';
import { ExtractedEvent } from '../types';
import CalendarSelector from './CalendarSelector';

interface EventDraftProps {
  event: ExtractedEvent;
  onSave: (event: ExtractedEvent) => void;
  onDelete: (id: string) => void;
  onPublish: (event: ExtractedEvent, calendarId?: string) => void;
}

export default function EventDraft({ event, onSave, onDelete, onPublish }: EventDraftProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<ExtractedEvent>(event);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');

  const handleSave = () => {
    onSave(editedEvent);
    setIsEditing(false);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await onPublish(editedEvent, selectedCalendarId);
    } finally {
      setIsPublishing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString: string) => {
    return timeString || 'Not specified';
  };

  return (
    <div className="bg-white rounded-lg shadow-md border p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            event.confidence > 0.8 ? 'bg-green-500' : 
            event.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span className="text-sm text-gray-500">
            Confidence: {Math.round(event.confidence * 100)}%
          </span>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
          <button
            onClick={() => onDelete(event.id)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <input
            type="text"
            value={editedEvent.title}
            onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
            placeholder="Event Title"
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
          
          <div className="grid grid-cols-3 gap-4">
            <input
              type="date"
              value={editedEvent.date}
              onChange={(e) => setEditedEvent({ ...editedEvent, date: e.target.value })}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="time"
              value={editedEvent.startTime || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, startTime: e.target.value })}
              placeholder="Start time"
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="time"
              value={editedEvent.endTime || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, endTime: e.target.value })}
              placeholder="End time"
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <input
            type="text"
            value={editedEvent.location || ''}
            onChange={(e) => setEditedEvent({ ...editedEvent, location: e.target.value })}
            placeholder="Location"
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
          
          <textarea
            value={editedEvent.description || ''}
            onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
            placeholder="Description"
            rows={3}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
          
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">{event.title}</h3>
          <div className="text-gray-600">
            <p><strong>Date:</strong> {formatDate(event.date)}</p>
            <p><strong>Time:</strong> {formatTime(event.startTime)} - {formatTime(event.endTime)}</p>
            {event.location && <p><strong>Location:</strong> {event.location}</p>}
            {event.description && <p><strong>Description:</strong> {event.description}</p>}
          </div>
          
          <div className="flex items-center gap-3">
            <CalendarSelector
              selectedCalendarId={selectedCalendarId}
              onCalendarSelect={setSelectedCalendarId}
              disabled={isPublishing}
            />
            <button
              onClick={handlePublish}
              disabled={isPublishing || !selectedCalendarId}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isPublishing ? 'Publishing...' : 'Publish to Calendar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}