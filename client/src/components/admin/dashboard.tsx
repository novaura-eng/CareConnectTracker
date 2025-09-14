import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import StatsCards from "./stats-cards";
import ResponseTable from "./response-table";
import SurveyManager from "./survey-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Send, Mail, Plus, Copy, BarChart3, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ManualSurveyCreator from "./manual-survey-creator";

export default function Dashboard() {
  const [testEmail, setTestEmail] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isManualSurveyOpen, setIsManualSurveyOpen] = useState(false);
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: responses, isLoading: responsesLoading } = useQuery({
    queryKey: ["/api/admin/responses"],
  });

  const testEmailMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to send test email");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Test email sent successfully! Check your inbox.",
      });
      setIsDialogOpen(false);
      setTestEmail("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send test email. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex-1 bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Healthcare Management System</h1>
            <p className="mt-1 text-sm text-slate-600">Monitor check-ins and manage custom surveys</p>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <main className="px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="checkins" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="checkins" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Check-ins Dashboard
            </TabsTrigger>
            <TabsTrigger value="surveys" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Survey Builder
            </TabsTrigger>
          </TabsList>

          {/* Check-ins Dashboard Tab */}
          <TabsContent value="checkins" className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Weekly Check-ins</h2>
                <p className="text-sm text-slate-600">Monitor caregiver responses and track compliance</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <Mail className="mr-2 h-4 w-4" />
                      Test Email
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] mx-4">
                    <DialogHeader>
                      <DialogTitle>Send Test Email</DialogTitle>
                      <DialogDescription>
                        Send yourself a sample of what caregivers receive via email with the survey link.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="your-email@example.com"
                          type="email"
                          data-testid="input-test-email"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        onClick={() => testEmailMutation.mutate({ email: testEmail })}
                        disabled={!testEmail || testEmailMutation.isPending}
                        className="w-full sm:w-auto"
                        data-testid="button-send-test-email"
                      >
                        {testEmailMutation.isPending ? "Sending..." : "Send Test Email"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" className="w-full sm:w-auto" data-testid="button-export-report">
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
                <Dialog open={isManualSurveyOpen} onOpenChange={setIsManualSurveyOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="w-full sm:w-auto" data-testid="button-create-survey">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Survey
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] mx-4">
                    <DialogHeader>
                      <DialogTitle>Manual Survey Creation</DialogTitle>
                      <DialogDescription>
                        Create survey links for your caregivers to send via email, text, or messaging apps.
                      </DialogDescription>
                    </DialogHeader>
                    <ManualSurveyCreator />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <StatsCards stats={stats} isLoading={statsLoading} />
            <ResponseTable responses={responses} isLoading={responsesLoading} />
          </TabsContent>

          {/* Survey Builder Tab */}
          <TabsContent value="surveys" className="space-y-6">
            <SurveyManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
