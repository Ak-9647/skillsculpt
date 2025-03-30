console.log('[Function Start] Loading modules...'); // Log 1
const functions = require('@google-cloud/functions-framework');
const { VertexAI } = require('@google-cloud/vertexai');
const admin = require('firebase-admin');
console.log('[Function Start] Modules loaded.'); // Log 2

// --- Configuration ---
// We still read project/location here potentially for other uses or logging,
// but Vertex AI init will use hardcoded values.
const project = process.env.GCLOUD_PROJECT;
const location = process.env.FUNCTION_REGION || 'us-west2'; // Default location if env var is missing

// *** CHANGED MODEL FOR TESTING ***
// const model = 'gemini-1.5-flash-001'; // Original model causing 404
const model = 'gemini-1.0-pro';         // USE THIS MODEL FOR TESTING
console.log(`[Function Start] Config: Detected Environment Project=${project}, Location=${location}, Model=${model}`); // Log 3 (Will now log gemini-1.0-pro)
// ---

// --- Initialize SDKs ---
let firebaseAdminInitialized = false;
let vertexAIInitialized = false;
let vertex_ai; // Keep these declared outside for scope if needed
let generativeModel;

console.log('[Function Start] Initializing Firebase Admin...'); // Log 4
try {
    admin.initializeApp(); // Uses default credentials/config
    firebaseAdminInitialized = true;
    console.log('[Function Start] Firebase Admin Initialized successfully.'); // Log 5
} catch (adminError) {
    console.error("FATAL: Failed to initialize Firebase Admin:", adminError); // Log 6 (FATAL)
    // Consider if you want the function to stop entirely here if Firebase fails
}

// Initialize Vertex AI *after* Firebase Admin attempt
console.log(`[Function Start] Initializing Vertex AI (Firebase Admin Initialized: ${firebaseAdminInitialized})...`); // Log 7
try {
    // Directly use hardcoded values because environment variables were unreliable
    vertex_ai = new VertexAI({
        project: 'car-magic-454906', // YOUR PROJECT ID
        location: 'us-central1'       // YOUR FUNCTION REGION
    });

    // This will now use the model variable defined above (gemini-1.0-pro)
    generativeModel = vertex_ai.getGenerativeModel({
        model: model,
        // Consider adjusting generationConfig as needed
        generationConfig: { maxOutputTokens: 1024, temperature: 0.6, topP: 0.9 },
    });
    vertexAIInitialized = true;
    console.log(`[Function Start] Vertex AI Initialized successfully (using hardcoded config for region: us-central1).`); // Log 8 (Updated log message)
} catch (initError) {
    console.error("FATAL: Failed to initialize Vertex AI:", initError); // Log 9 (FATAL)
    // vertexAIInitialized remains false
}
console.log(`[Function Start] SDK Init Complete. Firebase Admin: ${firebaseAdminInitialized}, Vertex AI: ${vertexAIInitialized}`); // Log 10
// --- End Initializations ---


// Input validation helper function (Placeholder - Implement as needed)
const validateInput = (req) => {
  if (!req.body || !req.body.promptText || typeof req.body.promptText !== 'string' || req.body.promptText.trim() === '') {
    console.warn('[Request Warn] Input validation failed: Missing or invalid promptText.');
    return { valid: false, error: 'Missing or invalid promptText in request body.' };
  }
  // Add more specific validation if needed (e.g., length checks)
  console.log('[Request] Input validation passed.');
  return { valid: true };
};


// Register HTTP function - ENTRY POINT IS 'enhanceResumeText'
console.log('[Function Start] Registering HTTP function...'); // Log 11
functions.http('enhanceResumeText', async (req, res) => {
    console.log('[Request Start] Function triggered.'); // Log 12

    // --- CORS Handling ---
    // Set CORS headers for all responses (including errors and OPTIONS)
    res.set('Access-Control-Allow-Origin', '*'); // Be more specific in production! e.g., your frontend URL
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Respond to preflight requests
    if (req.method === 'OPTIONS') {
        console.log('[Request] Handling OPTIONS preflight request.');
        res.status(204).send('');
        return;
    }
    // --- End CORS Handling ---

    // --- SDK Initialization Check ---
    // Crucial check: ensure SDKs initialized before proceeding
    if (!firebaseAdminInitialized || !vertexAIInitialized) {
         console.error("[Request Error] Service not fully initialized due to SDK startup errors. Cannot process request."); // Log 13
         // Do not proceed if initialization failed
         return res.status(500).send("Internal Server Error: Service initialization failed.");
    }
    console.log('[Request] SDK initialization check passed.');

    // --- Firebase Auth ID Token Verification ---
    let decodedToken;
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        console.warn('[Request Error] Authorization header missing or invalid.');
        return res.status(403).send('Unauthorized: Missing token.');
    }
    const idToken = authorizationHeader.split('Bearer ')[1];
    try {
        console.log('[Request] Verifying Firebase ID Token...');
        decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log(`[Request] Token verified successfully for UID: ${decodedToken.uid}`); // Log 14
    } catch (error) {
         console.error('[Request Error] Token verification failed:', error.message); // Log 15
         return res.status(403).send('Unauthorized: Invalid token.');
    }
    // --- End Token Verification ---

    // --- Input Validation ---
    const validation = validateInput(req);
    if (!validation.valid) {
        return res.status(400).send(`Bad Request: ${validation.error}`);
    }
    const { promptText } = req.body; // Use validated input
    console.log(`[Request] Processing request for UID: ${decodedToken.uid}`);
    // --- End Input Validation ---

    // --- Construct Prompt ---
    // Use the prompt text directly from the validated request body
    const fullPrompt = `Enhance the following resume work experience description to sound more professional and impactful. Focus on action verbs and quantifiable results where possible, but do not invent information. Keep it concise (around 2-4 sentences or bullet points). Original description: "${promptText}"`;
    console.log('[Request] Constructed Gemini prompt.');
    // --- End Construct Prompt ---

    // --- Call Gemini ---
    try {
        console.log(`[Request] Calling Gemini (${model}) for UID: ${decodedToken.uid}...`); // Log 16 (Added model name)

        const requestPayload = {
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        };

        const streamingResp = await generativeModel.generateContentStream(requestPayload);
        // Aggregate the response stream
        let aggregatedResponse = '';
        for await (const item of streamingResp.stream) {
            if (item.candidates?.[0]?.content?.parts?.[0]?.text) {
              aggregatedResponse += item.candidates[0].content.parts[0].text;
            }
        }

        const enhancedText = aggregatedResponse.trim(); // Trim whitespace

        if (!enhancedText) {
             console.warn(`[Request Warn] Gemini (${model}) returned an empty response.`); // Added model name
             // Decide how to handle empty responses - maybe return original text or specific message
             return res.status(500).send('Internal Server Error: AI model returned an empty response.');
        }

        console.log(`[Request] Gemini (${model}) call successful. Returning enhanced text.`); // Log 17 (Added model name)
        res.status(200).json({ enhancedText: enhancedText });

    } catch (error) {
        console.error(`[Request Error] Error calling Vertex AI / Gemini (${model}):`, error); // Log 18 (Added model name)
        // Check for specific Vertex AI errors if needed
        res.status(500).send('Internal Server Error calling AI model.');
    }
});
console.log('[Function Start] HTTP function registered.'); // Log 19