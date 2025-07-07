import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Send, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SurveyCreation {
  caregiverId: number;
  patientId: number;
}

export default function ManualSurveyCreator() {
  const [selectedCaregiver, setSelectedCaregiver] = useState<number | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [surveyLink, setSurveyLink] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const { toast } = useToast();

  const { data: caregivers, isLoading: caregiversLoading } = useQuery({
    queryKey: ["/api/caregivers"],
  });

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    enabled: !!selectedCaregiver,
  });

  const createSurveyMutation = useMutation({
    mutationFn: async (data: SurveyCreation) => {
      const response = await fetch("/api/admin/manual-survey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create survey");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setSurveyLink(data.surveyUrl);
      generateMessageTemplate(data.caregiverName, data.patientName, data.surveyUrl);
      toast({
        title: "Survey Created",
        description: "Survey link generated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create survey. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateMessageTemplate = (caregiverName: string, patientName: string, surveyUrl: string) => {
    const template = `Hi ${caregiverName},

Time for your weekly check-in for ${patientName}.

Please complete this 5-minute survey about their health and safety:
${surveyUrl}

The survey covers:
• Hospital visits or emergency room visits
• Accidents, falls, or injuries
• Mental health changes
• Physical health changes
• Address or living situation changes
• General feedback and concerns

Please complete by Sunday. Contact us immediately with any urgent concerns.

- Silver CareConnect Team`;

    setMessageTemplate(template);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard",
    });
  };

  const handleCreateSurvey = () => {
    if (!selectedCaregiver || !selectedPatient) {
      toast({
        title: "Missing Information",
        description: "Please select both a caregiver and patient",
        variant: "destructive",
      });
      return;
    }

    createSurveyMutation.mutate({
      caregiverId: selectedCaregiver,
      patientId: selectedPatient,
    });
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Select Caregiver and Patient */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="caregiver">Select Caregiver</Label>
          <Select onValueChange={(value) => setSelectedCaregiver(parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Choose caregiver" />
            </SelectTrigger>
            <SelectContent>
              {caregiversLoading ? (
                <SelectItem value="loading">Loading...</SelectItem>
              ) : (
                caregivers?.map((caregiver: any) => (
                  <SelectItem key={caregiver.id} value={caregiver.id.toString()}>
                    {caregiver.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="patient">Select Patient</Label>
          <Select onValueChange={(value) => setSelectedPatient(parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Choose patient" />
            </SelectTrigger>
            <SelectContent>
              {patientsLoading ? (
                <SelectItem value="loading">Loading...</SelectItem>
              ) : (
                patients?.filter((patient: any) => patient.caregiverId === selectedCaregiver)
                  .map((patient: any) => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.name}
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Step 2: Create Survey */}
      <div>
        <Button 
          onClick={handleCreateSurvey}
          disabled={!selectedCaregiver || !selectedPatient || createSurveyMutation.isPending}
          className="w-full"
        >
          {createSurveyMutation.isPending ? "Creating..." : "Create Survey Link"}
        </Button>
      </div>

      {/* Step 3: Survey Link and Message */}
      {surveyLink && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Survey Link Created
              </CardTitle>
              <CardDescription>
                Copy this link to send to your caregiver
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input value={surveyLink} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(surveyLink)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message Template</CardTitle>
              <CardDescription>
                Copy this message to send via email, text, or messaging app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(messageTemplate)}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}