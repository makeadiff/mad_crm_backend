exports.passwordVerfication = ({
  title = 'Reset your Password',
  name = '',
  link = '',
  time = new Date(),
}) => {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <title>${title}</title>
    </head>
    <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f4f7; color:#333;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f4f7">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="margin:30px auto; padding:20px; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding:20px 0;">
                  <img src="https://makeadiff.in/images/mad-logo.png" alt="Make A Difference" width="150" style="display:block;" />
                </td>
              </tr>

              <!-- Title -->
              <tr>
                <td align="center" style="padding:10px 0;">
                  <h2 style="margin:0; font-size:22px; color:#222;">${title}</h2>
                </td>
              </tr>

              <tr>
                <td>
                  <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />
                </td>
              </tr>

              <!-- Greeting -->
              <tr>
                <td style="font-size:16px; line-height:24px; padding:0 20px;">
                  <p>Hello <strong>${name}</strong>,</p>
                  <p>We have received a request to reset the password for your account on <strong>Make A Difference</strong>. To proceed, please click the button below:</p>
                </td>
              </tr>

              <!-- Button -->
              <tr>
                <td align="center" style="padding:30px;">
                  <a href="${link}" 
                     style="background-color:#ff6f00; color:#fff; text-decoration:none; padding:12px 24px; border-radius:6px; font-size:16px; font-weight:bold; display:inline-block;">
                    Reset My Password
                  </a>
                </td>
              </tr>

              <!-- Notes -->
              <tr>
                <td style="font-size:14px; line-height:20px; padding:0 20px; color:#666;">
                  <p>If you didn’t request a password reset, please ignore this email. This link will expire in 24 hours for security reasons.</p>
                  <p style="margin-top:20px;">Thank you,<br/><strong>The Make A Difference Team</strong></p>
                </td>
              </tr>

              <p style="font-size:12px; color:#999;">
                  This is an automated message sent from a no-reply address. Please do not reply to this email. 
                  If you need help, contact us at <a href="mailto:support@makeadiff.in">support@makeadiff.in</a>.
              </p>

              <!-- Footer -->
              <tr>
                <td align="center" style="padding:20px; font-size:12px; color:#999;">
                  <p>© ${new Date().getFullYear()} Make A Difference. All rights reserved.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};
