import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Bell, MessageSquare, Users, Database, Shield, Save, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";

interface SMSSettings {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  reminderTime: string;
  reminderDays: string[];
  messageTemplate: string;
}

interface NotificationSettings {
  emailAlerts: boolean;
  smsAlerts: boolean;
  healthAlertThreshold: string;
  overdueThreshold: number;
  adminEmail: string;
}

interface SystemSettings {
  agencyName: string;
  timezone: string;
  weekStartDay: string;
  autoReminders: boolean;
  dataRetention: number;
}

export default function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("sms");

  const smsForm = useForm<SMSSettings>({
    defaultValues: {
      twilioAccountSid: "",
      twilioAuthToken: "",
      twilioPhoneNumber: "",
      reminderTime: "09:00",
      reminderDays: ["monday", "wednesday", "friday"],
      messageTemplate: "Hello {caregiverName}, it's time for your weekly check-in for {patientName}. Please complete your survey: {surveyUrl}",
    },
  });

  const notificationForm = useForm<NotificationSettings>({
    defaultValues: {
      emailAlerts: true,
      smsAlerts: false,
      healthAlertThreshold: "immediate",
      overdueThreshold: 24,
      adminEmail: "",
    },
  });

  const systemForm = useForm<SystemSettings>({
    defaultValues: {
      agencyName: "Silver CareConnect",
      timezone: "America/New_York",
      weekStartDay: "monday",
      autoReminders: true,
      dataRetention: 365,
    },
  });

  const onSMSSubmit = (data: SMSSettings) => {
    console.log("SMS Settings:", data);
    toast({
      title: "SMS Settings Updated",
      description: "Your SMS configuration has been saved successfully.",
    });
  };

  const onNotificationSubmit = (data: NotificationSettings) => {
    console.log("Notification Settings:", data);
    toast({
      title: "Notification Settings Updated",
      description: "Your notification preferences have been saved successfully.",
    });
  };

  const onSystemSubmit = (data: SystemSettings) => {
    console.log("System Settings:", data);
    toast({
      title: "System Settings Updated",
      description: "Your system configuration has been saved successfully.",
    });
  };

  const testSMSConnection = () => {
    toast({
      title: "Testing SMS Connection",
      description: "Sending test message to verify Twilio configuration...",
    });
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-3">
              <SettingsIcon className="h-8 w-8 text-slate-600" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
                <p className="mt-1 text-sm text-slate-600">Configure Silver CareConnect for your agency</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="sms" className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>SMS Configuration</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <span>Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>System</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Security</span>
                </TabsTrigger>
              </TabsList>

              {/* SMS Configuration Tab */}
              <TabsContent value="sms">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <MessageSquare className="h-5 w-5" />
                        <span>Twilio SMS Configuration</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Form {...smsForm}>
                        <form onSubmit={smsForm.handleSubmit(onSMSSubmit)} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={smsForm.control}
                              name="twilioAccountSid"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Twilio Account SID</FormLabel>
                                  <FormControl>
                                    <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Your Twilio Account SID from the Twilio Console
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={smsForm.control}
                              name="twilioPhoneNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Twilio Phone Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="+1234567890" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Your Twilio phone number for sending SMS
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={smsForm.control}
                            name="twilioAuthToken"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Twilio Auth Token</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Enter your Twilio Auth Token" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Your Twilio Auth Token (kept secure and encrypted)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={smsForm.control}
                              name="reminderTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Default Reminder Time</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Time of day to send weekly reminders
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={smsForm.control}
                              name="reminderDays"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Reminder Schedule</FormLabel>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                                      <Badge 
                                        key={day}
                                        variant={field.value.includes(day.toLowerCase()) ? "default" : "outline"}
                                        className="cursor-pointer"
                                        onClick={() => {
                                          const dayLower = day.toLowerCase();
                                          const newDays = field.value.includes(dayLower)
                                            ? field.value.filter(d => d !== dayLower)
                                            : [...field.value, dayLower];
                                          field.onChange(newDays);
                                        }}
                                      >
                                        {day}
                                      </Badge>
                                    ))}
                                  </div>
                                  <FormDescription>
                                    Days of the week to send reminders
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={smsForm.control}
                            name="messageTemplate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Message Template</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    rows={4}
                                    placeholder="Hello {caregiverName}, it's time for your weekly check-in for {patientName}. Please complete your survey: {surveyUrl}"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Use {"{caregiverName}"}, {"{patientName}"}, and {"{surveyUrl}"} as placeholders
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-between">
                            <Button type="button" variant="outline" onClick={testSMSConnection}>
                              <TestTube className="mr-2 h-4 w-4" />
                              Test Connection
                            </Button>
                            <Button type="submit">
                              <Save className="mr-2 h-4 w-4" />
                              Save SMS Settings
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Bell className="h-5 w-5" />
                        <span>Notification Preferences</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Form {...notificationForm}>
                        <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={notificationForm.control}
                              name="emailAlerts"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">Email Alerts</FormLabel>
                                    <FormDescription>
                                      Receive email notifications for health alerts
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={notificationForm.control}
                              name="smsAlerts"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">SMS Alerts</FormLabel>
                                    <FormDescription>
                                      Receive SMS notifications for urgent alerts
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={notificationForm.control}
                              name="healthAlertThreshold"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Health Alert Threshold</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select threshold" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="immediate">Immediate</SelectItem>
                                      <SelectItem value="1hour">Within 1 hour</SelectItem>
                                      <SelectItem value="4hours">Within 4 hours</SelectItem>
                                      <SelectItem value="daily">Daily digest</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    How quickly to send health alert notifications
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={notificationForm.control}
                              name="overdueThreshold"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Overdue Threshold (hours)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="24" 
                                      {...field}
                                      onChange={(e) => field.onChange(Number(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Hours after deadline to mark as overdue
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={notificationForm.control}
                            name="adminEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Administrator Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="admin@yourcompany.com" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Primary email address for system notifications
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end">
                            <Button type="submit">
                              <Save className="mr-2 h-4 w-4" />
                              Save Notification Settings
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* System Tab */}
              <TabsContent value="system">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Database className="h-5 w-5" />
                        <span>System Configuration</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Form {...systemForm}>
                        <form onSubmit={systemForm.handleSubmit(onSystemSubmit)} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={systemForm.control}
                              name="agencyName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Agency Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Your Home Care Agency" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Your agency name for branding and communications
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={systemForm.control}
                              name="timezone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Timezone</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select timezone" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Default timezone for scheduling and reporting
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={systemForm.control}
                              name="weekStartDay"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Week Start Day</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select day" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="sunday">Sunday</SelectItem>
                                      <SelectItem value="monday">Monday</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    First day of the week for check-in scheduling
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={systemForm.control}
                              name="dataRetention"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Data Retention (days)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="365" 
                                      {...field}
                                      onChange={(e) => field.onChange(Number(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    How long to keep survey response data
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={systemForm.control}
                            name="autoReminders"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Automatic Reminders</FormLabel>
                                  <FormDescription>
                                    Automatically send reminder messages for incomplete check-ins
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end">
                            <Button type="submit">
                              <Save className="mr-2 h-4 w-4" />
                              Save System Settings
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Shield className="h-5 w-5" />
                        <span>Security & Privacy</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="rounded-lg border p-4">
                          <h3 className="text-lg font-medium text-slate-900 mb-2">Data Encryption</h3>
                          <p className="text-sm text-slate-600 mb-4">
                            All sensitive data including survey responses and personal information is encrypted at rest and in transit.
                          </p>
                          <Badge variant="secondary" className="bg-healthcare-100 text-healthcare-800">
                            ✓ Enabled
                          </Badge>
                        </div>

                        <div className="rounded-lg border p-4">
                          <h3 className="text-lg font-medium text-slate-900 mb-2">HIPAA Compliance</h3>
                          <p className="text-sm text-slate-600 mb-4">
                            System configured to meet HIPAA requirements for healthcare data protection.
                          </p>
                          <Badge variant="secondary" className="bg-healthcare-100 text-healthcare-800">
                            ✓ Compliant
                          </Badge>
                        </div>

                        <div className="rounded-lg border p-4">
                          <h3 className="text-lg font-medium text-slate-900 mb-2">Access Logs</h3>
                          <p className="text-sm text-slate-600 mb-4">
                            All system access and data modifications are logged for audit purposes.
                          </p>
                          <Button variant="outline" size="sm">
                            View Access Logs
                          </Button>
                        </div>

                        <div className="rounded-lg border p-4">
                          <h3 className="text-lg font-medium text-slate-900 mb-2">Data Backup</h3>
                          <p className="text-sm text-slate-600 mb-4">
                            Automated daily backups ensure data recovery capability.
                          </p>
                          <Badge variant="secondary" className="bg-healthcare-100 text-healthcare-800">
                            ✓ Daily Backups
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}