// import discordBotService from './discord-bot';

class StartupService {
  private static instance: StartupService;
  private initialized = false;

  private constructor() {}

  static getInstance(): StartupService {
    if (!StartupService.instance) {
      StartupService.instance = new StartupService();
    }
    return StartupService.instance;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    console.log('🚀 Initializing application services...');

    try {
      // Start Discord bot service
      // await discordBotService.start();
      console.log('✅ All services initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      // Don't throw error to prevent app from crashing
      // The Discord bot can be started manually via API if needed
    }
  }

  async shutdown() {
    if (!this.initialized) {
      return;
    }

    console.log('🛑 Shutting down application services...');

    try {
      // await discordBotService.stop();
      console.log('✅ All services shut down successfully');
      this.initialized = false;
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

const startupService = StartupService.getInstance();
export default startupService;