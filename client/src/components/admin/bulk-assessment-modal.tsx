import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, startOfWeek, endOfWeek, addWeeks } from "date-fns";
import { cn } from "@/lib/utils";

interface BulkAssessmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WeekRange {
  start: Date;
  end: Date;
  label: string;
}

export default function BulkAssessmentModal({ open, onOpenChange }: BulkAssessmentModalProps) {
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCaregivers, setSelectedCaregivers] = useState<number[]>([]);
  const [selectedWeeks, setSelectedWeeks] = useState<WeekRange[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();

  const { data: caregivers, isLoading: caregiversLoading } = useQuery({
    queryKey: ["/api/caregivers"],
    enabled: open,
  });

  const createAssessmentsMutation = useMutation({
    mutationFn: async (data: { state: string; caregiverIds: number[]; weekRanges: { start: string; end: string }[] }) => {
      return await apiRequest("POST", "/api/admin/bulk-create-assessments", data);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/responses"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create assessments",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedState("");
    setSelectedCaregivers([]);
    setSelectedWeeks([]);
    setCurrentStep(1);
  };

  const handleClose = () => {
    if (!createAssessmentsMutation.isPending) {
      onOpenChange(false);
      resetForm();
    }
  };

  const filteredCaregivers = selectedState && Array.isArray(caregivers)
    ? caregivers.filter((c: any) => {
        console.log('Caregiver:', c.name, 'State:', c.state, 'Selected State:', selectedState, 'Match:', c.state === selectedState);
        return c.state === selectedState;
      })
    : [];

  const toggleCaregiver = (id: number) => {
    setSelectedCaregivers(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const toggleAllCaregivers = () => {
    if (selectedCaregivers.length === filteredCaregivers.length) {
      setSelectedCaregivers([]);
    } else {
      setSelectedCaregivers(filteredCaregivers.map((c: any) => c.id));
    }
  };

  const addWeek = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    const label = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    
    const alreadyAdded = selectedWeeks.some(w => 
      w.start.getTime() === weekStart.getTime()
    );
    
    if (!alreadyAdded) {
      setSelectedWeeks([...selectedWeeks, { start: weekStart, end: weekEnd, label }]);
    }
  };

  const removeWeek = (index: number) => {
    setSelectedWeeks(selectedWeeks.filter((_, i) => i !== index));
  };

  const addCurrentWeek = () => {
    addWeek(new Date());
  };

  const addNextWeek = () => {
    addWeek(addWeeks(new Date(), 1));
  };

  const handleCreate = () => {
    const weekRanges = selectedWeeks.map(w => ({
      start: w.start.toISOString(),
      end: w.end.toISOString(),
    }));

    createAssessmentsMutation.mutate({
      state: selectedState,
      caregiverIds: selectedCaregivers,
      weekRanges,
    });
  };

  const canProceedToStep2 = selectedState !== "";
  const canProceedToStep3 = selectedCaregivers.length > 0;
  const canCreate = selectedWeeks.length > 0;

  const totalAssessments = selectedCaregivers.length * selectedWeeks.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-bulk-assessment">
        <DialogHeader>
          <DialogTitle>Create Bulk Assessments</DialogTitle>
          <DialogDescription>
            Create weekly check-in assessments for multiple caregivers and weeks
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Progress */}
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-medium",
                    currentStep >= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={cn(
                      "flex-1 h-1 mx-2",
                      currentStep > step ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Select State */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Select State</Label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger data-testid="select-state">
                    <SelectValue placeholder="Choose a state" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="AL">Alabama (AL)</SelectItem>
                    <SelectItem value="AK">Alaska (AK)</SelectItem>
                    <SelectItem value="AZ">Arizona (AZ)</SelectItem>
                    <SelectItem value="AR">Arkansas (AR)</SelectItem>
                    <SelectItem value="CA">California (CA)</SelectItem>
                    <SelectItem value="CO">Colorado (CO)</SelectItem>
                    <SelectItem value="CT">Connecticut (CT)</SelectItem>
                    <SelectItem value="DE">Delaware (DE)</SelectItem>
                    <SelectItem value="FL">Florida (FL)</SelectItem>
                    <SelectItem value="GA">Georgia (GA)</SelectItem>
                    <SelectItem value="HI">Hawaii (HI)</SelectItem>
                    <SelectItem value="ID">Idaho (ID)</SelectItem>
                    <SelectItem value="IL">Illinois (IL)</SelectItem>
                    <SelectItem value="IN">Indiana (IN)</SelectItem>
                    <SelectItem value="IA">Iowa (IA)</SelectItem>
                    <SelectItem value="KS">Kansas (KS)</SelectItem>
                    <SelectItem value="KY">Kentucky (KY)</SelectItem>
                    <SelectItem value="LA">Louisiana (LA)</SelectItem>
                    <SelectItem value="ME">Maine (ME)</SelectItem>
                    <SelectItem value="MD">Maryland (MD)</SelectItem>
                    <SelectItem value="MA">Massachusetts (MA)</SelectItem>
                    <SelectItem value="MI">Michigan (MI)</SelectItem>
                    <SelectItem value="MN">Minnesota (MN)</SelectItem>
                    <SelectItem value="MS">Mississippi (MS)</SelectItem>
                    <SelectItem value="MO">Missouri (MO)</SelectItem>
                    <SelectItem value="MT">Montana (MT)</SelectItem>
                    <SelectItem value="NE">Nebraska (NE)</SelectItem>
                    <SelectItem value="NV">Nevada (NV)</SelectItem>
                    <SelectItem value="NH">New Hampshire (NH)</SelectItem>
                    <SelectItem value="NJ">New Jersey (NJ)</SelectItem>
                    <SelectItem value="NM">New Mexico (NM)</SelectItem>
                    <SelectItem value="NY">New York (NY)</SelectItem>
                    <SelectItem value="NC">North Carolina (NC)</SelectItem>
                    <SelectItem value="ND">North Dakota (ND)</SelectItem>
                    <SelectItem value="OH">Ohio (OH)</SelectItem>
                    <SelectItem value="OK">Oklahoma (OK)</SelectItem>
                    <SelectItem value="OR">Oregon (OR)</SelectItem>
                    <SelectItem value="PA">Pennsylvania (PA)</SelectItem>
                    <SelectItem value="RI">Rhode Island (RI)</SelectItem>
                    <SelectItem value="SC">South Carolina (SC)</SelectItem>
                    <SelectItem value="SD">South Dakota (SD)</SelectItem>
                    <SelectItem value="TN">Tennessee (TN)</SelectItem>
                    <SelectItem value="TX">Texas (TX)</SelectItem>
                    <SelectItem value="UT">Utah (UT)</SelectItem>
                    <SelectItem value="VT">Vermont (VT)</SelectItem>
                    <SelectItem value="VA">Virginia (VA)</SelectItem>
                    <SelectItem value="WA">Washington (WA)</SelectItem>
                    <SelectItem value="WV">West Virginia (WV)</SelectItem>
                    <SelectItem value="WI">Wisconsin (WI)</SelectItem>
                    <SelectItem value="WY">Wyoming (WY)</SelectItem>
                    <SelectItem value="DC">District of Columbia (DC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedToStep2}
                  data-testid="button-next-step-1"
                >
                  Next: Select Caregivers
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Select Caregivers */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Select Caregivers ({selectedState})</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAllCaregivers}
                    data-testid="button-toggle-all-caregivers"
                  >
                    {selectedCaregivers.length === filteredCaregivers.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <Card>
                  <CardContent className="p-4 max-h-64 overflow-y-auto">
                    {caregiversLoading ? (
                      <div className="text-sm text-muted-foreground">Loading caregivers...</div>
                    ) : filteredCaregivers.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No caregivers found in {selectedState}</div>
                    ) : (
                      <div className="space-y-2">
                        {filteredCaregivers.map((caregiver: any) => (
                          <div key={caregiver.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`caregiver-${caregiver.id}`}
                              checked={selectedCaregivers.includes(caregiver.id)}
                              onCheckedChange={() => toggleCaregiver(caregiver.id)}
                              data-testid={`checkbox-caregiver-${caregiver.id}`}
                            />
                            <label
                              htmlFor={`caregiver-${caregiver.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {caregiver.name} - {caregiver.phone}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <div className="text-sm text-muted-foreground mt-2">
                  {selectedCaregivers.length} caregiver{selectedCaregivers.length !== 1 ? 's' : ''} selected
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)} data-testid="button-back-step-2">
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(3)}
                  disabled={!canProceedToStep3}
                  data-testid="button-next-step-2"
                >
                  Next: Select Weeks
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Select Weeks */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Select Week(s)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button variant="outline" onClick={addCurrentWeek} size="sm" data-testid="button-add-current-week">
                    + Add Current Week
                  </Button>
                  <Button variant="outline" onClick={addNextWeek} size="sm" data-testid="button-add-next-week">
                    + Add Next Week
                  </Button>
                </div>
                <div className="mt-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-pick-custom-week">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Pick Custom Week
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        onSelect={(date) => date && addWeek(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                {selectedWeeks.length > 0 && (
                  <Card className="mt-3">
                    <CardContent className="p-4">
                      <div className="text-sm font-medium mb-2">Selected Weeks:</div>
                      <div className="space-y-2">
                        {selectedWeeks.map((week, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span>{week.label}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeWeek(index)}
                              data-testid={`button-remove-week-${index}`}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Summary */}
              {canCreate && (
                <Card className="bg-muted">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      <div className="text-sm">
                        <div className="font-medium">Ready to create {totalAssessments} assessment{totalAssessments !== 1 ? 's' : ''}</div>
                        <div className="text-muted-foreground">
                          {selectedCaregivers.length} caregiver{selectedCaregivers.length !== 1 ? 's' : ''} × {selectedWeeks.length} week{selectedWeeks.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)} data-testid="button-back-step-3">
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!canCreate || createAssessmentsMutation.isPending}
                  data-testid="button-create-assessments"
                >
                  {createAssessmentsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    `Create ${totalAssessments} Assessment${totalAssessments !== 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
