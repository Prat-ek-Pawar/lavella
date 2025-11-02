const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendEnquiryEmail(enquiryData) {
    try {
      const { user_name, user_phone, user_email, user_address, items, enquiry_id } = enquiryData;

      // Build items list for email
      let itemsHtml = '';
      items.forEach((item, index) => {
        itemsHtml += `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${index + 1}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${item.title}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${item.selected_color_texture || 'N/A'}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${item.quantity}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${item.price_at_time ? `₹${item.price_at_time}` : 'Price on request'}</td>
          </tr>
        `;
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .customer-info { background: white; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            .products-table { width: 100%; border-collapse: collapse; background: white; }
            .products-table th { background: #4CAF50; color: white; padding: 10px; text-align: left; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Enquiry Received!</h1>
            </div>
            <div class="content">
              <div class="customer-info">
                <h2>Customer Details</h2>
                <p><strong>Name:</strong> ${user_name}</p>
                <p><strong>Phone:</strong> ${user_phone}</p>
                <p><strong>Email:</strong> ${user_email || 'Not provided'}</p>
                <p><strong>Address:</strong> ${user_address || 'Not provided'}</p>
                <p><strong>Enquiry ID:</strong> ${enquiry_id}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <h2>Products Enquired</h2>
              <table class="products-table">
                <thead>
                  <tr>
                    <th>Sr.</th>
                    <th>Product</th>
                    <th>Color/Texture</th>
                    <th>Quantity</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>
            <div class="footer">
              <p>This is an automated email from your Furnishing Catalogue System</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"${process.env.BUSINESS_NAME || 'Furnishing Store'}" <${process.env.EMAIL_USER}>`,
        to: process.env.OWNER_EMAIL || process.env.EMAIL_USER,
        subject: `New Enquiry from ${user_name} - ${enquiry_id}`,
        html: htmlContent,
        text: this.getPlainTextVersion(enquiryData)
      };

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }

  getPlainTextVersion(enquiryData) {
    const { user_name, user_phone, user_email, user_address, items, enquiry_id } = enquiryData;
    
    let itemsList = '';
    items.forEach((item, index) => {
      itemsList += `
        ${index + 1}. ${item.title}
        - Color/Texture: ${item.selected_color_texture || 'N/A'}
        - Quantity: ${item.quantity}
        - Price: ${item.price_at_time ? `₹${item.price_at_time}` : 'Price on request'}
      `;
    });

    return `
      NEW ENQUIRY RECEIVED
      
      Customer Details:
      Name: ${user_name}
      Phone: ${user_phone}
      Email: ${user_email || 'Not provided'}
      Address: ${user_address || 'Not provided'}
      
      Enquiry ID: ${enquiry_id}
      Date: ${new Date().toLocaleString()}
      
      Products Enquired:
      ${itemsList}
      
      ---
      This is an automated email from your Furnishing Catalogue System
    `;
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service is ready');
      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }
}

module.exports = new EmailService();