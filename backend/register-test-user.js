const axios = require('axios');

async function registerTestUser() {
  try {
    const response = await axios.post('https://dev-api.unitedwerise.org/api/auth/register', {
      email: 'layer4test@example.com',
      password: 'TestPassword123!',
      username: 'layer4test',
      firstName: 'Layer',
      lastName: 'Test'
    });
    console.log('✓ User registered successfully');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response?.data) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

registerTestUser();
