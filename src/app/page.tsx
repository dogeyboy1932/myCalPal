'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import ImageUpload from '../components/ImageUpload';
import EventDraft from '../components/EventDraft';
import HistoryTab from '../components/HistoryTab';
// Removed EventListener - no longer using SSE
import { ExtractedEvent } from '../types';

// Make this component dynamic to avoid SSR issues
const DynamicHome = dynamic(() => Promise.resolve(HomeComponent), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  ),
});

function HomeComponent() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('home');
  const [isUploading, setIsUploading] = useState(false);
  const [eventDrafts, setEventDrafts] = useState<ExtractedEvent[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [skipDrafts, setSkipDrafts] = useState(false);
  const [hasLoadedDraftsFromDB, setHasLoadedDraftsFromDB] = useState(false);
  // Removed wsConnected state - no longer using WebSocket

  // No localStorage usage - removed to prevent data persistence issues

  // Removed localStorage persistence to prevent data issues

  // Clear drafts when user signs out
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('🗑️ User signed out - clearing local drafts state');
      setEventDrafts([]);
      setHasLoadedDraftsFromDB(false);
      setActiveTab('drafts'); // Reset to upload tab
    }
  }, [status]);

  // Automatically load drafts from MongoDB when drafts tab is first accessed
  useEffect(() => {
    if (activeTab === 'drafts' && !hasLoadedDraftsFromDB && session) {
      console.log('🔄 Auto-loading drafts from MongoDB on first access');
      const loadDraftsFromDB = async () => {
        try {
          console.log('📡 Auto-fetching from /api/drafts...');
          const response = await fetch('/api/drafts', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          console.log('📊 Auto-load response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📥 Auto-load data:', data);
            console.log('📥 Auto-load events count:', data.events ? data.events.length : 'No events property');
            
            // Load fresh data from database
            if (data.events) {
              console.log('🔄 Auto-load: Setting drafts with fresh database data');
              setEventDrafts(data.events);
            } else {
              console.log('ℹ️ Auto-load: No events in response, setting empty drafts');
              setEventDrafts([]);
            }
          } else {
            const errorText = await response.text();
            console.error('❌ Auto-load API Error - Status:', response.status, 'Response:', errorText);
          }
        } catch (error) {
          console.error('❌ Auto-load error:', error);
          console.error('❌ Auto-load error details:', error instanceof Error ? error.message : 'Unknown error');
        } finally {
          setHasLoadedDraftsFromDB(true);
        }
      };
      
      loadDraftsFromDB();
    }
  }, [activeTab, hasLoadedDraftsFromDB, session]);

  // Removed automatic polling - using manual refresh only

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log("UPLOADING 1")

      const response = await fetch('/api/receiver/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      console.log('Upload result:', result);
      
      if (result.success && result.event) {
        // The receiver/image endpoint now returns the event directly
        const newEvent: ExtractedEvent = {
            ...result.event,
            status: 'draft' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        
        console.log(newEvent)
        
        if (skipDrafts) {
          // Skip drafts and publish directly
          await handlePublishEvent(newEvent);
        } else {
          // Create draft as usual
          setEventDrafts(prev => [newEvent, ...prev]);
          setActiveTab('drafts'); // Switch to drafts tab to show the result
        }
      } else {
        throw new Error(result.error || 'Failed to extract event information');
      }
    } catch (error) {
      console.error('Upload error2:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEvent = async (updatedEvent: ExtractedEvent) => {
    try {
      // Update in MongoDB first
      const response = await fetch(`/api/drafts/${updatedEvent.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...updatedEvent,
          updatedAt: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save draft');
      }
      
      // Only update UI state if MongoDB update was successful
      setEventDrafts(prev => 
        prev.map(event => 
          event.id === updatedEvent.id 
            ? { ...updatedEvent, updatedAt: new Date().toISOString() }
            : event
        )
      );
      console.log(`✅ Successfully saved draft ${updatedEvent.id}`);
    } catch (error) {
      console.error('❌ Error saving draft:', error);
      alert(error instanceof Error ? error.message : 'Failed to save draft');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Delete from MongoDB first
      const response = await fetch(`/api/drafts/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete draft');
      }
      
      // Only update UI state if MongoDB deletion was successful
      setEventDrafts(prev => prev.filter(event => event.id !== eventId));
      console.log(`✅ Successfully deleted draft ${eventId}`);
    } catch (error) {
      console.error('❌ Error deleting draft:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete draft');
    }
  };

  // Test function to create a sample event for debugging
  const handleTestCalendarCreate = async () => {
    const testEvent: ExtractedEvent = {
      id: `test_${Date.now()}`,
      title: 'Test Meeting',
      date: '2024-01-15',
      startTime: '14:00',
      endTime: '15:00',
      location: 'Conference Room A',
      description: 'Test event for debugging calendar creation',
      attendees: [],
      confidence: 1.0,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('Testing calendar creation with:', testEvent);
    await handlePublishEvent(testEvent);
  };

  // Test function to directly test publish endpoint
  const handleTestPublish = async () => {
    if (eventDrafts.length === 0) {
      alert('No drafts available to test publish');
      return;
    }
    
    const testDraft = eventDrafts[0];
    console.log('🧪 Testing publish with draft:', testDraft);
    
    try {
      await handlePublishEvent(testDraft, 'primary');
      console.log('✅ Test publish completed successfully');
    } catch (error) {
      console.error('❌ Test publish failed:', error);
      alert('Test publish failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handlePublishEvent = async (event: ExtractedEvent, calendarId?: string): Promise<void> => {
    // Validate and ensure proper end time
    let endTime = event.endTime;
    if (!endTime) {
      // Infer end time as 1 hour after start time
      const [startHours, startMinutes] = event.startTime.split(':').map(Number);
      const inferredEndHours = startHours + 1;
      const endMinutesStr = startMinutes.toString().padStart(2, '0');
      const endHoursStr = (inferredEndHours % 24).toString().padStart(2, '0');
      endTime = `${endHoursStr}:${endMinutesStr}`;
    }
    
    // Convert date and time to proper startTime and endTime (preserve original date)
    // Use UTC date construction to avoid timezone conversion issues
    const [year, month, day] = event.date.split('-').map(Number);
    const [startHours, startMinutes] = event.startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const startDateTime = new Date(Date.UTC(year, month - 1, day, startHours, startMinutes, 0, 0));
    const endDateTime = new Date(Date.UTC(year, month - 1, day, endHours, endMinutes, 0, 0));
    
    const response = await fetch('/api/calendar/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: event.title,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        location: event.location,
        description: event.description,
        providerId: 'google',
        calendarId: calendarId
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create calendar event');
    }

    const result = await response.json();
    console.log(result)

    if (!result.success) {
      throw new Error(result.error || 'Failed to publish event');
    }

    // Move draft to published collection and remove from drafts
    let draftMovedSuccessfully = false;
    try {
      const moveResponse = await fetch('/api/drafts/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          draftId: event.id,
          publishedEventId: result.eventId,
          calendarProvider: 'google',
          calendarId: calendarId
        })
      });
      
      if (moveResponse.ok) {
        const moveResult = await moveResponse.json();
        if (moveResult.success) {
          draftMovedSuccessfully = true;
        } else {
          console.error('Failed to move draft to published collection:', moveResult.error);
        }
      } else {
        console.error('Failed to move draft to published collection - HTTP', moveResponse.status);
      }
    } catch (error) {
      console.error('Error moving draft to published:', error);
    }
    
    // Only remove from drafts UI if the backend deletion was successful
    if (draftMovedSuccessfully) {
      setEventDrafts(prev => prev.filter(e => e.id !== event.id));
    } else {
      console.warn('Draft was not removed from UI because backend deletion failed');
      throw new Error('Event was published to calendar but draft could not be removed from database');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to MyCalPal</h1>
          <p className="text-gray-600 mb-8">Please sign in with Google to continue</p>
          <button
              onClick={() => signIn('google')}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>

            <div className="mt-8 text-sm text-gray-500">
            <p>Connect your calendar to get started</p>
          </div>
        </div>
        
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Calendar Assistant</h1>
            <p className="text-gray-600">Extract events from images using AI and sync to your calendar</p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => signIn('google')}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
            
            <button
              onClick={() => signIn('azure-ad')}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white rounded-lg px-4 py-3 hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4z"/>
              </svg>
              Sign in with Microsoft
            </button>
          </div>
          
          <div className="mt-8 text-sm text-gray-500">
            <p>Connect your calendar to get started</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-row items-center">
              <h1 className="text-xl font-semibold text-gray-900">AI Calendar Assistant</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt="Profile"
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                )}
                <div className="flex flex-col">
                  <span className="text-sm text-gray-700">{session.user?.name}</span>
                  <span className="text-xs text-gray-500">{session.user?.email}</span>
                </div>
              </div>
              
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'home', label: 'Home', icon: '🏠' },
              { id: 'drafts', label: 'Event Drafts', icon: '📝' },
              { id: 'upload', label: 'Upload Image', icon: '📷' },
              { id: 'history', label: 'History', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
            
            {/* Instructions Link */}
            <Link
              href="/instructions"
              className="py-4 px-1 border-b-2 border-transparent font-bold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
            >
              <span className="mr-2">❓</span>
              How To Use
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'home' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">MyCalPal</h1>
              <p className="text-lg text-gray-600 mb-6">
                Your AI-powered calendar assistant that turns images into calendar events
              </p>
              
              <div className="flex justify-center mb-8">
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  <span>🚪</span>
                  Sign Out
                </button>
              </div>
            </div>
            
            {/* Calendar Integration */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-blue-600">📅</span>
                Google Calendar Integration
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-600">✅</span>
                      <h3 className="font-medium text-green-900">Connected Account</h3>
                    </div>
                    <p className="text-sm text-green-700">
                      {session.user?.email || 'No account connected'}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-blue-600">🔄</span>
                      <h3 className="font-medium text-blue-900">Auto-Sync</h3>
                    </div>
                    <p className="text-sm text-blue-700">
                      Events are automatically synced to your Google Calendar when published
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-purple-600">🎯</span>
                      <h3 className="font-medium text-purple-900">Smart Detection</h3>
                    </div>
                    <p className="text-sm text-purple-700">
                      AI automatically extracts event details from your images
                    </p>
                  </div>
                  
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-orange-600">⚡</span>
                      <h3 className="font-medium text-orange-900">Quick Actions</h3>
                    </div>
                    <p className="text-sm text-orange-700">
                      Review, edit, and publish events with just a few clicks
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Event Image</h2>
            
            {/* Skip Drafts Toggle */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-blue-600">⚡</span>
                  <div>
                    <h3 className="font-medium text-blue-900">Quick Publish Mode</h3>
                    <p className="text-sm text-blue-700">Skip drafts and publish events directly to your calendar</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDrafts}
                    onChange={(e) => setSkipDrafts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            {uploadError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <span className="text-red-500 mr-2">⚠️</span>
                  <p className="text-red-700">{uploadError}</p>
                </div>
              </div>
            )}
            
            <ImageUpload
              onUpload={handleImageUpload}
              isProcessing={isUploading}
            />
            
            {/* Real-time Event Updates */}
            <div className="mt-6">
              {/* EventListener removed - using manual refresh instead */}
            </div>
          </div>
        )}

        {activeTab === 'drafts' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Event Drafts</h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleTestPublish}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    🧪 Test Publish
                  </button>
                  <button
                    onClick={async () => {
                      // alert('Button clicked! Check console for logs.');
                      console.log('🔄 Manual refresh triggered');
                      console.log('Button click handler executed successfully');
                      try {
                        console.log('📡 Fetching from /api/drafts...');
                        const response = await fetch('/api/drafts', {
                          credentials: 'include',
                          headers: {
                            'Content-Type': 'application/json'
                          }
                        });
                        
                        console.log('📊 Response status:', response.status);
                        console.log('📊 Response ok:', response.ok);
                        console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

                        if (response.ok) {
                          const data = await response.json();
                          console.log('📥 Manual refresh data:', data);
                          console.log('📥 Events count:', data.events ? data.events.length : 'No events property');
                          
                          // Overwrite current data with fresh data from database
                          if (data.events) {
                            console.log('🔄 Overwriting current drafts with fresh database data');
                            setEventDrafts(data.events);
                          } else {
                            console.log('ℹ️ No events in response, clearing drafts');
                            setEventDrafts([]);
                          }
                        } else {
                          const errorText = await response.text();
                          console.error('❌ API Error - Status:', response.status, 'Response:', errorText);
                        }
                      } catch (error) {
                        console.error('❌ Manual refresh error:', error);
                        console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                  >
                    🔄 Refresh
                  </button>
                  <span className="text-sm text-gray-500">
                    {eventDrafts.length} {eventDrafts.length === 1 ? 'draft' : 'drafts'}
                  </span>
                </div>
              </div>
              
              {eventDrafts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📝</div>
                  <p className="text-gray-500">No event drafts yet</p>
                  <p className="text-sm text-gray-400 mt-2">Upload an image to create your first event draft</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {eventDrafts.map((event) => {
                    console.log(event)
                    return (
                      <EventDraft
                        key={event.id}
                        event={event}
                        onSave={handleSaveEvent}
                        onDelete={handleDeleteEvent}
                        onPublish={handlePublishEvent}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryTab onRefresh={() => {}} userId={session.user.email!} />
        )}


      </main>
    </div>
  );
}

export default function Home() {
  return <DynamicHome />;
}