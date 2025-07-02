import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import StatsCards from "./stats-cards";
import ResponseTable from "./response-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Send, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const [testEmail, setTestEmail] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Weekly Check-ins Dashboard</h1>
              <p className="mt-1 text-sm text-slate-600">Monitor caregiver responses and track compliance</p>
            </div>
            <div className="flex space-x-3">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Mail className="mr-2 h-4 w-4" />
                    Test Email
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Send Test Email</DialogTitle>
                    <DialogDescription>
                      Send yourself a sample of what caregivers receive via email with the survey link.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">
                        Email
                      </Label>
                      <Input
                        id="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="your-email@example.com"
                        className="col-span-3"
                        type="email"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      onClick={() => testEmailMutation.mutate({ email: testEmail })}
                      disabled={!testEmail || testEmailMutation.isPending}
                    >
                      {testEmailMutation.isPending ? "Sending..." : "Send Test Email"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
              <Button size="sm">
                <Send className="mr-2 h-4 w-4" />
                Send Reminders
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <StatsCards stats={stats} isLoading={statsLoading} />
        <ResponseTable responses={responses} isLoading={responsesLoading} />
      </main>
    </div>
  );
}
