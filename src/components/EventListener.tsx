'use client';

import { useEffect, useState } from 'react';

interface ExtractedEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  attendees?: string[];
  category?: string;
  confidence: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface SSEMessage {
  type: string;
  data?: ExtractedEvent;
  timestamp: string;
}

export default function EventListener() {
  const [events, setEvents] = useState<ExtractedEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    const evtSource = new EventSource("/api/stream");
    evtSource.onmessage = (e) => {
      console.log("Update from server:", e.data);
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'event_extracted') {
          setEvents(prev => [data.data, ...prev]);
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };
    return () => evtSource.close();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Real-time Event Updates</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span className="text-sm text-gray-600 capitalize">{connectionStatus}</span>
        </div>
      </div>
      
      {events.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No events extracted yet. Upload an image to see real-time updates!</p>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {events.map((event) => (
            <div key={event.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-gray-900">{event.title}</h3>
                <span className="text-xs text-gray-500">
                  {new Date(event.createdAt).toLocaleTimeString()}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                {event.date && (
                  <div><span className="font-medium">Date:</span> {event.date}</div>
                )}
                {event.time && (
                  <div><span className="font-medium">Time:</span> {event.time}</div>
                )}
                {event.location && (
                  <div className="col-span-2"><span className="font-medium">Location:</span> {event.location}</div>
                )}
                {event.description && (
                  <div className="col-span-2"><span className="font-medium">Description:</span> {event.description}</div>
                )}
              </div>
              
              <div className="mt-2 flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  event.confidence > 0.8 ? 'bg-green-100 text-green-800' :
                  event.confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {Math.round(event.confidence * 100)}% confidence
                </span>
                <span className="text-xs text-gray-500">Status: {event.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}