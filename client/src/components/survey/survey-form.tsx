import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useCaregiverAuth } from "@/hooks/useCaregiverAuth";
import { apiRequest } from "@/lib/queryClient";
import { HeartHandshake, Send, Copy, CheckCircle, X } from "lucide-react";
import type { CheckInQuestionTemplate } from "@shared/schema";

interface SurveyFormProps {
  checkInDetails: any;
  patientId?: number;
}

export default function SurveyForm({ checkInDetails, patientId }: SurveyFormProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copiedFromPrevious, setCopiedFromPrevious] = useState(false);
  
  const isAlreadyCompleted = checkInDetails?.checkIn?.isCompleted || false;
  const { caregiver, isAuthenticated: isCaregiverAuth } = useCaregiverAuth();
  
  // Fetch question templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<CheckInQuestionTemplate[]>({
    queryKey: ["/api/checkin-templates/enabled"],
  });

  // Fetch previous response
  const { data: previousResponse } = useQuery<any>({
    queryKey: ["/api/caregiver/previous-response", patientId],
    enabled: isCaregiverAuth && !!patientId,
  });

  // Build default values from templates
  const defaultValues = useMemo(() => {
    const values: Record<string, any> = {};
    templates.forEach(template => {
      if (template.requiresDetails) {
        // Yes/No questions default to false
        values[template.questionKey] = false;
        values[`${template.questionKey}Details`] = "";
      } else {
        // Text-only questions default to empty string
        values[template.questionKey] = "";
      }
    });
    return values;
  }, [templates]);

  const form = useForm({
    defaultValues,
  });

  const watchedValues = form.watch();

  const submitMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("POST", `/api/survey/${checkInDetails.checkIn.id}/submit`, data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Survey Submitted",
        description: "Thank you! Your weekly check-in has been received.",
      });
      setTimeout(() => {
        setLocation("/caregiver/checkins");
      }, 1500);
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your survey. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatWeekRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${startStr} - ${endStr}`;
  };

  const handleCopyFromPrevious = () => {
    if (previousResponse) {
      const previousResponses = (previousResponse as any)?.meta?.responses || {};
      const values: Record<string, any> = {};
      
      templates.forEach(template => {
        if (template.requiresDetails) {
          // Yes/No questions
          values[template.questionKey] = previousResponses[template.questionKey] !== undefined 
            ? previousResponses[template.questionKey] 
            : false;
          values[`${template.questionKey}Details`] = previousResponses[`${template.questionKey}Details`] || "";
        } else {
          // Text-only questions
          values[template.questionKey] = previousResponses[template.questionKey] || "";
        }
      });
      
      form.reset(values);
      setCopiedFromPrevious(true);
      toast({
        title: "Previous Responses Copied",
        description: "Your previous responses have been loaded. You can now review and modify them as needed.",
      });
    }
  };

  if (isLoadingTemplates) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading survey...</p>
      </div>
    );
  }

  // Read-only completed view
  if (isAlreadyCompleted) {
    const completedAt = checkInDetails.checkIn.completedAt;
    const completedDate = completedAt ? new Date(completedAt).toLocaleDateString("en-US", { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Previously';

    const submittedResponses = checkInDetails.response?.meta?.responses || {};

    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">Weekly Caregiver Check-in</h1>
                </div>
                <p className="mt-1 text-sm text-green-600">Completed on {completedDate}</p>
              </div>
              <div className="text-left sm:text-right flex-shrink-0">
                <p className="text-xs sm:text-sm text-slate-500">Week of</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatWeekRange(checkInDetails.checkIn.weekStartDate, checkInDetails.checkIn.weekEndDate)}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Alert className="mb-8 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                This survey has been completed and submitted. Responses are shown below for your records and cannot be modified.
              </AlertDescription>
            </Alert>

            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-healthcare-100 rounded-lg flex items-center justify-center">
                      <HeartHandshake className="h-6 w-6 text-healthcare-600" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {checkInDetails.caregiver?.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Caring for: {checkInDetails.patient?.name}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Your completed responses are shown below for your records.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-8">
              {templates.map((template, index) => (
                <Card key={template.id} className="border-gray-200">
                  <CardContent className="p-6 bg-gray-50">
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                      {index + 1}. {template.questionText}
                    </h3>
                    {template.helpText && (
                      <p className="text-sm text-slate-500 mb-4">{template.helpText}</p>
                    )}
                    
                    {template.requiresDetails ? (
                      <>
                        <div className="mb-4">
                          <div className="flex items-center space-x-3 p-3 bg-white border border-slate-200 rounded-lg">
                            <div className={`w-4 h-4 rounded-full border-2 ${submittedResponses[template.questionKey] ? 'bg-healthcare-600 border-healthcare-600' : 'border-gray-300'}`}>
                              {submittedResponses[template.questionKey] && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>}
                            </div>
                            <span className="text-sm font-medium text-slate-700">
                              {submittedResponses[template.questionKey] ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                        {submittedResponses[template.questionKey] && submittedResponses[`${template.questionKey}Details`] && (
                          <div className="mt-4">
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                              {template.detailsPrompt || "Details provided:"}
                            </label>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                              <p className="text-sm text-slate-600">{submittedResponses[`${template.questionKey}Details`]}</p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      submittedResponses[template.questionKey] && (
                        <div className="p-3 bg-white border border-slate-200 rounded-lg">
                          <p className="text-sm text-slate-600">{String(submittedResponses[template.questionKey])}</p>
                        </div>
                      )
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Button
                variant="outline"
                onClick={() => setLocation("/caregiver/checkins")}
                data-testid="button-back-to-checkins"
              >
                Back to Check-ins
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Editable form view
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Survey Submitted!</h2>
            <p className="text-slate-600 mb-6">
              Thank you for completing your weekly check-in. Your responses have been recorded.
            </p>
            <p className="text-sm text-slate-500">
              Redirecting you back to check-ins...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">Weekly Caregiver Check-in</h1>
              <p className="mt-1 text-sm text-slate-500">Complete your weekly patient assessment</p>
            </div>
            <div className="text-left sm:text-right flex-shrink-0">
              <p className="text-xs sm:text-sm text-slate-500">Week of</p>
              <p className="text-sm font-medium text-slate-900">
                {formatWeekRange(checkInDetails.checkIn.weekStartDate, checkInDetails.checkIn.weekEndDate)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-healthcare-100 rounded-lg flex items-center justify-center">
                    <HeartHandshake className="h-6 w-6 text-healthcare-600" />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {checkInDetails.caregiver?.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Caring for: {checkInDetails.patient?.name}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Please answer the following questions about the past week.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {previousResponse && !copiedFromPrevious && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <AlertDescription className="flex items-center justify-between">
                <span className="text-blue-900 text-sm">
                  You can copy your responses from last week and modify them as needed.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyFromPrevious}
                  className="ml-4 flex-shrink-0"
                  data-testid="button-copy-previous"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Previous
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => submitMutation.mutate(data))} className="space-y-8">
              {templates.map((template, index) => (
                <Card key={template.id}>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                      {index + 1}. {template.questionText}
                    </h3>
                    {template.helpText && (
                      <p className="text-sm text-slate-500 mb-4">{template.helpText}</p>
                    )}

                    {template.requiresDetails ? (
                      <>
                        <FormField
                          control={form.control}
                          name={template.questionKey}
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormControl>
                                <RadioGroup
                                  onValueChange={(value) => field.onChange(value === "true")}
                                  value={field.value === true ? "true" : "false"}
                                  className="flex flex-col space-y-2"
                                >
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="false" data-testid={`radio-${template.questionKey}-no`} />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      No
                                    </FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="true" data-testid={`radio-${template.questionKey}-yes`} />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      Yes
                                    </FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {watchedValues[template.questionKey] === true && (
                          <FormField
                            control={form.control}
                            name={`${template.questionKey}Details`}
                            render={({ field }) => (
                              <FormItem className="mt-4">
                                <FormLabel>{template.detailsPrompt || "Please provide details:"}</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder="Enter details here..."
                                    className="min-h-[100px]"
                                    data-testid={`textarea-${template.questionKey}-details`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </>
                    ) : (
                      <FormField
                        control={form.control}
                        name={template.questionKey}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Enter your comments..."
                                className="min-h-[100px]"
                                data-testid={`textarea-${template.questionKey}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-4 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/caregiver/checkins")}
                  data-testid="button-cancel"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                  data-testid="button-submit-survey"
                >
                  {submitMutation.isPending ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Survey
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
