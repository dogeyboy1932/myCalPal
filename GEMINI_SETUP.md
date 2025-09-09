# Google Gemini API Setup Guide

This guide will help you set up Google Gemini API integration for AI-powered event extraction from images.

## Prerequisites

1. A Google Cloud Platform account
2. Access to Google AI Studio or Vertex AI

## Setup Steps

### 1. Get Your Gemini API Key

#### Option A: Google AI Studio (Recommended for development)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

#### Option B: Google Cloud Console (For production)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Generative Language API"
4. Go to "Credentials" and create an API key
5. Restrict the API key to the Generative Language API for security

### 2. Configure Your Environment

1. Open your `.env` file in the project root
2. Add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. Save the file

### 3. Test the Integration

1. Start your development server:
   ```bash
   pnpm run dev
   ```

2. The following API endpoints are now available:
   - `POST /api/extract` - Extract event information from images
   - `POST /api/upload` - Upload and process images
   - `GET /api/files/[filename]` - Serve uploaded files

## API Usage Examples

### Extract Event Information from Image

```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('options', JSON.stringify({
  language: 'English',
  confidenceThreshold: 0.7,
  includeMetadata: true
}));

const response = await fetch('/api/extract', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.data); // Extracted event information
```

### Upload Image for Processing

```javascript
const formData = new FormData();
formData.append('image', imageFile);

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.data.file.url); // URL to access the uploaded file
```

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)

## File Size Limits

- Maximum file size: 10MB
- Images larger than 2048px width will be automatically resized

## Security Notes

1. **Never commit your API key to version control**
2. Use environment variables for API keys
3. Consider using API key restrictions in production
4. Implement rate limiting for production deployments

## Troubleshooting

### Common Issues

1. **"API key not found" error**
   - Ensure `GEMINI_API_KEY` is set in your `.env` file
   - Restart your development server after adding the key

2. **"Invalid API key" error**
   - Verify your API key is correct
   - Check if the Generative Language API is enabled

3. **"File too large" error**
   - Ensure your image is under 10MB
   - Try compressing the image before upload

4. **"Unsupported file type" error**
   - Only JPEG, PNG, WebP, and GIF formats are supported
   - Convert your image to a supported format

## Rate Limits

Google Gemini API has rate limits that vary by tier:
- Free tier: 15 requests per minute
- Paid tier: Higher limits based on your plan

Implement appropriate error handling and retry logic in your application.

## Next Steps

1. Integrate the extraction API into your frontend components
2. Add error handling and loading states
3. Implement user feedback for extraction results
4. Consider adding batch processing for multiple images

For more information, visit the [Google AI documentation](https://ai.google.dev/docs).