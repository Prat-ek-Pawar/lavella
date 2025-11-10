// testEnquiry.js
const axios = require('axios');

async function sendTestEnquiry() {
  try {
    const response = await axios.post('https://lavella-backend.onrender.com/api/enquiry', {
      user_name: "John Doe",
      user_phone: "9876543210",
      user_email: "john@example.com",
      user_address: "123 Lavella Street, Pune",
      items: [
        { title: "Luxury Sofa", quantity: 1, price_at_time: 25999 },
        { title: "Velvet Cushion", quantity: 4, price_at_time: 499 }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Response:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response ? error.response.data : error.message);
  }
}

sendTestEnquiry();
