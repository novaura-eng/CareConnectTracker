# Manual Survey Distribution Guide

## Quick Start - Send Surveys Today

### Step 1: Add Caregivers to Your System
1. Go to your admin dashboard: `/caregivers`
2. Click "Add New Caregiver"
3. Enter: Name, Phone, Email, Patient Name
4. Save each caregiver

### Step 2: Create Survey Links
- Each caregiver gets a unique survey link
- Format: `https://workspace.tim692.replit.dev/survey/[ID]`
- You can create these manually or use the admin dashboard

### Step 3: Send via Email/Text
Copy this message template and send to caregivers:

```
Hi [Caregiver Name],

Time for your weekly check-in for [Patient Name].

Please complete this 5-minute survey about their health and safety:
[Survey Link]

The survey covers:
- Hospital visits
- Accidents or falls
- Health changes
- Address changes
- General concerns

Complete by Sunday. Contact us with urgent issues.

- Silver CareConnect Team
```

### Step 4: Track Responses
- Admin dashboard shows completion status
- View all responses in `/admin`
- Export data as needed

## Google Sheets Integration (Optional)

### Create a tracking sheet with columns:
- Caregiver Name
- Patient Name  
- Phone Number
- Email
- Survey Link
- Status (Sent/Completed)
- Week of [Date]

### Weekly Process:
1. Update your Google Sheet with active caregivers
2. Generate survey links for each
3. Send messages (email/text) manually
4. Mark as "Sent" in your sheet
5. Check admin dashboard for completions
6. Mark as "Completed" in your sheet

This gives you full control while building toward automation.