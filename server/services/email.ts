import sgMail from '@sendgrid/mail';

const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  console.warn("SENDGRID_API_KEY not found. Email functionality will be disabled.");
} else {
  sgMail.setApiKey(apiKey);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('Email would be sent (SendGrid not configured):', params.subject);
    return false;
  }
  
  try {
    const emailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
    };
    
    if (params.text) emailData.text = params.text;
    if (params.html) emailData.html = params.html;
    
    await sgMail.send(emailData);
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

export function createPasswordResetEmailTemplate(
  caregiverName: string,
  resetUrl: string,
  expirationHours: number = 24
): { subject: string; html: string; text: string } {
  const subject = `Password Reset Request - Silver CareConnect`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e293b; margin: 0; font-size: 28px;">Silver CareConnect</h1>
          <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Secure Healthcare Communication</p>
        </div>
        
        <h2 style="color: #0f172a; margin-bottom: 20px;">Password Reset Request</h2>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Hello ${caregiverName},
        </p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          We received a request to reset your password for your Silver CareConnect caregiver account.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
            Reset Your Password
          </a>
        </div>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          This password reset link will expire in <strong>${expirationHours} hours</strong> for security reasons.
        </p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          If you did not request this password reset, please ignore this email. Your password will remain unchanged.
        </p>
        
        <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            <strong>Security Note:</strong> If you're having trouble clicking the button above, 
            copy and paste the following link into your web browser:
          </p>
          <p style="color: #3b82f6; font-size: 14px; word-break: break-all; margin: 10px 0;">
            ${resetUrl}
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            This is an automated message from Silver CareConnect.<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;
  
  const text = `
Silver CareConnect - Password Reset Request

Hello ${caregiverName},

We received a request to reset your password for your Silver CareConnect caregiver account.

To reset your password, click the following link:
${resetUrl}

This password reset link will expire in ${expirationHours} hours for security reasons.

If you did not request this password reset, please ignore this email. Your password will remain unchanged.

---
This is an automated message from Silver CareConnect.
Please do not reply to this email.
  `;
  
  return { subject, html, text };
}

export async function sendPasswordResetEmail(
  caregiverName: string,
  caregiverEmail: string,
  resetUrl: string
): Promise<boolean> {
  const { subject, html, text } = createPasswordResetEmailTemplate(
    caregiverName,
    resetUrl
  );

  return await sendEmail({
    to: caregiverEmail,
    from: 'tbweil40@gmail.com', // Your verified SendGrid sender
    subject,
    html,
    text
  });
}

export async function sendCaregiverWeeklyEmail(
  caregiverEmail: string,
  caregiverName: string,
  patientName: string,
  surveyUrl: string,
  weekStart: string,
  weekEnd: string,
  fromEmail: string = "tbweil40@gmail.com"
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