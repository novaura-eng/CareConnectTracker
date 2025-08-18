import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import StatsCards from "./stats-cards";
import ResponseTable from "./response-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Send, Mail, Plus, Copy } from "lucide-react";
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Weekly Check-ins Dashboard</h1>
              <p className="mt-1 text-sm text-slate-600">Monitor caregiver responses and track compliance</p>
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
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      onClick={() => testEmailMutation.mutate({ email: testEmail })}
                      disabled={!testEmail || testEmailMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {testEmailMutation.isPending ? "Sending..." : "Send Test Email"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
              <Dialog open={isManualSurveyOpen} onOpenChange={setIsManualSurveyOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full sm:w-auto">
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
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        <StatsCards stats={stats} isLoading={statsLoading} />
        <ResponseTable responses={responses} isLoading={responsesLoading} />
      </main>
    </div>
  );
}
