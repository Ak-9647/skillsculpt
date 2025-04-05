import { NextResponse } from 'next/server';
import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';

// Initialize Vertex AI client
const vertex_ai = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID,
  location: 'us-central1'
});

// Initialize the Gemini Pro model
const model = 'gemini-1.0-pro';
const generativeModel = vertex_ai.preview.getGenerativeModel({
  model: model,
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 1024,
    topP: 0.8,
    topK: 40
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ]
});

interface EnhancementRequest {
  text: string;
  field: 'headline' | 'summary' | 'experience' | 'education' | 'skills';
}

function validateRequest(body: unknown): body is EnhancementRequest {
  if (!body || typeof body !== 'object') return false;
  const request = body as EnhancementRequest;
  return (
    typeof request.text === 'string' &&
    typeof request.field === 'string' &&
    ['headline', 'summary', 'experience', 'education', 'skills'].includes(request.field)
  );
}

function generatePrompt(field: string, text: string): string {
  const fieldSpecificInstructions = {
    headline: 'Create a compelling, attention-grabbing headline that highlights your professional value proposition.',
    summary: 'Write an engaging summary that tells your professional story and showcases your expertise.',
    experience: 'Enhance your work experience descriptions to better highlight achievements and impact.',
    education: 'Refine your education descriptions to emphasize relevant academic achievements and qualifications.',
    skills: 'Organize and present your skills in a way that highlights your expertise and value.'
  };

  return `Act as an expert LinkedIn profile copywriter. Review the following LinkedIn ${field}:

"${text}"

${fieldSpecificInstructions[field as keyof typeof fieldSpecificInstructions]}

Requirements:
- Be concise and impactful
- Use professional language
- Focus on value and achievements
- Maintain authenticity
- Avoid clichés and buzzwords
- Keep the original meaning and intent

Provide only the enhanced text without any additional formatting or labels.`;
}

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    if (!validateRequest(body)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { text: string, field: string }' },
        { status: 400 }
      );
    }

    const { text, field } = body;

    // Generate the prompt
    const prompt = generatePrompt(field, text);

    // Call Vertex AI
    const result = await generativeModel.generateContent(prompt);
    // Extract the generated text
    const generatedText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('No text generated from AI model');
    }

    // Return the suggestion
    return NextResponse.json({
      suggestion: generatedText.trim()
    });

  } catch (error) {
    console.error('Error enhancing LinkedIn text:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Invalid request body')) {
        return NextResponse.json(
          { error: 'Invalid request format' },
          { status: 400 }
        );
      }
      if (error.message.includes('No text generated')) {
        return NextResponse.json(
          { error: 'Failed to generate enhancement' },
          { status: 500 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      { error: 'Internal server error - Failed to enhance text' },
      { status: 500 }
    );
  }
} 