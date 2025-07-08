import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HeartHandshake, Send } from "lucide-react";

const surveySchema = z.object({
  hospitalVisits: z.enum(["yes", "no"], { required_error: "Please select an option" }),
  hospitalDetails: z.string().optional(),
  accidentsFalls: z.enum(["yes", "no"], { required_error: "Please select an option" }),
  accidentDetails: z.string().optional(),
  mentalHealth: z.enum(["yes", "no"], { required_error: "Please select an option" }),
  mentalHealthDetails: z.string().optional(),
  physicalHealth: z.enum(["yes", "no"], { required_error: "Please select an option" }),
  physicalHealthDetails: z.string().optional(),
  contactChanges: z.enum(["yes", "no"], { required_error: "Please select an option" }),
  contactDetails: z.string().optional(),
  additionalComments: z.string().optional(),
});

type SurveyFormData = z.infer<typeof surveySchema>;

interface SurveyFormProps {
  checkInDetails: any;
}

export default function SurveyForm({ checkInDetails }: SurveyFormProps) {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      hospitalVisits: undefined,
      hospitalDetails: "",
      accidentsFalls: undefined,
      accidentDetails: "",
      mentalHealth: undefined,
      mentalHealthDetails: "",
      physicalHealth: undefined,
      physicalHealthDetails: "",
      contactChanges: undefined,
      contactDetails: "",
      additionalComments: "",
    },
  });

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
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Weekly Caregiver Check-in</h1>
              <p className="mt-1 text-sm text-slate-600">Please complete your weekly check-in survey</p>
            </div>
            <div className="text-left sm:text-right flex-shrink-0">
              <p className="text-sm text-slate-500">Week of</p>
              <p className="text-sm font-medium text-slate-900">
                {formatWeekRange(checkInDetails.checkIn.weekStartDate, checkInDetails.checkIn.weekEndDate)}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Survey Form */}
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
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
                            onValueChange={field.onChange}
                            value={field.value}
                            className="space-y-3"
                          >
                            <div className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                              <RadioGroupItem value="no" id="hospital-no" />
                              <label htmlFor="hospital-no" className="text-sm font-medium text-slate-700 cursor-pointer flex-1">
                                No hospital visits
                              </label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                              <RadioGroupItem value="yes" id="hospital-yes" />
                              <label htmlFor="hospital-yes" className="text-sm font-medium text-slate-700 cursor-pointer flex-1">
                                Yes, there were hospital visits
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                            onValueChange={field.onChange}
                            value={field.value}
                            className="space-y-3"
                          >
                            <div className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                              <RadioGroupItem value="no" id="accidents-no" />
                              <label htmlFor="accidents-no" className="text-sm font-medium text-slate-700 cursor-pointer flex-1">
                                No accidents or falls
                              </label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                              <RadioGroupItem value="yes" id="accidents-yes" />
                              <label htmlFor="accidents-yes" className="text-sm font-medium text-slate-700 cursor-pointer flex-1">
                                Yes, there were accidents or falls
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                            onValueChange={field.onChange}
                            value={field.value}
                            className="space-y-3"
                          >
                            <div className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                              <RadioGroupItem value="no" id="mental-no" />
                              <label htmlFor="mental-no" className="text-sm font-medium text-slate-700 cursor-pointer flex-1">
                                No changes in mental health
                              </label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                              <RadioGroupItem value="yes" id="mental-yes" />
                              <label htmlFor="mental-yes" className="text-sm font-medium text-slate-700 cursor-pointer flex-1">
                                Yes, there have been changes
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                            onValueChange={field.onChange}
                            value={field.value}
                            className="space-y-3"
                          >
                            <div className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                              <RadioGroupItem value="no" id="physical-no" />
                              <label htmlFor="physical-no" className="text-sm font-medium text-slate-700 cursor-pointer flex-1">
                                No changes in physical health
                              </label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                              <RadioGroupItem value="yes" id="physical-yes" />
                              <label htmlFor="physical-yes" className="text-sm font-medium text-slate-700 cursor-pointer flex-1">
                                Yes, there have been changes
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                            onValueChange={field.onChange}
                            value={field.value}
                            className="space-y-3"
                          >
                            <div className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                              <RadioGroupItem value="no" id="contact-no" />
                              <label htmlFor="contact-no" className="text-sm font-medium text-slate-700 cursor-pointer flex-1">
                                No changes to contact information
                              </label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                              <RadioGroupItem value="yes" id="contact-yes" />
                              <label htmlFor="contact-yes" className="text-sm font-medium text-slate-700 cursor-pointer flex-1">
                                Yes, there have been changes
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
