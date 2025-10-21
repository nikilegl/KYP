const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Get Netlify Blobs store
  const store = getStore('ai-jobs');
  
  // Store initial job status
  await store.set(jobId, JSON.stringify({
    status: 'processing',
    createdAt: new Date().toISOString()
  }));

  // Return job ID immediately (this makes it a background function)
  // The processing will continue after this response
  setTimeout(async () => {
    try {
      const { base64Image, prompt } = JSON.parse(event.body);

      if (!base64Image || !prompt) {
        await store.set(jobId, JSON.stringify({
          status: 'failed',
          error: 'Missing image or prompt',
          completedAt: new Date().toISOString()
        }));
        return;
      }

      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_API_KEY) {
        await store.set(jobId, JSON.stringify({
          status: 'failed',
          error: 'OpenAI API key not configured',
          completedAt: new Date().toISOString()
        }));
        return;
      }

      console.log(`[${jobId}] Starting diagram processing...`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: prompt
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please analyze this user journey diagram and extract the journey data as JSON.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${jobId}] OpenAI API error:`, errorText);
        await store.set(jobId, JSON.stringify({
          status: 'failed',
          error: `OpenAI API error: ${response.status} ${response.statusText}`,
          completedAt: new Date().toISOString()
        }));
        return;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        await store.set(jobId, JSON.stringify({
          status: 'failed',
          error: 'No content in OpenAI response',
          completedAt: new Date().toISOString()
        }));
        return;
      }

      // Try to parse the JSON from the response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        await store.set(jobId, JSON.stringify({
          status: 'failed',
          error: 'Could not find JSON in AI response',
          completedAt: new Date().toISOString()
        }));
        return;
      }

      const jsonString = jsonMatch[1] || jsonMatch[0];
      const journey = JSON.parse(jsonString);

      console.log(`[${jobId}] Diagram processing completed successfully`);

      // Store successful result
      await store.set(jobId, JSON.stringify({
        status: 'completed',
        result: journey,
        completedAt: new Date().toISOString()
      }));

    } catch (error) {
      console.error(`[${jobId}] Processing error:`, error);
      await store.set(jobId, JSON.stringify({
        status: 'failed',
        error: error.message || 'Unknown error',
        completedAt: new Date().toISOString()
      }));
    }
  }, 0);

  // Return immediately with job ID
  return {
    statusCode: 202,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId })
  };
};
