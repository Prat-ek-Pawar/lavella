// services/EmailService.js
const nodemailer = require("nodemailer");
require("dotenv").config();

class EmailService {
  constructor() {
    // --- Explicit SMTP configuration with detailed logging ---
    console.log("📌 Initializing EmailService...");
    console.log("SMTP Host:", process.env.SMTP_HOST || "smtp.gmail.com");
    console.log("SMTP Port:", process.env.SMTP_PORT || 465);
    console.log("Secure (SSL/TLS):", process.env.SMTP_PORT == 465);
    console.log("Email User:", process.env.EMAIL_USER);

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_PORT == 465, // true for SSL/TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      logger: true,       // enable Nodemailer logger
      debug: true,        // show connection info
      connectionTimeout: 30000,
      greetingTimeout: 20000,
      socketTimeout: 30000,
    });
  }

  // ---------------------------------------------------
  // ✅ Test SMTP connection
  // ---------------------------------------------------
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log("✅ Email service connected successfully.");
      return true;
    } catch (error) {
      console.error("❌ Email service connection failed:");
      console.error(error);
      if (error.code === "ETIMEDOUT") {
        console.error(
          "⚠️ Timeout — your server may be blocking outgoing SMTP connections."
        );
      }
      if (error.responseCode) {
        console.error("SMTP Response Code:", error.responseCode);
      }
      return false;
    }
  }

  // ---------------------------------------------------
  // ✅ Send enquiry email
  // ---------------------------------------------------
  async sendEnquiryEmail(enquiryData) {
    const { user_name, user_phone, user_email, user_address, items, enquiry_id } =
      enquiryData;

    console.log("📌 Preparing email for enquiry:", enquiry_id);
    console.log("Customer:", user_name, user_email, user_phone);

    let itemsHtml = "";
    items.forEach((it, i) => {
      itemsHtml += `
        <tr>
          <td style="padding:10px;border:1px solid #ddd">${i + 1}</td>
          <td style="padding:10px;border:1px solid #ddd">${it.title}</td>
          <td style="padding:10px;border:1px solid #ddd">${it.selected_color_texture || "N/A"}</td>
          <td style="padding:10px;border:1px solid #ddd">${it.quantity || 1}</td>
          <td style="padding:10px;border:1px solid #ddd">${it.price_at_time ? `₹${it.price_at_time}` : "Price on request"}</td>
        </tr>`;
    });

    const html = `<html>...same as your previous template...</html>`; // Keep your template here

    const mailOptions = {
      from: `sometimesuse4912@gmail.com`,
      to: process.env.OWNER_EMAIL || process.env.EMAIL_USER,
      subject: `New Enquiry from ${user_name} – ${enquiry_id}`,
      html,
      text: this.getPlainTextVersion(enquiryData),
    };

    console.log("📌 Mail options ready:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log("📩 Email sent successfully:", result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("❌ Email sending failed:");
      console.error(error);
      if (error.code === "ETIMEDOUT") {
        console.error(
          "⚠️ Timeout occurred — network or host may be blocking SMTP connections."
        );
      }
      throw error;
    }
  }

  // ---------------------------------------------------
  // Plain text fallback
  // ---------------------------------------------------
  getPlainTextVersion({ user_name, user_phone, user_email, user_address, items, enquiry_id }) {
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
Automated email from Furnishing Catalogue System`;
  }
}

module.exports = new EmailService();
