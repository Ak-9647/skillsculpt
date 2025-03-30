const functions = require('@google-cloud/functions-framework');
const { VertexAI } = require('@google-cloud/vertexai');

// --- Configuration ---
const PROJECT_ID = 'car-magic-454906'; // Your GCP Project ID
const LOCATION_ID = 'us-central1';    // Deployment location
const MODEL_ID = 'gemini-1.0-pro';    // Model to use

// --- Initialize Vertex AI Client ---
let vertexAI;
let generativeModel;
try {
  vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION_ID });
  generativeModel = vertexAI.getGenerativeModel({ model: MODEL_ID });
  console.log('Vertex AI client initialized successfully.'); // Log success
} catch (initError) {
  console.error('FATAL: Failed to initialize Vertex AI Client:', initError);
  // Prevent the function from attempting to register if client fails
  throw new Error('Vertex AI client initialization failed.');
}


// --- Helper Function ---
function parseAiResponse(responseText) {
    if (!responseText) {
        return [];
    }
    // Remove potential intro phrases like "Here are..." or list markers
    const cleanedText = responseText
      .replace(/^.*:\s*/, '') // Remove leading "Anything:"
      .replace(/^\s*-\s*/gm, '') // Remove leading dashes/bullets per line
      .trim();

    // Split by comma or newline, trim, and filter empty
    return cleanedText
        .split(/,|\n/) // Split by comma OR newline
        .map(skill => skill.trim())
        .filter(skill => skill && skill.length > 0);
}

// --- Register HTTP Function ---
try {
  functions.http('suggestResumeSkills', async (req, res) => {
      // --- CORS Handling ---
      // Allow requests from any origin (adjust in production!)
      res.set('Access-Control-Allow-Origin', '*');
      // Allow POST method and OPTIONS preflight
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      // Allow Content-Type AND Authorization headers
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Respond to preflight requests
      if (req.method === 'OPTIONS') {
          console.log('Handling OPTIONS preflight request (allowing Auth header).');
          res.status(204).send('');
          return;
      }
      // --- End CORS Handling ---

      // Log POST request attempt (moved initial log here)
      console.log(`Request received. Method: ${req.method}. Headers: ${JSON.stringify(req.headers)}`);

      // Check if it's a POST request
      if (req.method !== 'POST') {
          console.warn(`Received non-POST request: ${req.method}`);
          res.status(405).send('Method Not Allowed');
          return;
      }

      console.log('suggestResumeSkills POST request invoked.');

      // --- Main Request Logic ---
      try {
          console.log("Attempting to access req.body");
          if (!req.body) {
             console.error("req.body is missing or undefined!");
             res.status(400).send("Bad Request: Missing body");
             return;
          }
          // Log the body only after confirming it exists
          console.log("Request body:", JSON.stringify(req.body));

          // Input Validation
          if (typeof req.body !== 'object' || !Array.isArray(req.body.jobTitles) || !Array.isArray(req.body.jobDescriptions) || !Array.isArray(req.body.existingSkills) || typeof req.body.summary !== 'string') {
              console.error('Input validation failed: Invalid data types or structure.');
              res.status(400).send('Bad Request: Invalid input data structure.');
              return;
          }
          const { jobTitles, jobDescriptions, existingSkills, summary } = req.body;
          console.log('Input validation passed.');

          // Construct Prompt
          const descriptionsText = jobDescriptions.join('\n\n').trim();
          const titlesText = jobTitles.join(', ').trim();
          const skillsText = existingSkills.join(', ').trim();

          const context = `
            Resume Summary: ${summary || 'Not provided'}
            Job Titles: ${titlesText || 'Not provided'}
            Job Descriptions:
            ${descriptionsText || 'Not provided'}
            Existing Skills Already Listed: ${skillsText || 'None'}
          `.trim();

          const prompt = `Based on the following resume context, suggest 5 to 10 relevant technical or soft skills that would be valuable additions. Focus on skills commonly associated with the roles and experiences described, but *do not* include skills that are variations of those already listed in "Existing Skills Already Listed".

            Context:
            ${context}

            Suggestions Requested: Return *only* a comma-separated list of the suggested skill names (e.g., Python, Project Management, Data Analysis). Do not include introductory text, explanations, or numbering.`.trim();
          console.log('Constructed Gemini prompt.');

          // Call Vertex AI
          console.log('Sending request to Vertex AI...');
          const requestPayload = {
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
          };

          const resp = await generativeModel.generateContent(requestPayload);
          console.log('Received raw response from Vertex AI.');

          // Process Response
          if (!resp.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
              console.error('Invalid or empty response structure from Vertex AI:', JSON.stringify(resp));
              throw new Error('Received invalid or empty response from AI model.');
          }
          const aiTextResponse = resp.response.candidates[0].content.parts[0].text;
          console.log(`Raw AI Text Response: "${aiTextResponse}"`);

          const suggestedSkillsArray = parseAiResponse(aiTextResponse);
          console.log(`Parsed suggested skills: ${suggestedSkillsArray.length}`);

          // Send Success Response
          res.status(200).json({ suggestedSkills: suggestedSkillsArray });
          console.log('Successfully sent skill suggestions response.');

      } catch (error) { // *** CORRECTED JAVASCRIPT CATCH SYNTAX ***
          console.error("Error processing skill suggestion request:", error);
          const errorMessage = (error instanceof Error) ? error.message : JSON.stringify(error);
          // Sending error response - CORS headers set earlier should apply
          res.status(500).send(`Internal Server Error: ${errorMessage}`);
      }
  });
  console.log('[Function Start] HTTP function registered with updated CORS.');

} catch (registrationError) {
  console.error('FATAL: Failed to register HTTP function:', registrationError);
  process.exit(1); // Exit if registration fails
}