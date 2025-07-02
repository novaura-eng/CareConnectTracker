import { MailService } from '@sendgrid/mail';

const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(apiKey);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const emailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
    };
    
    if (params.text) emailData.text = params.text;
    if (params.html) emailData.html = params.html;
    
    await mailService.send(emailData);
    return true;
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    if (error.response?.body?.errors) {
      console.error('SendGrid error details:', error.response.body.errors);
    }
    return false;
  }
}

export function createCaregiverEmailTemplate(
  caregiverName: string,
  patientName: string,
  surveyUrl: string,
  weekStart: string,
  weekEnd: string
): { subject: string; html: string; text: string } {
  const subject = `Weekly Check-in Required - ${patientName}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e293b; margin: 0; font-size: 28px;">Silver CareConnect</h1>
          <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Powered by TrustNet CareFlow</p>
        </div>
        
        <h2 style="color: #0f172a; margin-bottom: 20px;">Weekly Check-in Required</h2>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Hello ${caregiverName},
        </p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          It's time for your weekly check-in for <strong>${patientName}</strong> 
          (Week of ${weekStart} - ${weekEnd}).
        </p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Please complete the brief 6-question survey about ${patientName}'s health and safety. 
          This helps us ensure the best possible care and support.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${surveyUrl}" 
             style="background-color: #3b82f6; color: white; padding: 15px 30px; 
                    text-decoration: none; border-radius: 8px; font-weight: bold; 
                    font-size: 16px; display: inline-block;">
            Complete Survey
          </a>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #0f172a; margin: 0 0 15px 0; font-size: 18px;">Survey includes questions about:</h3>
          <ul style="color: #475569; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Hospital visits or emergency room visits</li>
            <li>Accidents, falls, or injuries</li>
            <li>Mental health changes</li>
            <li>Physical health changes</li>
            <li>Address or living situation changes</li>
            <li>General feedback and concerns</li>
          </ul>
        </div>
        
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          <strong>Important:</strong> Please complete this survey by the end of the week. 
          If you have any urgent concerns, contact your care coordinator immediately.
        </p>
        
        <hr style="border: none; height: 1px; background-color: #e2e8f0; margin: 30px 0;">
        
        <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
          Silver CareConnect - Supporting Connecticut home care families<br>
          Powered by TrustNet CareFlow
        </p>
      </div>
    </div>
  `;
  
  const text = `
Silver CareConnect - Weekly Check-in Required

Hello ${caregiverName},

It's time for your weekly check-in for ${patientName} (Week of ${weekStart} - ${weekEnd}).

Please complete the brief 6-question survey about ${patientName}'s health and safety.

Survey Link: ${surveyUrl}

The survey includes questions about:
- Hospital visits or emergency room visits
- Accidents, falls, or injuries  
- Mental health changes
- Physical health changes
- Address or living situation changes
- General feedback and concerns

Please complete this survey by the end of the week. If you have any urgent concerns, contact your care coordinator immediately.

Silver CareConnect - Supporting Connecticut home care families
Powered by TrustNet CareFlow
  `;
  
  return { subject, html, text };
}

export async function sendCaregiverWeeklyEmail(
  caregiverEmail: string,
  caregiverName: string,
  patientName: string,
  surveyUrl: string,
  weekStart: string,
  weekEnd: string,
  fromEmail: string = "test@example.com"
): Promise<boolean> {
  const { subject, html, text } = createCaregiverEmailTemplate(
    caregiverName,
    patientName,
    surveyUrl,
    weekStart,
    weekEnd
  );
  
  return await sendEmail({
    to: caregiverEmail,
    from: fromEmail,
    subject,
    html,
    text
  });
}