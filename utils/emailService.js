const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send enquiry email
 */
async function sendEnquiryEmail(data) {
  try {
    const { user_name, user_email, user_phone, user_address, items = [], enquiry_id } = data;
    console.log(`user name ${user_name}, user email ${user_email}, user phone ${user_phone}, enquiry id ${enquiry_id} recieved in sendEnquiryEmail`);
    conole.log('Items:', items);
    console.log(` enviroment vaiables ${process.env.BUSINESS_NAME}, from : ${process.env.EMAIL_USER}, to : ${process.env.ADMIN_EMAIL}`);
    // Build HTML table for items
    const itemsTable = `
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th>Title</th>
            <th>Color/Texture</th>
            <th>Qty</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(i => `
            <tr>
              <td>${i.title}</td>
              <td>${i.selected_color_texture || '-'}</td>
              <td>${i.quantity}</td>
              <td>₹${i.price_at_time || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const mailOptions = {
      from: `"${process.env.BUSINESS_NAME}" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `🪑 New Enquiry from ${user_name} – ${enquiry_id}`,
      html: `
        <h2>New Customer Enquiry</h2>
        <p><strong>Name:</strong> ${user_name}</p>
        <p><strong>Email:</strong> ${user_email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${user_phone}</p>
        ${user_address ? `<p><strong>Address:</strong> ${user_address}</p>` : ''}
        <h3>Items:</h3>
        ${itemsTable}
        <p><strong>Enquiry ID:</strong> ${enquiry_id}</p>
        <hr>
        <small>This email was sent automatically via NodeMailer.</small>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Email error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendEnquiryEmail };
