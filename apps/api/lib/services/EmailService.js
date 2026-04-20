import { getResendClient, EMAIL_CONFIG } from '../resend.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { getServerSupabase } from '../supabase.js';
import { getNotificationEmailTemplate } from '../utils/templates/notification.ts';

export class EmailService {
  constructor() {
    this.resend = getResendClient();
    this.supabase = getServerSupabase();
    this.userRepository = new UserRepository(this.supabase);
  }

  /**
   * Send a generic email
   * @param {Object} params - Email parameters
   * @param {string} params.to - Recipient email address
   * @param {string} params.subject - Email subject
   * @param {string} params.html - HTML content of the email
   * @param {string} [params.from] - Sender email address (optional, uses environment variable if not provided)
   * @returns {Promise<Object>} Send result
   */
  async sendEmail({ to, subject, html, from }) {
    if (!this.resend) {
      throw new Error('Email service not configured');
    }

    try {
      const fromEmail = from || `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.fromEmail}>`;

      const result = await this.resend.emails.send({
        from: fromEmail,
        to,
        subject,
        html,
        reply_to: EMAIL_CONFIG.replyTo,
      });
      
      return { success: true, id: result.id };
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Generate HTML template for broadcast email
   * @param {string} message - The message content
   * @param {string} firstName - User's first name for personalization
   * @returns {string} HTML email template
   */
  getBroadcastEmailTemplate(message, firstName = '') {
    return getNotificationEmailTemplate(message, firstName);
  }

  /**
   * Send broadcast email to all active users
   * @param {string} subject - Email subject
   * @param {string} message - Message content
   * @returns {Promise<Object>} Results with success and failure counts
   */
  async sendBroadcastEmail(subject, message) {
    try {
      const activeUsers = await this.userRepository.getAllActiveUsers();
      
      if (!activeUsers || activeUsers.length === 0) {
        return {
          success: true,
          totalUsers: 0,
          sent: 0,
          failed: 0,
          errors: []
        };
      }

      const results = {
        totalUsers: activeUsers.length,
        sent: 0,
        failed: 0,
        errors: []
      };

      // Send email to each user
      for (const user of activeUsers) {
        try {
          const html = this.getBroadcastEmailTemplate(message, user.first_name);
          
          await this.sendEmail({
            to: user.mail,
            subject,
            html
          });

          results.sent++;

          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          results.failed++;
          results.errors.push({
            email: user.mail,
            error: error.message
          });
          console.error(`❌ Failed to send email to ${user.mail}:`, error.message);
        }
      }

      return {
        success: true,
        ...results
      };

    } catch (error) {
      console.error('❌ Error in broadcast email service:', error);
      throw new Error(`Failed to send broadcast email: ${error.message}`);
    }
  }

  /**
   * Send broadcast email to a specific list of email addresses
   * @param {string} subject - Email subject
   * @param {string} message - Message content
   * @param {string[]} emails - Array of email addresses
   * @returns {Promise<Object>} Results with success and failure counts
   */
  async sendBroadcastToEmails(subject, message, emails) {
    const results = {
      totalUsers: emails.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const email of emails) {
      try {
        const html = this.getBroadcastEmailTemplate(message);
        
        await this.sendEmail({
          to: email,
          subject,
          html
        });

        results.sent++;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.failed++;
        results.errors.push({
          email,
          error: error.message
        });
        console.error(`❌ Failed to send email to ${email}:`, error.message);
      }
    }

    return {
      success: true,
      ...results
    };
  }
}
