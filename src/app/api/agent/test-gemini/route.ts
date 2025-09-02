import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        error: 'GEMINI_API_KEY not configured'
      }, { status: 500 });
    }

    const body = await request.json();
    const { message = "Hello, can you respond with 'Hello from Gemini!'?" } = body;

    console.log('Testing Gemini API with message:', message);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Simple test prompt
    const testPrompt = `You are a helpful AI assistant. Please respond to this message: "${message}"`;

    console.log('Sending test prompt to Gemini...');
    
    const result = await model.generateContent(testPrompt);
    const response = await result.response;
    const responseText = response.text();

    console.log('Gemini response received:', responseText ? 'Success' : 'Empty');

    return NextResponse.json({
      success: true,
      response: responseText,
      message: 'Gemini API test successful'
    });

  } catch (error) {
    console.error('Gemini API test error:', error);
    
    let errorMessage = 'Unknown error';
    let errorDetails = '';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
      
      // Check for specific error types
      if (error.message.includes('API_KEY')) {
        errorMessage = 'Invalid API key';
      } else if (error.message.includes('PERMISSION_DENIED')) {
        errorMessage = 'Permission denied - check API key permissions';
      } else if (error.message.includes('QUOTA_EXCEEDED')) {
        errorMessage = 'API quota exceeded';
      }
    }

    return NextResponse.json({
      error: 'Gemini API test failed',
      details: errorMessage,
      stack: errorDetails,
      apiKeyConfigured: !!process.env.GEMINI_API_KEY
    }, { status: 500 });
  }
}
