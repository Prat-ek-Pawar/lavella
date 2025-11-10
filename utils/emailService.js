// services/EmailService.js
const nodemailer = require("nodemailer");
require("dotenv").config(); // Make sure .env is loaded before using variables

class EmailService {
  constructor() {
    // ✅ Use explicit Gmail SMTP configuration (avoids timeout & detection issues)
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true = SSL/TLS, required for port 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 20000,
      socketTimeout: 30000,
    });
  }

  // ---------------------------------------------------
  // ✅ Test connection
  // ---------------------------------------------------
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log("✅ Email service connected successfully.");
      return true;
    } catch (error) {
      console.error("❌ Email service connection failed:", error.message);
      if (error.code === "ETIMEDOUT") {
        console.error(
          "⚠️ Connection timed out. This usually means your server cannot reach smtp.gmail.com on port 465."
        );
      }
      return false;
    }
  }

  // ---------------------------------------------------
  // ✅ Send enquiry email
  // ---------------------------------------------------
  async sendEnquiryEmail(enquiryData) {
    const {
      user_name,
      user_phone,
      user_email,
      user_address,
      items,
      enquiry_id,
    } = enquiryData;

    let itemsHtml = "";
    items.forEach((it, i) => {
      itemsHtml += `
        <tr>
          <td style="padding:10px;border:1px solid #ddd">${i + 1}</td>
          <td style="padding:10px;border:1px solid #ddd">${it.title}</td>
          <td style="padding:10px;border:1px solid #ddd">${
            it.selected_color_texture || "N/A"
          }</td>
          <td style="padding:10px;border:1px solid #ddd">${
            it.quantity || 1
          }</td>
          <td style="padding:10px;border:1px solid #ddd">${
            it.price_at_time ? `₹${it.price_at_time}` : "Price on request"
          }</td>
        </tr>`;
    });

    const html = `
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
    <div class="header"><h1>New Enquiry Received!</h1></div>
    <div class="content">
      <div class="customer-info">
        <h2>Customer Details</h2>
        <p><strong>Name:</strong> ${user_name}</p>
        <p><strong>Phone:</strong> ${user_phone}</p>
        <p><strong>Email:</strong> ${user_email || "Not provided"}</p>
        <p><strong>Address:</strong> ${user_address || "Not provided"}</p>
        <p><strong>Enquiry ID:</strong> ${enquiry_id}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <h2>Products Enquired</h2>
      <table class="products-table">
        <thead>
          <tr><th>Sr.</th><th>Product</th><th>Color/Texture</th><th>Quantity</th><th>Price</th></tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>
    <div class="footer">
      This is an automated email from your Furnishing Catalogue System
    </div>
  </div>
</body>
</html>`;

    const mailOptions = {
      from: `"${process.env.BUSINESS_NAME || "Furnishing Store"}" <${
        process.env.EMAIL_USER
      }>`,
      to: process.env.OWNER_EMAIL || process.env.EMAIL_USER,
      subject: `New Enquiry from ${user_name} – ${enquiry_id}`,
      html,
      text: this.getPlainTextVersion(enquiryData),
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log("📩 Email sent successfully:", result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("❌ Email sending failed:", error.message);
      if (error.code === "ETIMEDOUT") {
        console.error(
          "⚠️ Timeout occurred — your network or host may be blocking outgoing SMTP connections."
        );
      }
      throw error;
    }
  }

  // ---------------------------------------------------
  // ✅ Fallback plain text version
  // ---------------------------------------------------
  getPlainTextVersion({
    user_name,
    user_phone,
    user_email,
    user_address,
    items,
    enquiry_id,
  }) {
    let itemsList = "";
    items.forEach((it, i) => {
      itemsList += `
${i + 1}. ${it.title}
   Color/Texture: ${it.selected_color_texture || "N/A"}
   Quantity: ${it.quantity || 1}
   Price: ${it.price_at_time ? `₹${it.price_at_time}` : "Price on request"}`;
    });

    return `NEW ENQUIRY RECEIVED

Customer Details:
Name: ${user_name}
Phone: ${user_phone}
Email: ${user_email || "Not provided"}
Address: ${user_address || "Not provided"}

Enquiry ID: ${enquiry_id}
Date: ${new Date().toLocaleString()}

Products Enquired:
${itemsList}

---
This is an automated email from your Furnishing Catalogue System`;
  }
}

module.exports = new EmailService();
