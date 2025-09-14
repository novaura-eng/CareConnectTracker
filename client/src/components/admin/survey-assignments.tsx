import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Users, Send, Clock } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Survey {
  id: number;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
}

interface Caregiver {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface Patient {
  id: number;
  name: string;
  caregiverId: number;
}

const assignmentSchema = z.object({
  caregiverIds: z.array(z.number()).min(1, "Select at least one caregiver"),
  dueAt: z.date({
    required_error: "Due date is required",
  }),
  checkInId: z.number().optional(),
});

type AssignmentForm = z.infer<typeof assignmentSchema>;

interface SurveyAssignmentsProps {
  survey: Survey;
  onClose: () => void;
}

export default function SurveyAssignments({ survey, onClose }: SurveyAssignmentsProps) {
  const [selectedCaregivers, setSelectedCaregivers] = useState<number[]>([]);
  const [assignmentMode, setAssignmentMode] = useState<'standalone' | 'checkin'>('standalone');
  const { toast } = useToast();

  const assignmentForm = useForm<AssignmentForm>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      caregiverIds: [],
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 1 week from now
    },
  });

  const { data: caregivers, isLoading: caregiversLoading } = useQuery({
    queryKey: ["/api/caregivers"],
  });

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
  });

  const assignSurveyMutation = useMutation({
    mutationFn: async (data: AssignmentForm) => {
      const assignments = data.caregiverIds.map(caregiverId => {
        const caregiver = (caregivers as Caregiver[])?.find((c: Caregiver) => c.id === caregiverId);
        const caregiverPatients = (patients as Patient[])?.filter((p: Patient) => p.caregiverId === caregiverId) || [];
        
        return caregiverPatients.map(patient => ({
          surveyId: survey.id,
          caregiverId: caregiverId,
          patientId: patient.id,
          dueAt: data.dueAt.toISOString(),
          checkInId: data.checkInId || null,
        }));
      }).flat();

      return apiRequest(`/api/admin/surveys/${survey.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ assignments }),
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/surveys"] });
      toast({
        title: "Survey Assigned",
        description: `Survey assigned to ${response.assignmentCount} caregiver(s) successfully.`,
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Assignment Failed",
        description: "Failed to assign survey. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCaregiverToggle = (caregiverId: number, checked: boolean) => {
    let newSelected: number[];
    if (checked) {
      newSelected = [...selectedCaregivers, caregiverId];
    } else {
      newSelected = selectedCaregivers.filter(id => id !== caregiverId);
    }
    setSelectedCaregivers(newSelected);
    assignmentForm.setValue('caregiverIds', newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCaregivers.length === caregivers?.length) {
      setSelectedCaregivers([]);
      assignmentForm.setValue('caregiverIds', []);
    } else {
      const allIds = caregivers?.map((c: Caregiver) => c.id) || [];
      setSelectedCaregivers(allIds);
      assignmentForm.setValue('caregiverIds', allIds);
    }
  };

  const handleAssign = (data: AssignmentForm) => {
    assignSurveyMutation.mutate(data);
  };

  const getCaregiverPatientCount = (caregiverId: number) => {
    return patients?.filter((p: Patient) => p.caregiverId === caregiverId).length || 0;
  };

  const getTotalAssignments = () => {
    return selectedCaregivers.reduce((total, caregiverId) => {
      return total + getCaregiverPatientCount(caregiverId);
    }, 0);
  };

  if (caregiversLoading || patientsLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Survey Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{survey.title}</CardTitle>
          {survey.description && (
            <CardDescription>{survey.description}</CardDescription>
          )}
        </CardHeader>
      </Card>

      <Form {...assignmentForm}>
        <form onSubmit={assignmentForm.handleSubmit(handleAssign)} className="space-y-6">
          {/* Assignment Mode */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Assignment Type</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="standalone"
                  name="assignmentMode"
                  value="standalone"
                  checked={assignmentMode === 'standalone'}
                  onChange={(e) => setAssignmentMode(e.target.value as 'standalone' | 'checkin')}
                  data-testid="radio-assignment-standalone"
                />
                <Label htmlFor="standalone" className="font-normal">
                  Standalone Survey - Assign directly to caregivers
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="checkin"
                  name="assignmentMode"
                  value="checkin"
                  checked={assignmentMode === 'checkin'}
                  onChange={(e) => setAssignmentMode(e.target.value as 'standalone' | 'checkin')}
                  data-testid="radio-assignment-checkin"
                />
                <Label htmlFor="checkin" className="font-normal">
                  Link to Weekly Check-in - Include with regular check-ins
                </Label>
              </div>
            </div>
          </div>

          {/* Due Date */}
          <FormField
            control={assignmentForm.control}
            name="dueAt"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Due Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-[240px] pl-3 text-left font-normal"
                        data-testid="button-select-due-date"
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  When should caregivers complete this survey by?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Caregiver Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Select Caregivers</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                data-testid="button-select-all-caregivers"
              >
                {selectedCaregivers.length === caregivers?.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {caregivers && caregivers.length > 0 ? (
                <div className="space-y-0">
                  {caregivers.map((caregiver: Caregiver) => {
                    const patientCount = getCaregiverPatientCount(caregiver.id);
                    const isSelected = selectedCaregivers.includes(caregiver.id);
                    
                    return (
                      <div
                        key={caregiver.id}
                        className="flex items-center space-x-3 p-3 border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleCaregiverToggle(caregiver.id, checked as boolean)}
                          data-testid={`checkbox-caregiver-${caregiver.id}`}
                        />
                        <div className="flex-1">
                          <div className="font-medium" data-testid={`text-caregiver-name-${caregiver.id}`}>
                            {caregiver.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {caregiver.email} • {patientCount} patient{patientCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          <Users className="inline h-4 w-4 mr-1" />
                          {patientCount}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No caregivers found
                </div>
              )}
            </div>
          </div>

          {/* Assignment Summary */}
          {selectedCaregivers.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <Send className="h-4 w-4" />
                  <span className="font-medium">Assignment Summary</span>
                </div>
                <div className="mt-2 text-sm text-blue-700" data-testid="text-assignment-summary">
                  This survey will be assigned to <strong>{selectedCaregivers.length}</strong> caregiver{selectedCaregivers.length !== 1 ? 's' : ''} 
                  for a total of <strong>{getTotalAssignments()}</strong> assignment{getTotalAssignments() !== 1 ? 's' : ''} 
                  (one per patient they care for).
                </div>
                <div className="mt-1 text-xs text-blue-600">
                  Due: {format(assignmentForm.watch('dueAt') || new Date(), "PPP")}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-assignment">
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={selectedCaregivers.length === 0 || assignSurveyMutation.isPending}
              data-testid="button-assign-survey"
            >
              <Send className="mr-2 h-4 w-4" />
              {assignSurveyMutation.isPending ? "Assigning..." : `Assign Survey`}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}