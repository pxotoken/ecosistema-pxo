/**
 * Notification email template for broadcast messages
 * Optimized for Gmail and Outlook
 * @param message - Notification message content
 * @param firstName - User's first name for personalization (optional)
 * @returns Email HTML
 */
export function getNotificationEmailTemplate(message: string, firstName: string = ''): string {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://pxotoken.com";

  const greeting = firstName ? `Hola ${firstName}` : 'Hola';

  return `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Notificación de PXO Platform</title>
      <!--[if mso]>
      <style type="text/css">
        body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
      <!--[if mso]>
      <center>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0">
      <tr><td>
      <![endif]-->
      
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden;" bgcolor="#ffffff">
              
              <!-- Header -->
              <tr>
                <td align="center" style="background-color: #1E3A8A; padding: 30px; border-radius: 16px 16px 0 0;" bgcolor="#1E3A8A">
                  <img src="${baseUrl}/LOGO_1.png" alt="PXO Token" width="160" style="display: block; margin: 0 auto; border: 0; filter: brightness(0) invert(1); -ms-interpolation-mode: bicubic;" />
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    
                    <!-- Greeting -->
                    <tr>
                      <td style="padding-bottom: 20px;">
                        <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 600; color: #2c3e50;">
                          ${greeting},
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Divider -->
                    <tr>
                      <td style="padding: 10px 0 20px 0;">
                        <div style="border-top: 2px solid #dbeafe;"></div>
                      </td>
                    </tr>
                    
                    <!-- Message -->
                    <tr>
                      <td>
                        <div style="background-color: #ffffff; border: 2px solid #dbeafe; padding: 24px; border-radius: 12px;">
                          <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.8; color: #2c3e50; white-space: pre-wrap; word-wrap: break-word;">${message}</p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Signature -->
                    <tr>
                      <td style="padding-top: 35px; border-top: 1px solid #e5e7eb; margin-top: 30px;">
                        <p style="margin: 0 0 10px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #666666;">
                          Saludos,
                        </p>
                        <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 600; color: #1E3A8A;">
                          El equipo de PXO Platform
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td align="center" style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb; line-height: 1;" bgcolor="#f9fafb">
                  <p style="margin: 0 0 8px 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #6b7280; line-height: 1.4;">
                    Este es un mensaje automático de PXO Platform
                  </p>
                  <p style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #9ca3af; line-height: 1.4;">
                    © ${new Date().getFullYear()} PXO Platform. Todos los derechos reservados.
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
      
      <!--[if mso]>
      </td></tr>
      </table>
      </center>
      <![endif]-->
    </body>
  </html>`;
}
