'use client';

import { useState } from 'react';
import { ExtractedEvent } from '@/types/event';

interface EventDraftProps {
  event: ExtractedEvent;
  onSave: (event: ExtractedEvent) => void;
  onDelete: (id: string) => void;
  onPublish: (event: ExtractedEvent) => void;
}

export default function EventDraft({ event, onSave, onDelete, onPublish }: EventDraftProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<ExtractedEvent>(event);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleSave = () => {
    onSave(editedEvent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedEvent(event);
    setIsEditing(false);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await onPublish(editedEvent);
    } finally {
      setIsPublishing(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Title
            </label>
            <input
              type="text"
              value={editedEvent.title}
              onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={editedEvent.date}
                onChange={(e) => setEditedEvent({ ...editedEvent, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={editedEvent.time || editedEvent.startTime || ''}
                onChange={(e) => setEditedEvent({ ...editedEvent, time: e.target.value, startTime: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={editedEvent.endTime || ''}
                onChange={(e) => setEditedEvent({ ...editedEvent, endTime: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={editedEvent.location || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, location: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={editedEvent.description || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              type="text"
              value={editedEvent.category || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, category: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Meeting, Conference, Social"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attendees (comma-separated)
            </label>
            <input
              type="text"
              value={editedEvent.attendees?.join(', ') || ''}
              onChange={(e) => setEditedEvent({ 
                ...editedEvent, 
                attendees: e.target.value.split(',').map(a => a.trim()).filter(a => a) 
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe, Jane Smith, ..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save Changes
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">📅</span>
              <span>{formatDate(event.date)}</span>
            </div>
            
            {(event.startTime || event.endTime) && (
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">🕐</span>
                <span>
                  {event.startTime && formatTime(event.startTime)}
                  {event.startTime && event.endTime && ' - '}
                  {event.endTime && formatTime(event.endTime)}
                </span>
              </div>
            )}
          </div>

          {event.category && (
            <div className="flex items-center space-x-2 text-sm mt-3">
              <span className="text-gray-500">🏷️</span>
              <span>{event.category}</span>
            </div>
          )}

          {event.location && (
            <div className="flex items-center space-x-2 text-sm mt-3">
              <span className="text-gray-500">📍</span>
              <span>{event.location}</span>
            </div>
          )}
          
          {event.attendees && event.attendees.length > 0 && (
            <div className="text-sm mt-3">
              <span className="text-gray-500">👥 Attendees:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {event.attendees.map((attendee, index) => (
                  <span key={index} className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {attendee}
                  </span>
                ))}
              </div>
            </div>
          )}

          {event.description && (
            <div className="text-sm text-gray-600 mt-3">
              <p>{event.description}</p>
            </div>
          )}

          {/* Additional event details */}
          <div className="space-y-3 mt-4">
            {(event.dayOfWeek || event.duration || event.timezone || event.priority || event.organizer || event.contact || event.website || event.recurrence) && (
              <>
                <h4 className="font-medium text-gray-700">Additional Details</h4>
                
                {event.dayOfWeek && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Day of Week:</span>
                    <span className="text-sm text-gray-800">{event.dayOfWeek}</span>
                  </div>
                )}
                
                {event.duration && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Duration:</span>
                    <span className="text-sm text-gray-800">{event.duration}</span>
                  </div>
                )}
                
                {event.timezone && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Timezone:</span>
                    <span className="text-sm text-gray-800">{event.timezone}</span>
                  </div>
                )}
                
                {event.priority && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Priority:</span>
                    <span className="text-sm text-gray-800">{event.priority}</span>
                  </div>
                )}
                
                {event.organizer && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Organizer:</span>
                    <span className="text-sm text-gray-800">{event.organizer}</span>
                  </div>
                )}
                
                {event.contact && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Contact:</span>
                    <span className="text-sm text-gray-800">{event.contact}</span>
                  </div>
                )}
                
                {event.website && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Website:</span>
                    <a href={event.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800">{event.website}</a>
                  </div>
                )}
                
                {event.recurrence && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Recurrence:</span>
                    <span className="text-sm text-gray-800">{event.recurrence}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex space-x-3 pt-4 border-t">
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isPublishing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <span>📅</span>
                  <span>Add to Calendar</span>
                </>
              )}
            </button>
            
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Edit Details
            </button>
          </div>
        </div>
      )}


    </div>
  );
}