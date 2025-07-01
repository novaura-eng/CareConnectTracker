import cron from 'node-cron';
import { storage } from '../storage';
import { smsService } from './sms';

class SchedulerService {
  constructor() {
    this.setupWeeklyCheckInSchedule();
  }

  private setupWeeklyCheckInSchedule() {
    // Run every Monday at 9 AM
    cron.schedule('0 9 * * 1', async () => {
      console.log('Running weekly check-in creation job...');
      await this.createWeeklyCheckIns();
    });

    // Send reminders on Wednesday at 2 PM for incomplete check-ins
    cron.schedule('0 14 * * 3', async () => {
      console.log('Running weekly reminder job...');
      await this.sendWeeklyReminders();
    });

    // Final reminders on Friday at 4 PM
    cron.schedule('0 16 * * 5', async () => {
      console.log('Running final reminder job...');
      await this.sendFinalReminders();
    });
  }

  private async createWeeklyCheckIns() {
    try {
      const caregivers = await storage.getAllCaregivers();
      const currentDate = new Date();
      
      // Get Monday of current week
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      
      // Get Sunday of current week
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      for (const caregiver of caregivers) {
        const patients = await storage.getPatientsByCaregiver(caregiver.id);
        
        for (const patient of patients) {
          // Check if check-in already exists for this week
          const existingCheckIns = await storage.getCheckInsForWeek(weekStart, weekEnd);
          const exists = existingCheckIns.some(
            ci => ci.checkIn.caregiverId === caregiver.id && ci.checkIn.patientId === patient.id
          );

          if (!exists) {
            const checkIn = await storage.createWeeklyCheckIn({
              caregiverId: caregiver.id,
              patientId: patient.id,
              weekStartDate: weekStart,
              weekEndDate: weekEnd,
              isCompleted: false,
              remindersSent: 0,
            });

            // Send initial SMS
            const surveyUrl = `${process.env.SURVEY_BASE_URL || 'http://localhost:5000'}/survey/${checkIn.id}`;
            await smsService.sendWeeklyCheckInReminder(
              caregiver.phone,
              caregiver.name,
              patient.name,
              surveyUrl
            );

            console.log(`Created weekly check-in for ${caregiver.name} - ${patient.name}`);
          }
        }
      }
    } catch (error) {
      console.error('Error creating weekly check-ins:', error);
    }
  }

  private async sendWeeklyReminders() {
    try {
      const pendingCheckIns = await storage.getPendingCheckIns();
      
      for (const item of pendingCheckIns) {
        if (item.checkIn.remindersSent < 2) {
          const surveyUrl = `${process.env.SURVEY_BASE_URL || 'http://localhost:5000'}/survey/${item.checkIn.id}`;
          
          await smsService.sendWeeklyCheckInReminder(
            item.caregiver.phone,
            item.caregiver.name,
            item.patient.name,
            surveyUrl
          );

          // Update reminder count (this would need to be added to storage interface)
          console.log(`Sent reminder to ${item.caregiver.name} for ${item.patient.name}`);
        }
      }
    } catch (error) {
      console.error('Error sending weekly reminders:', error);
    }
  }

  private async sendFinalReminders() {
    try {
      const pendingCheckIns = await storage.getPendingCheckIns();
      
      for (const item of pendingCheckIns) {
        if (item.checkIn.remindersSent < 3) {
          const surveyUrl = `${process.env.SURVEY_BASE_URL || 'http://localhost:5000'}/survey/${item.checkIn.id}`;
          
          await smsService.sendWeeklyCheckInReminder(
            item.caregiver.phone,
            item.caregiver.name,
            item.patient.name,
            surveyUrl
          );

          console.log(`Sent final reminder to ${item.caregiver.name} for ${item.patient.name}`);
        }
      }
    } catch (error) {
      console.error('Error sending final reminders:', error);
    }
  }
}

export const schedulerService = new SchedulerService();
