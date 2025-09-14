'use client';

import { useState } from 'react';
import { ExtractedEvent } from '../types';
import CalendarSelector from './CalendarSelector';

interface EventDraftProps {
  event: ExtractedEvent;
  onSave: (event: ExtractedEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPublish: (event: ExtractedEvent, calendarId?: string) => Promise<void>;
}

export default function EventDraft({ event, onSave, onDelete, onPublish }: EventDraftProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<ExtractedEvent>(event);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [publishMessage, setPublishMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSave = async () => {
    try {
      await onSave(editedEvent);
      setIsEditing(false);
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Save failed:', error);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishMessage(null);
    try {
      await onPublish(editedEvent, selectedCalendarId);
      setPublishMessage({ type: 'success', text: 'Event successfully published to calendar!' });
      // Clear success message after 5 seconds
      setTimeout(() => setPublishMessage(null), 5000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to publish event. Please try again.';
      setPublishMessage({ type: 'error', text: errorMessage });
      console.error('Publish failed:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  const formatDate = (dateString: string) => {
    // console.log("HERE")
    // console.log(dateString)
    // Parse date string directly to avoid timezone conversion issues
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
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
            onClick={async () => {
              try {
                await onDelete(event.id);
              } catch (error) {
                // Error handling is done in the parent component
                console.error('Delete failed:', error);
              }
            }}
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
          
          {publishMessage && (
            <div className={`mt-3 p-3 rounded-lg border ${
              publishMessage.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {publishMessage.type === 'success' ? '✅' : '❌'}
                </span>
                <span className="text-sm">{publishMessage.text}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}