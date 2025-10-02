import twilio from 'twilio';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error('Twilio not connected');
  }
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
  };
}

async function getTwilioClient() {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  return twilio(apiKey, apiKeySecret, {
    accountSid: accountSid
  });
}

async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
}

class SMSService {
  async sendWeeklyCheckInReminder(
    phoneNumber: string, 
    caregiverName: string, 
    patientName: string, 
    surveyUrl: string
  ): Promise<void> {
    try {
      const client = await getTwilioClient();
      const fromNumber = await getTwilioFromPhoneNumber();
      
      const message = `Hello ${caregiverName}, it's time for your weekly check-in for ${patientName}. Please complete your survey: ${surveyUrl}`;

      await client.messages.create({
        body: message,
        from: fromNumber,
        to: phoneNumber,
      });
      
      console.log(`SMS sent successfully to ${phoneNumber}`);
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  async sendConfirmation(phoneNumber: string, caregiverName: string): Promise<void> {
    try {
      const client = await getTwilioClient();
      const fromNumber = await getTwilioFromPhoneNumber();
      
      const message = `Thank you ${caregiverName}! Your weekly check-in has been received. We appreciate your dedication to quality care.`;

      await client.messages.create({
        body: message,
        from: fromNumber,
        to: phoneNumber,
      });
      
      console.log(`Confirmation SMS sent successfully to ${phoneNumber}`);
    } catch (error) {
      console.error('Error sending confirmation SMS:', error);
      throw error;
    }
  }

  async sendCustomMessage(phoneNumber: string, message: string): Promise<void> {
    try {
      const client = await getTwilioClient();
      const fromNumber = await getTwilioFromPhoneNumber();

      await client.messages.create({
        body: message,
        from: fromNumber,
        to: phoneNumber,
      });
      
      console.log(`Custom SMS sent successfully to ${phoneNumber}`);
    } catch (error) {
      console.error('Error sending custom SMS:', error);
      throw error;
    }
  }
}

export const smsService = new SMSService();
