const { transactionalEmailsApi, SibApiV3Sdk } = require('../../../config/brevoConfig');
const { passwordVerfication } = require('../../../emailTemplate/emailVerfication');

const sendMail = async ({ email, name, link, subject = "Verify your email"}) => {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.to = [{ email }];
  sendSmtpEmail.sender = { 
  name: "Make A Difference", 
  email: "no-reply@makeadiff.in" 
  };
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = passwordVerfication({ name, link });

  try {
    const data = await transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Email sent:", data);
    return data;
  } catch (error) {
    console.error("❌ Brevo sendMail error:", error.response?.text || error.message);
    throw error;
  }
};

module.exports = sendMail;