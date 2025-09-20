import React from 'react';
import Link from 'next/link';

export default function InstructionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
            📅 MyCalPal Instructions
          </h1>
          
          <div className="space-y-8">
            {/* Overview Section */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                🎯 Overview
              </h2>
              <p className="text-gray-600 leading-relaxed">
                MyCalPal is your AI-powered calendar assistant that works seamlessly with Discord and Google Calendar. 
                Send images of handwritten notes, schedules, or event details through Discord, or use the new text logging 
                feature to type event information directly. Watch as they're automatically converted into Google Calendar events!
              </p>
            </section>

            {/* Discord Bot Setup */}
            <section className="bg-blue-50 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-blue-800 mb-4 flex items-center">
                🤖 Discord Bot Setup
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-blue-700 mb-2">Step 1: Add Bot to Your Server</h3>
                  <p className="text-gray-700 mb-3">
                    Click the link below to add MyCalPal bot to your Discord server that you are in:
                  </p>
                  <a 
                    href="https://discord.com/oauth2/authorize?client_id=1414967584301781173" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🔗 Add MyCalPal (or Calendar-App) Bot
                  </a>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-blue-700 mb-2">Step 2: Register Your Google Account</h3>
                  <p className="text-gray-700 mb-2">
                    Start a conversation with the discord bot. Afterwards, type
                  </p>
                  <code className="bg-gray-800 text-green-400 px-3 py-2 rounded block font-mono">
                    !register
                  </code>
                  <p className="text-gray-600 text-sm mt-2">
                    This will provide you with a link to connect your Google Calendar account!
                  </p>
                </div>
              </div>
            </section>

            {/* Multi-Account Management */}
            <section className="bg-green-50 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-green-800 mb-4 flex items-center">
                👥 Multi-Account Management
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-green-700 mb-2">Managing Multiple Google Accounts</h3>
                  <p className="text-gray-700 mb-3">
                    You can register multiple Google accounts and switch between them:
                  </p>
                  
                  <div className="space-y-2">
                    <div>
                      <strong className="text-green-700">View all accounts:</strong>
                      <code className="bg-gray-800 text-green-400 px-2 py-1 rounded ml-2 font-mono">!accounts</code>
                    </div>
                    
                    <div>
                      <strong className="text-green-700">Switch active account:</strong>
                      <code className="bg-gray-800 text-green-400 px-2 py-1 rounded ml-2 font-mono">!switch 2</code>
                      <span className="text-gray-600 text-sm ml-2">(switches to account #2)</span>
                    </div>
                    
                    <div>
                      <strong className="text-green-700">Add new account:</strong>
                      <code className="bg-gray-800 text-green-400 px-2 py-1 rounded ml-2 font-mono">!register</code>
                      <span className="text-gray-600 text-sm ml-2">(adds additional account)</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Usage Instructions */}
            <section className="bg-purple-50 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-purple-800 mb-4 flex items-center">
                📸 How to Use - Image Upload
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-purple-700 mb-2">Sending Images</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>Take a photo of your handwritten schedule, notes, or event details</li>
                    <li>Send the image to the MyCalPal bot (direct message)</li>
                    <li>The bot will automatically process the image using AI</li>
                    <li>Events will be created drafted in your app dashboard (check Event Drafts tab) where you can edit/publish to a calendar connected to your Google account</li>
                    <li>After every image upload, you will receive a confirmation message notifying the process is complete</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-purple-700 mb-2">Supported Content</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Handwritten schedules and to-do lists</li>
                    <li>Meeting notes with dates and times</li>
                    <li>Event flyers and announcements</li>
                    <li>Calendar pages or planners</li>
                    <li>Any text containing date, time, and event information</li>
                  </ul>
                  <div className="mt-3 p-3 bg-purple-100 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-700">
                      <strong>💡 New:</strong> You can also use the <code className="bg-purple-200 px-2 py-1 rounded text-xs">!log</code> 
                      command to send event information as text messages instead of images!
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Log Feature */}
            <section className="bg-emerald-50 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-emerald-800 mb-4 flex items-center">
                📝 Text Logging Feature
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-emerald-700 mb-2">Send Text Messages</h3>
                  <p className="text-gray-700 mb-3">
                    You can now send text-based event information directly to the bot using the log command:
                  </p>
                  <code className="bg-gray-800 text-green-400 px-3 py-2 rounded block font-mono mb-2">
                    !log Meeting with client at 2PM tomorrow
                  </code>
                  <p className="text-gray-600 text-sm">
                    The bot will process your text message the same way as images - using AI to extract event details and create calendar drafts!
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-emerald-700 mb-2">Usage Examples</h3>
                  <div className="space-y-2">
                    <div className="bg-white p-3 rounded border">
                      <code className="text-emerald-600 font-mono">!log Doctor appointment on Friday at 3:30PM</code>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <code className="text-emerald-600 font-mono">!log Team meeting tomorrow 10AM to 11:30AM in conference room B</code>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-emerald-700 mb-2">How It Works</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>Type <code className="bg-gray-200 px-2 py-1 rounded text-sm">!log</code> followed by your event description</li>
                    <li>The bot processes your text using the same AI as image processing</li>
                    <li>Event drafts are created in your dashboard (Event Drafts tab)</li>
                    <li>You can edit and publish the events to your Google Calendar</li>
                    <li>You'll receive a confirmation message when processing is complete</li>
                  </ol>
                </div>

                <div className="bg-emerald-100 border border-emerald-200 rounded-lg p-4">
                  <h4 className="font-medium text-emerald-800 mb-2">💡 Pro Tips</h4>
                  <ul className="text-sm text-emerald-700 space-y-1">
                    <li>• Include specific dates and times for better accuracy</li>
                    <li>• Mention locations when relevant</li>
                    <li>• Add context or descriptions to help with categorization</li>
                    <li>• Use natural language - the AI understands conversational text</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Web Interface */}
            <section className="bg-orange-50 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-orange-800 mb-4 flex items-center">
                🌐 Web Interface
              </h2>
              
              <div className="space-y-4">
                <p className="text-gray-700">
                  You can also use MyCalPal through the web interface:
                </p>
                
                <div className="space-y-2">
                  <div>
                    <strong className="text-orange-700">Home Page:</strong>
                    <span className="text-gray-600 ml-2">Upload images directly through the web</span>
                  </div>
                  
                  <div>
                    <strong className="text-orange-700">Account Management:</strong>
                    <span className="text-gray-600 ml-2">Connect and manage your Google accounts</span>
                  </div>
                </div>
                
                <Link 
                  href="/"
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
                >
                  🏠 Go to Home Page
                </Link>
              </div>
            </section>

            {/* Troubleshooting */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                🔧 Troubleshooting
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Common Issues</h3>
                  <div className="space-y-3">
                    <div className="border-l-4 border-yellow-400 pl-4">
                      <strong className="text-gray-700">Bot not responding:</strong>
                      <p className="text-gray-600 text-sm">Make sure the bot has proper permissions in your Discord server and you've registered your account.</p>
                    </div>
                    
                    <div className="border-l-4 border-yellow-400 pl-4">
                      <strong className="text-gray-700">Events not created:</strong>
                      <p className="text-gray-600 text-sm">Check that your Google Calendar account is properly connected and you have the correct active account selected.</p>
                    </div>
                    
                    <div className="border-l-4 border-yellow-400 pl-4">
                      <strong className="text-gray-700">Image not processed:</strong>
                      <p className="text-gray-600 text-sm">Ensure the image is clear and contains readable text with date/time information.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Support */}
            <section className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                💬 Support
              </h2>
              
              <div className="space-y-3">
                <div className="border-t pt-3">
                  <strong className="text-gray-700">Need help?</strong>
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 mb-2">
                      For technical support issues, email:
                    </p>
                    <code className="bg-blue-800 text-blue-100 px-3 py-2 rounded block font-mono text-sm">
                      gogineni.akhil@hotmail.com
                    </code>
                    <p className="text-xs text-blue-600 mt-2">
                      <strong>Subject format:</strong> Name | MyCalPal Support
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Back to Home */}
            <div className="text-center pt-8">
              <Link 
                href="/"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}