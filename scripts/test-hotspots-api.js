const fetch = require('node-fetch');

async function testHotspotsAPI() {
  try {
    console.log('Testing hotspots API...');
    
    // This will fail due to auth, but we can see the response
    const response = await fetch('http://localhost:3000/api/hotspots?days=7&limit=10&minConfidence=50');
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testHotspotsAPI();