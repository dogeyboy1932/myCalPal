'use client';

import React, { useState, useEffect } from 'react';

interface PublishedEvent {
  _id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  calendarProvider: string;
  publishedAt: string;
  originalDraftId: string;
}

interface HistoryTabProps {
  onRefresh?: () => void;
}

export default function HistoryTab({ onRefresh }: HistoryTabProps) {
  const [publishedEvents, setPublishedEvents] = useState<PublishedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPublishedEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/published');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch published events');
      }
      
      setPublishedEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching published events:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch published events');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = async () => {
    if (!confirm('Are you sure you want to delete all published events? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      
      const response = await fetch('/api/published', {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete history');
      }
      
      console.log(`Successfully deleted ${data.deletedCount} published events`);
      setPublishedEvents([]);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting history:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete history');
    } finally {
      setDeleting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  useEffect(() => {
    fetchPublishedEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading published events...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Event History</h2>
          <p className="text-gray-600 mt-1">
            {publishedEvents.length} published event{publishedEvents.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={fetchPublishedEvents}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            {/* <div className={`w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full ${loading ? 'animate-spin' : ''}`}></div> */}
            🔄 Refresh
          </button>
          
          {publishedEvents.length > 0 && (
            <button
              onClick={handleDeleteHistory}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              🗑️
              {deleting ? 'Deleting...' : 'Delete History'}
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Published Events List */}
      {publishedEvents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl text-gray-400 mx-auto mb-4">📅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Published Events</h3>
          <p className="text-gray-600">Events you publish will appear here in your history.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {publishedEvents.map((event) => (
            <div
              key={event._id}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {event.title}
                  </h3>
                  
                  {event.description && (
                    <p className="text-gray-600 mb-3">{event.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      🕐
                      <span>{formatDateTime(event.startTime)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span>Duration: {formatDuration(event.startTime, event.endTime)}</span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center gap-1">
                        📍
                        <span>{event.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      📅
                      <span className="capitalize">{event.calendarProvider}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right text-sm text-gray-500">
                  <div>Published</div>
                  <div>{formatDateTime(event.publishedAt)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}