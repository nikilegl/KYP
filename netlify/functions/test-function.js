// Simple test function to verify Netlify functions are deploying

export async function handler(event) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: 'Functions are working!',
      timestamp: new Date().toISOString(),
      env: {
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY
      }
    })
  }
}

