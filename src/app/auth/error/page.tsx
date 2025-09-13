'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'access_denied':
        return 'You denied access to your Google account. Please try again and grant permission to continue.';
      case 'invalid_state':
        return 'Invalid or expired authentication session. Please start the registration process again.';
      case 'email_not_verified':
        return 'Your Google email address is not verified. Please verify your email with Google and try again.';
      case 'missing_parameters':
        return 'Missing required authentication parameters. Please try the registration process again.';
      case 'processing_failed':
        return 'Failed to process your authentication. Please try again or contact support.';
      default:
        return 'An unexpected error occurred during authentication. Please try again.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Failed</h1>
          <p className="text-gray-600 mb-4">{getErrorMessage(error)}</p>
        </div>
        
        {error && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-500">
              <strong>Error Code:</strong> {error}
            </div>
          </div>
        )}
        
        <div className="text-sm text-gray-500 mb-6">
          Go back to Discord and try the <code className="bg-gray-100 px-1 rounded">!register</code> command again.
        </div>
        
        <button 
          onClick={() => window.close()}
          className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Close Window
        </button>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}