import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useCaregiverAuth } from "@/hooks/useCaregiverAuth";
import { apiRequest } from "@/lib/queryClient";
import { HeartHandshake, Send, Copy, CheckCircle, X } from "lucide-react";

const surveySchema = z.object({
  hospitalVisits: z.boolean({ required_error: "Please select an option" }),
  hospitalDetails: z.string().optional(),
  accidentsFalls: z.boolean({ required_error: "Please select an option" }),
  accidentDetails: z.string().optional(),
  mentalHealth: z.boolean({ required_error: "Please select an option" }),
  mentalHealthDetails: z.string().optional(),
  physicalHealth: z.boolean({ required_error: "Please select an option" }),
  physicalHealthDetails: z.string().optional(),
  contactChanges: z.boolean({ required_error: "Please select an option" }),
  contactDetails: z.string().optional(),
  additionalComments: z.string().optional(),
});

type SurveyFormData = z.infer<typeof surveySchema>;

interface SurveyFormProps {
  checkInDetails: any;
  patientId?: number; // Optional for caregiver flow
}

export default function SurveyForm({ checkInDetails, patientId }: SurveyFormProps) {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copiedFromPrevious, setCopiedFromPrevious] = useState(false);
  
  // Check if survey has already been completed
  const isAlreadyCompleted = checkInDetails?.checkIn?.isCompleted || false;
  
  // Check if user is a caregiver (for showing copy functionality)
  const { caregiver, isAuthenticated: isCaregiverAuth } = useCaregiverAuth();
  
  // Fetch previous response if caregiver is authenticated and patientId is provided
  const { data: previousResponse } = useQuery({
    queryKey: ["/api/caregiver/previous-response", patientId],
    enabled: isCaregiverAuth && !!patientId,
  });

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      hospitalVisits: false,
      hospitalDetails: "",
      accidentsFalls: false,
      accidentDetails: "",
      mentalHealth: false,
      mentalHealthDetails: "",
      physicalHealth: false,
      physicalHealthDetails: "",
      contactChanges: false,
      contactDetails: "",
      additionalComments: "",
    },
  });

  // Watch form values for conditional rendering
  const watchedValues = form.watch();

  const submitMutation = useMutation({
    mutationFn: async (data: SurveyFormData) => {
      return apiRequest("POST", `/api/survey/${checkInDetails.checkIn.id}/submit`, data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Survey Submitted",
        description: "Thank you! Your weekly check-in has been received.",
      });
    },
    onError: (error) => {
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
      // Extract the responses from the correct nested structure
      const previousResponses = previousResponse.meta?.responses || {};
      
      form.reset({
        hospitalVisits: previousResponses.hospitalVisits || false,
        hospitalDetails: previousResponses.hospitalDetails || "",
        accidentsFalls: previousResponses.accidentsFalls || false,
        accidentDetails: previousResponses.accidentDetails || "",
        mentalHealth: previousResponses.mentalHealth || false,
        mentalHealthDetails: previousResponses.mentalHealthDetails || "",
        physicalHealth: previousResponses.physicalHealth || false,
        physicalHealthDetails: previousResponses.physicalHealthDetails || "",
        contactChanges: previousResponses.contactChanges || false,
        contactDetails: previousResponses.contactDetails || "",
        additionalComments: previousResponses.additionalComments || "",
      });
      setCopiedFromPrevious(true);
      toast({
        title: "Previous Responses Copied",
        description: "Your previous responses have been loaded. You can now review and modify them as needed.",
      });
    }
  };

  // If already completed, show read-only responses
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

    // Extract submitted responses from checkInDetails
    const submittedResponses = checkInDetails.response?.meta?.responses || {};

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
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

        {/* Read-only Survey Content */}
        <main className="px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {/* Read-only Notice */}
            <Alert className="mb-8 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                This survey has been completed and submitted. Responses are shown below for your records and cannot be modified.
              </AlertDescription>
            </Alert>

            {/* Welcome Card */}
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

            {/* Read-only Survey Questions */}
            <div className="space-y-8">
              {/* Question 1: Hospital Visits */}
              <Card className="border-gray-200">
                <CardContent className="p-6 bg-gray-50">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">
                    1. Over the past week, have there been any hospital visits?
                  </h3>
                  <div className="mb-4">
                    <div className="flex items-center space-x-3 p-3 bg-white border border-slate-200 rounded-lg">
                      <div className={`w-4 h-4 rounded-full border-2 ${submittedResponses.hospitalVisits ? 'bg-healthcare-600 border-healthcare-600' : 'border-gray-300'}`}>
                        {submittedResponses.hospitalVisits && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>}
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {submittedResponses.hospitalVisits ? 'Yes, there were hospital visits' : 'No hospital visits'}
                      </span>
                    </div>
                  </div>
                  {submittedResponses.hospitalVisits && submittedResponses.hospitalDetails && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Details provided:</label>
                      <div className="p-3 bg-white border border-slate-200 rounded-lg">
                        <p className="text-sm text-slate-600">{submittedResponses.hospitalDetails}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Question 2: Accidents/Falls */}
              <Card className="border-gray-200">
                <CardContent className="p-6 bg-gray-50">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">
                    2. Have there been any accidents or falls this week?
                  </h3>
                  <div className="mb-4">
                    <div className="flex items-center space-x-3 p-3 bg-white border border-slate-200 rounded-lg">
                      <div className={`w-4 h-4 rounded-full border-2 ${submittedResponses.accidentsFalls ? 'bg-healthcare-600 border-healthcare-600' : 'border-gray-300'}`}>
                        {submittedResponses.accidentsFalls && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>}
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {submittedResponses.accidentsFalls ? 'Yes, there were accidents or falls' : 'No accidents or falls'}
                      </span>
                    </div>
                  </div>
                  {submittedResponses.accidentsFalls && submittedResponses.accidentDetails && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Details provided:</label>
                      <div className="p-3 bg-white border border-slate-200 rounded-lg">
                        <p className="text-sm text-slate-600">{submittedResponses.accidentDetails}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Question 3: Mental Health */}
              <Card className="border-gray-200">
                <CardContent className="p-6 bg-gray-50">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">
                    3. Have you noticed any changes in mental health or behavior?
                  </h3>
                  <div className="mb-4">
                    <div className="flex items-center space-x-3 p-3 bg-white border border-slate-200 rounded-lg">
                      <div className={`w-4 h-4 rounded-full border-2 ${submittedResponses.mentalHealth ? 'bg-healthcare-600 border-healthcare-600' : 'border-gray-300'}`}>
                        {submittedResponses.mentalHealth && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>}
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {submittedResponses.mentalHealth ? 'Yes, there were changes' : 'No significant changes'}
                      </span>
                    </div>
                  </div>
                  {submittedResponses.mentalHealth && submittedResponses.mentalHealthDetails && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Details provided:</label>
                      <div className="p-3 bg-white border border-slate-200 rounded-lg">
                        <p className="text-sm text-slate-600">{submittedResponses.mentalHealthDetails}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Question 4: Physical Health */}
              <Card className="border-gray-200">
                <CardContent className="p-6 bg-gray-50">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">
                    4. Are there any new physical health concerns?
                  </h3>
                  <div className="mb-4">
                    <div className="flex items-center space-x-3 p-3 bg-white border border-slate-200 rounded-lg">
                      <div className={`w-4 h-4 rounded-full border-2 ${submittedResponses.physicalHealth ? 'bg-healthcare-600 border-healthcare-600' : 'border-gray-300'}`}>
                        {submittedResponses.physicalHealth && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>}
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {submittedResponses.physicalHealth ? 'Yes, there are new concerns' : 'No new physical health concerns'}
                      </span>
                    </div>
                  </div>
                  {submittedResponses.physicalHealth && submittedResponses.physicalHealthDetails && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Details provided:</label>
                      <div className="p-3 bg-white border border-slate-200 rounded-lg">
                        <p className="text-sm text-slate-600">{submittedResponses.physicalHealthDetails}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Question 5: Contact Changes */}
              <Card className="border-gray-200">
                <CardContent className="p-6 bg-gray-50">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">
                    5. Have there been any changes to emergency contacts or care team?
                  </h3>
                  <div className="mb-4">
                    <div className="flex items-center space-x-3 p-3 bg-white border border-slate-200 rounded-lg">
                      <div className={`w-4 h-4 rounded-full border-2 ${submittedResponses.contactChanges ? 'bg-healthcare-600 border-healthcare-600' : 'border-gray-300'}`}>
                        {submittedResponses.contactChanges && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>}
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {submittedResponses.contactChanges ? 'Yes, there were changes' : 'No changes to contacts or care team'}
                      </span>
                    </div>
                  </div>
                  {submittedResponses.contactChanges && submittedResponses.contactDetails && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Details provided:</label>
                      <div className="p-3 bg-white border border-slate-200 rounded-lg">
                        <p className="text-sm text-slate-600">{submittedResponses.contactDetails}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Comments */}
              {submittedResponses.additionalComments && (
                <Card className="border-gray-200">
                  <CardContent className="p-6 bg-gray-50">
                    <h3 className="text-lg font-medium text-slate-900 mb-4">
                      Additional Comments
                    </h3>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <p className="text-sm text-slate-600">{submittedResponses.additionalComments}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Close Button */}
              <div className="text-center">
                <Button onClick={() => window.close()} variant="outline" className="px-8">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-healthcare-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HeartHandshake className="h-8 w-8 text-healthcare-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Thank You!
            </h2>
            <p className="text-slate-600 mb-4">
              Your weekly check-in has been submitted successfully. You will receive a confirmation text message shortly.
            </p>
            <Button onClick={() => window.close()} className="w-full">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">Weekly Caregiver Check-in</h1>
              <p className="mt-1 text-sm text-slate-600">Please complete your weekly check-in survey</p>
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

      {/* Survey Form */}
      <main className="px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Nothing Changed - Quick Copy Card - Always show for caregivers */}
          {isCaregiverAuth && !copiedFromPrevious && (
            <Card className={`mb-8 border-2 shadow-lg ${previousResponse ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50' : 'border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100'}`}>
              <CardHeader className="pb-3 relative">
                <CardTitle className={`flex items-center gap-2 text-xl pr-8 ${previousResponse ? 'text-blue-900' : 'text-gray-600'}`}>
                  <Copy className="h-6 w-6" />
                  Nothing Changed This Week?
                </CardTitle>
                {!previousResponse && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCopiedFromPrevious(true)}
                    className="absolute top-2 right-2 h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                    data-testid="button-close-card"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <p className={`mb-4 text-base ${previousResponse ? 'text-blue-800' : 'text-gray-600'}`}>
                  {previousResponse 
                    ? "If there are no new health concerns or incidents to report, you can quickly use your previous week's responses as a starting point. You'll still be able to review and make any necessary changes before submitting."
                    : "This feature allows you to copy previous responses when available. No previous submissions found for this patient yet."
                  }
                </p>
                <div className="flex gap-3">
                  <Button 
                    onClick={handleCopyFromPrevious}
                    disabled={!previousResponse}
                    className={`px-6 py-2 text-base font-medium ${
                      previousResponse 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300'
                    }`}
                    data-testid="button-copy-previous-responses"
                  >
                    <Copy className="mr-2 h-5 w-5" />
                    Use Last Week's Answers
                  </Button>
                  {previousResponse && (
                    <Button 
                      variant="outline" 
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => setCopiedFromPrevious(true)}
                      data-testid="button-start-fresh"
                    >
                      Start Fresh
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Copied Confirmation Alert */}
          {copiedFromPrevious && (
            <Alert className="mb-8 border-blue-200 bg-blue-50">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Previous responses have been copied. Please review and update them as needed before submitting.
              </AlertDescription>
            </Alert>
          )}

          {/* Welcome Card */}
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
                    Hello, {checkInDetails.caregiver?.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Caring for: {checkInDetails.patient?.name}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Thank you for providing excellent care. Please take a few minutes to complete this week's check-in.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Survey Questions */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => submitMutation.mutate(data))} className="space-y-8">
              {/* Question 1: Hospital Visits */}
              <Card>
                <CardContent className="p-6">
                  <FormField
                    control={form.control}
                    name="hospitalVisits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-medium text-slate-900">
                          1. Over the past week, have there been any hospital visits?
                        </FormLabel>
                        <p className="text-sm text-slate-600 mb-4">
                          Include emergency room visits, scheduled appointments, or any medical facility visits.
                        </p>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "true")}
                            value={field.value?.toString()}
                            className="space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id="hospital-no" />
                              <label htmlFor="hospital-no" className="text-sm font-medium text-slate-700 cursor-pointer">
                                No hospital visits
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id="hospital-yes" />
                              <label htmlFor="hospital-yes" className="text-sm font-medium text-slate-700 cursor-pointer">
                                Yes, there were hospital visits
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {watchedValues.hospitalVisits && (
                    <FormField
                      control={form.control}
                      name="hospitalDetails"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel className="text-sm font-medium text-slate-700">
                            If yes, please provide details:
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Please describe the reason for the visit, date, and outcome..."
                              rows={3}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Question 2: Accidents/Falls */}
              <Card>
                <CardContent className="p-6">
                  <FormField
                    control={form.control}
                    name="accidentsFalls"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-medium text-slate-900">
                          2. Have there been any accidents or falls this week?
                        </FormLabel>
                        <p className="text-sm text-slate-600 mb-4">
                          This includes slips, trips, falls, or any other incidents that resulted in injury or concern.
                        </p>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "true")}
                            value={field.value?.toString()}
                            className="space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id="accidents-no" />
                              <label htmlFor="accidents-no" className="text-sm font-medium text-slate-700 cursor-pointer">
                                No accidents or falls
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id="accidents-yes" />
                              <label htmlFor="accidents-yes" className="text-sm font-medium text-slate-700 cursor-pointer">
                                Yes, there were accidents or falls
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {watchedValues.accidentsFalls && (
                    <FormField
                      control={form.control}
                      name="accidentDetails"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel className="text-sm font-medium text-slate-700">
                            If yes, please provide details:
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Please describe what happened, when, and any actions taken..."
                              rows={3}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Question 3: Mental Health Changes */}
              <Card>
                <CardContent className="p-6">
                  <FormField
                    control={form.control}
                    name="mentalHealth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-medium text-slate-900">
                          3. Have you noticed any changes in mental health this week?
                        </FormLabel>
                        <p className="text-sm text-slate-600 mb-4">
                          This includes mood changes, confusion, anxiety, depression, or changes in cognitive function.
                        </p>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "true")}
                            value={field.value?.toString()}
                            className="space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id="mental-no" />
                              <label htmlFor="mental-no" className="text-sm font-medium text-slate-700 cursor-pointer">
                                No changes in mental health
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id="mental-yes" />
                              <label htmlFor="mental-yes" className="text-sm font-medium text-slate-700 cursor-pointer">
                                Yes, there have been changes
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {watchedValues.mentalHealth && (
                    <FormField
                      control={form.control}
                      name="mentalHealthDetails"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel className="text-sm font-medium text-slate-700">
                            If yes, please describe the changes:
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Please describe any changes in mood, behavior, or cognitive function..."
                              rows={3}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Question 4: Physical Health Changes */}
              <Card>
                <CardContent className="p-6">
                  <FormField
                    control={form.control}
                    name="physicalHealth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-medium text-slate-900">
                          4. Have you noticed any changes in physical health this week?
                        </FormLabel>
                        <p className="text-sm text-slate-600 mb-4">
                          This includes changes in mobility, appetite, sleep patterns, pain levels, or overall physical condition.
                        </p>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "true")}
                            value={field.value?.toString()}
                            className="space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id="physical-no" />
                              <label htmlFor="physical-no" className="text-sm font-medium text-slate-700 cursor-pointer">
                                No changes in physical health
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id="physical-yes" />
                              <label htmlFor="physical-yes" className="text-sm font-medium text-slate-700 cursor-pointer">
                                Yes, there have been changes
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {watchedValues.physicalHealth && (
                    <FormField
                      control={form.control}
                      name="physicalHealthDetails"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel className="text-sm font-medium text-slate-700">
                            If yes, please describe the changes:
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Please describe any changes in mobility, appetite, sleep, or physical condition..."
                              rows={3}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Question 5: Contact Information Changes */}
              <Card>
                <CardContent className="p-6">
                  <FormField
                    control={form.control}
                    name="contactChanges"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-medium text-slate-900">
                          5. Have there been any changes in address or contact information?
                        </FormLabel>
                        <p className="text-sm text-slate-600 mb-4">
                          This includes changes to address, phone number, or emergency contact information.
                        </p>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "true")}
                            value={field.value?.toString()}
                            className="space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id="contact-no" />
                              <label htmlFor="contact-no" className="text-sm font-medium text-slate-700 cursor-pointer">
                                No changes to contact information
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id="contact-yes" />
                              <label htmlFor="contact-yes" className="text-sm font-medium text-slate-700 cursor-pointer">
                                Yes, there have been changes
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {watchedValues.contactChanges && (
                    <FormField
                      control={form.control}
                      name="contactDetails"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel className="text-sm font-medium text-slate-700">
                            If yes, please provide updated information:
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Please provide updated address, phone number, or emergency contact details..."
                              rows={3}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Question 6: Additional Comments */}
              <Card>
                <CardContent className="p-6">
                  <FormField
                    control={form.control}
                    name="additionalComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-medium text-slate-900">
                          6. Is there anything else you'd like to share about your caregiving activities this week?
                        </FormLabel>
                        <p className="text-sm text-slate-600 mb-4">
                          Feel free to share any concerns, successes, or other information that would be helpful for us to know.
                        </p>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Please share any additional information about your caregiving experience this week..."
                            rows={4}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4">
                    <p className="text-sm text-slate-600">
                      By submitting this form, you confirm that the information provided is accurate and complete.
                    </p>
                  </div>
                  <div className="flex space-x-4">
                    <Button 
                      type="submit" 
                      className="flex-1" 
                      disabled={submitMutation.isPending}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {submitMutation.isPending ? "Submitting..." : "Submit Weekly Check-in"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
