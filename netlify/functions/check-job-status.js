const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const jobId = event.queryStringParameters?.jobId;
  
  if (!jobId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing jobId parameter' })
    };
  }

  try {
    const store = getStore('ai-jobs');
    const jobData = await store.get(jobId);

    if (!jobData) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Job not found' })
      };
    }

    const job = JSON.parse(jobData);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job)
    };

  } catch (error) {
    console.error('Error checking job status:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

