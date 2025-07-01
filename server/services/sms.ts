import twilio from 'twilio';

class SMSService {
  private client: twilio.Twilio;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      console.warn('Twilio credentials not found. SMS functionality will be disabled.');
      this.client = null as any;
      return;
    }

    this.client = twilio(accountSid, authToken);
  }

  async sendWeeklyCheckInReminder(
    phoneNumber: string, 
    caregiverName: string, 
    patientName: string, 
    surveyUrl: string
  ): Promise<void> {
    if (!this.client) {
      console.log(`SMS would be sent to ${phoneNumber}: Weekly check-in reminder for ${patientName}`);
      return;
    }

    const message = `Hello ${caregiverName}, it's time for your weekly check-in for ${patientName}. Please complete your survey: ${surveyUrl}`;

    try {
      await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
      
      console.log(`SMS sent successfully to ${phoneNumber}`);
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  async sendConfirmation(phoneNumber: string, caregiverName: string): Promise<void> {
    if (!this.client) {
      console.log(`Confirmation SMS would be sent to ${phoneNumber}`);
      return;
    }

    const message = `Thank you ${caregiverName}! Your weekly check-in has been received. We appreciate your dedication to quality care.`;

    try {
      await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
      
      console.log(`Confirmation SMS sent successfully to ${phoneNumber}`);
    } catch (error) {
      console.error('Error sending confirmation SMS:', error);
      throw error;
    }
  }
}

export const smsService = new SMSService();
