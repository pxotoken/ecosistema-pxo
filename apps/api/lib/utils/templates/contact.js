/**
 * Contact email template sent to info@pxotoken.com
 * Optimized for Gmail and Outlook
 * @param {string} email - Sender's email address
 * @param {string} message - User's message
 * @returns {string} Email HTML
 */
export function getContactEmailTemplate(email, message) {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://pxotoken.com";

  return `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Nuevo mensaje de contacto</title>
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
                    
                    <!-- Intro text -->
                    <tr>
                      <td style="padding-bottom: 15px;">
                        <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.8; color: #555555;">
                          Un usuario ha completado el formulario de contacto en tu plataforma. A continuación encontrarás los detalles del mensaje:
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Divider -->
                    <tr>
                      <td style="padding: 10px 0 20px 0;">
                        <div style="border-top: 2px solid #dbeafe;"></div>
                      </td>
                    </tr>
                    
                    <!-- Email card -->
                    <tr>
                      <td>
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #eff6ff; border-left: 4px solid #1E3A8A; border-radius: 8px;" bgcolor="#eff6ff">
                          <tr>
                            <td style="padding: 18px 20px;">
                              <span style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: bold; color: #1E3A8A; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 10px;">EMAIL DEL REMITENTE:</span>
                              <span style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 500; color: #2c3e50;">${email}</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Message -->
                    <tr>
                      <td style="padding-top: 30px;">
                        <div style="padding-bottom: 15px;">
                          <span style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: bold; color: #1E3A8A; text-transform: uppercase; letter-spacing: 0.5px;">CONTENIDO DEL MENSAJE</span>
                        </div>
                        <div style="background-color: #ffffff; border: 2px solid #dbeafe; padding: 24px; border-radius: 12px;">
                          <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.8; color: #2c3e50; white-space: pre-wrap; word-wrap: break-word;">${message}</p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Button -->
                    <tr>
                      <td align="center" style="padding-top: 30px;">
                        <!--[if mso]>
                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="mailto:${email}" style="height:40px;v-text-anchor:middle;width:150px;" arcsize="15%" strokecolor="#1E3A8A" fillcolor="#1E3A8A">
                          <w:anchorlock/>
                          <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">Responder</center>
                        </v:roundrect>
                        <![endif]-->
                        <!--[if !mso]><!-->
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                          <tr>
                            <td style="background-color: #1E3A8A; border-radius: 6px; padding: 12px 24px;" bgcolor="#1E3A8A">
                              <a href="mailto:${email}" style="display: inline-block; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none;">Responder</a>
                            </td>
                          </tr>
                        </table>
                        <!--<![endif]-->
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td align="center" style="background-color: #1E3A8A; padding: 25px 30px; border-radius: 0 0 16px 16px; line-height: 1;" bgcolor="#1E3A8A">
                  <p style="margin: 0 0 12px 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; line-height: 1.4;">PXO Platform - Sistema de Contacto</p>
                  <p style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #ffffff; line-height: 1.4;">Para responder, envía un email a: <a href="mailto:${email}" style="color: #ffffff; font-weight: bold; text-decoration: none; background-color: rgba(255, 255, 255, 0.2); padding: 3px 8px; border-radius: 4px; display: inline-block;">${email}</a></p>
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

// /**
//  * Contact email template sent to info@pxotoken.com
//  * @param {string} email - Sender's email address
//  * @param {string} message - User's message
//  * @returns {string} Email HTML
//  */
// export function getContactEmailTemplate(email, message) {
//   // Base URL for production assets (Vercel)
//   const baseUrl = process.env.VERCEL_URL 
//     ? `https://${process.env.VERCEL_URL}` 
//     : 'https://pxotoken.com';
  
//   return `
//     <!DOCTYPE html>
//     <html>
//       <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <style>
//           * {
//             margin: 0;
//             padding: 0;
//             box-sizing: border-box;
//           }
//           body { 
//             font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
//             line-height: 1.6; 
//             color: #2c3e50; 
//             background: linear-gradient(135deg, #1E3A8A 0%, #1e40af 100%);
//             padding: 40px 20px;
//             min-height: 100vh;
//           }
//           .email-wrapper {
//             max-width: 600px;
//             margin: 0 auto;
//             min-height: 100%;
//           }
//           .container { 
//             background: white;
//             border-radius: 16px;
//             box-shadow: 0 20px 60px rgba(30, 58, 138, 0.4);
//           }
//           .header { 
//             background: linear-gradient(135deg, #1E3A8A 0%, #1e40af 100%);
//             color: white; 
//             padding: 25px 30px 20px;
//             text-align: center;
//             border-radius: 16px 16px 0 0;
//             overflow: hidden;
//           }
//           .logo {
//             max-width: 160px;
//             height: auto;
//             margin: 0 auto 12px auto;
//             filter: brightness(0) invert(1);
//             display: block;
//           }
//           .header h1 {
//             margin: 0;
//             font-size: 24px;
//             font-weight: 600;
//             letter-spacing: -0.5px;
//           }
//           .header p {
//             margin: 8px 0 0 0;
//             font-size: 15px;
//             opacity: 0.95;
//           }
//           .content { 
//             padding: 40px 30px; 
//           }
//           .welcome-text {
//             font-size: 16px;
//             color: #555;
//             margin-bottom: 30px;
//             line-height: 1.8;
//           }
//           .info-card {
//             background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
//             border-left: 4px solid #1E3A8A;
//             padding: 12px 20px;
//             margin: 20px 0 10px 0;
//             border-radius: 8px;
//             box-shadow: 0 2px 8px rgba(30, 58, 138, 0.15);
//             display: flex;
//             align-items: center;
//           }
//           .info-card-header {
//             display: flex;
//             align-items: center;
//             gap: 40px;
//             flex-wrap: wrap;
//           }
//           .info-card label {
//             font-weight: 600;
//             color: #1E3A8A;
//             font-size: 15px;
//             text-transform: uppercase;
//             letter-spacing: 0.5px;
//             line-height: 1.5;
//           }
//           .info-card .value {
//             color: #2c3e50;
//             font-size: 15px;
//             font-weight: 500;
//             line-height: 1.5;
//             padding-left: 15px;
//           }
//           .message-section {
//             margin: 30px 0;
//           }
//           .message-label {
//             font-weight: 600;
//             color: #1E3A8A;
//             display: flex;
//             align-items: center;
//             gap: 8px;
//             margin-bottom: 15px;
//             font-size: 14px;
//             text-transform: uppercase;
//             letter-spacing: 0.5px;
//           }
//           .message-box {
//             background: #ffffff;
//             border: 2px solid #dbeafe;
//             padding: 24px;
//             border-radius: 12px;
//             white-space: pre-wrap;
//             word-wrap: break-word;
//             font-size: 15px;
//             line-height: 1.8;
//             color: #2c3e50;
//             box-shadow: 0 2px 8px rgba(0,0,0,0.05);
//           }
//           .footer {
//             background: linear-gradient(135deg, #1E3A8A 0%, #1e40af 100%);
//             padding: 20px 30px;
//             text-align: center;
//             border-radius: 0 0 16px 16px;
//             overflow: hidden;
//           }
//           .footer p {
//             margin: 6px 0;
//             color: #ffffff;
//             font-size: 13px;
//             opacity: 0.95;
//           }
//           .footer .email-link {
//             color: #ffffff;
//             font-weight: 600;
//             text-decoration: none;
//             padding: 3px 8px;
//             background: rgba(255, 255, 255, 0.2);
//             border-radius: 4px;
//           }
//           .divider {
//             height: 1px;
//             background: linear-gradient(90deg, transparent, #1E3A8A, transparent);
//             margin: 30px 0;
//           }
//           .badge {
//             display: inline-flex;
//             align-items: center;
//             gap: 6px;
//             background: #1E3A8A;
//             color: #ffffff !important;
//             padding: 10px 20px;
//             border-radius: 6px;
//             font-size: 14px;
//             font-weight: 600;
//             text-decoration: none;
//           }
//           .button-container {
//             text-align: center;
//             margin: 15px 0 0;
//           }
//         </style>
//       </head>
//       <body>
//         <div class="email-wrapper">
//           <div class="container">
//             <div class="header">
//               <img src="${baseUrl}/LOGO_1.png" alt="PXO Token Logo" class="logo">
//             </div>
            
//             <div class="content">
//               <p class="welcome-text">
//                 Un usuario ha completado el formulario de contacto en tu plataforma. 
//                 A continuación encontrarás los detalles del mensaje:
//               </p>
              
//               <div class="divider"></div>
              
//               <div class="info-card">
//                 <div class="info-card-header">
//                   <label>
//                     Email del Remitente:
//                   </label>
//                   <span class="value">${email}</span>
//                 </div>
//               </div>
              
//               <div class="message-section">
//                 <div class="message-label">
//                   Contenido del Mensaje
//                 </div>
//                 <div class="message-box">${message}</div>
//               </div>
              
//               <div class="button-container">
//                 <a href="mailto:${email}" class="badge">
//                   Responder
//                 </a>
//               </div>
//             </div>
            
//             <div class="footer">
//               <p><strong>PXO Platform - Sistema de Contacto</strong></p>
//               <p style="margin-top: 15px;">
//                 Para responder, envía un email a: 
//                 <a href="mailto:${email}" class="email-link">${email}</a>
//               </p>
//             </div>
//           </div>
//         </div>
//       </body>
//     </html>
//   `;
// }
