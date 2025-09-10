'use client';

import { useEffect } from 'react';

export default function StartupInitializer() {
  useEffect(() => {
    // Initialize services when the app starts
    const initializeServices = async () => {
      try {
        // Call the startup API endpoint to initialize Discord bot
        const response = await fetch('/api/discord/start', {
          method: 'POST',
        });
        
        if (response.ok) {
          console.log('✅ Discord bot initialized successfully');
        } else {
          console.warn('⚠️ Discord bot initialization failed, but app will continue');
        }
      } catch (error) {
        console.warn('⚠️ Failed to initialize Discord bot:', error);
        // Don't throw error - app should continue working even if Discord bot fails
      }
    };

    initializeServices();

    // Cleanup function to stop services when app unmounts
    return () => {
      fetch('/api/discord/start', {
        method: 'DELETE',
      }).catch(error => {
        console.warn('Warning: Failed to stop Discord bot during cleanup:', error);
      });
    };
  }, []);

  return null; // This component doesn't render anything
}