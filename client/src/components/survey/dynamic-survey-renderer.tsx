import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, Send, CheckCircle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface SurveyQuestion {
  id: number;
  text: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'single_choice' | 'multi_choice';
  required: boolean;
  orderIndex: number;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  options?: {
    id: number;
    value: string;
    label: string;
    orderIndex: number;
  }[];
}

interface Survey {
  id: number;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
}

interface SurveyAssignment {
  id: number;
  surveyId: number;
  caregiverId: number;
  patientId: number;
  dueAt: string;
  status: 'pending' | 'completed';
  checkInId?: number;
}

interface DynamicSurveyRendererProps {
  assignment: SurveyAssignment;
  survey: Survey;
  patientName: string;
  onComplete: () => void;
  onBack?: () => void;
}

export default function DynamicSurveyRenderer({ 
  assignment, 
  survey, 
  patientName, 
  onComplete, 
  onBack 
}: DynamicSurveyRendererProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  // Create dynamic validation schema based on survey questions
  const createValidationSchema = () => {
    const schemaObject: Record<string, z.ZodTypeAny> = {};
    
    survey.questions.forEach((question) => {
      let validator: z.ZodTypeAny;
      
      switch (question.type) {
        case 'text':
          validator = z.string();
          if (question.validation?.minLength) {
            validator = validator.min(question.validation.minLength, `Minimum ${question.validation.minLength} characters required`);
          }
          if (question.validation?.maxLength) {
            validator = validator.max(question.validation.maxLength, `Maximum ${question.validation.maxLength} characters allowed`);
          }
          break;
        
        case 'number':
          validator = z.number();
          if (question.validation?.min !== undefined) {
            validator = validator.min(question.validation.min, `Minimum value is ${question.validation.min}`);
          }
          if (question.validation?.max !== undefined) {
            validator = validator.max(question.validation.max, `Maximum value is ${question.validation.max}`);
          }
          break;
        
        case 'boolean':
          validator = z.boolean();
          break;
        
        case 'date':
          validator = z.date();
          break;
        
        case 'single_choice':
          validator = z.string();
          break;
        
        case 'multi_choice':
          validator = z.array(z.string()).min(1, "Please select at least one option");
          break;
        
        default:
          validator = z.string();
      }
      
      if (question.required) {
        switch (question.type) {
          case 'boolean':
            validator = validator.refine((val) => val === true || val === false, {
              message: "This field is required"
            });
            break;
          case 'text':
          case 'single_choice':
            validator = validator.min(1, "This field is required");
            break;
          case 'number':
            validator = z.coerce.number({ required_error: "This field is required" });
            if (question.validation?.min !== undefined) {
              validator = validator.min(question.validation.min, `Minimum value is ${question.validation.min}`);
            }
            if (question.validation?.max !== undefined) {
              validator = validator.max(question.validation.max, `Maximum value is ${question.validation.max}`);
            }
            break;
          case 'date':
            validator = z.date({ required_error: "This field is required" });
            break;
          case 'multi_choice':
            // Already has min(1) validation built in
            break;
          default:
            validator = validator.min(1, "This field is required");
        }
      } else {
        validator = validator.optional();
      }
      
      schemaObject[`question_${question.id}`] = validator;
    });
    
    return z.object(schemaObject);
  };

  const validationSchema = createValidationSchema();
  type FormData = z.infer<typeof validationSchema>;

  // Create default values
  const createDefaultValues = () => {
    const defaults: Record<string, any> = {};
    
    survey.questions.forEach((question) => {
      switch (question.type) {
        case 'text':
          defaults[`question_${question.id}`] = "";
          break;
        case 'number':
          defaults[`question_${question.id}`] = undefined;
          break;
        case 'boolean':
          defaults[`question_${question.id}`] = undefined;
          break;
        case 'date':
          defaults[`question_${question.id}`] = undefined;
          break;
        case 'single_choice':
          defaults[`question_${question.id}`] = "";
          break;
        case 'multi_choice':
          defaults[`question_${question.id}`] = [];
          break;
        default:
          defaults[`question_${question.id}`] = "";
      }
    });
    
    return defaults;
  };

  const form = useForm<FormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: createDefaultValues(),
  });

  const submitSurveyMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Transform form data to answers object
      const answers: Record<string, any> = {};
      
      survey.questions.forEach((question) => {
        const fieldName = `question_${question.id}`;
        const value = formData[fieldName as keyof FormData];
        
        if (value !== undefined && value !== null && value !== "") {
          // Serialize Date objects to ISO strings for backend compatibility
          if (question.type === 'date' && value instanceof Date) {
            answers[question.id.toString()] = value.toISOString();
          } else {
            answers[question.id.toString()] = value;
          }
        }
      });

      const response = await fetch(`/api/caregiver/surveys/${assignment.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers,
          meta: {
            submittedAt: new Date().toISOString(),
            patientName: patientName,
            surveyTitle: survey.title
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit survey");
      }

      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/caregiver/surveys/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/caregiver/checkins/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/caregiver/checkins/completed"] });
      
      toast({
        title: "Survey Submitted",
        description: `Your responses for ${patientName} have been recorded successfully.`,
      });
      
      // Call completion callback after a brief delay
      setTimeout(() => {
        onComplete();
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: FormData) => {
    submitSurveyMutation.mutate(data);
  };

  const renderQuestion = (question: SurveyQuestion) => {
    const fieldName = `question_${question.id}` as keyof FormData;

    return (
      <FormField
        key={question.id}
        control={form.control}
        name={fieldName}
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel className="text-base font-medium">
              {question.text}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            
            <FormControl>
              {(() => {
                switch (question.type) {
                  case 'text':
                    return (
                      <Textarea
                        {...field}
                        placeholder="Enter your response"
                        rows={3}
                        data-testid={`question-${question.id}`}
                      />
                    );

                  case 'number':
                    return (
                      <Input
                        {...field}
                        type="number"
                        placeholder="Enter a number"
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        data-testid={`question-${question.id}`}
                      />
                    );

                  case 'boolean':
                    return (
                      <RadioGroup
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(value === "true")}
                        data-testid={`question-${question.id}`}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id={`${question.id}-yes`} />
                          <Label htmlFor={`${question.id}-yes`}>Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id={`${question.id}-no`} />
                          <Label htmlFor={`${question.id}-no`}>No</Label>
                        </div>
                      </RadioGroup>
                    );

                  case 'date':
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            data-testid={`question-${question.id}`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    );

                  case 'single_choice':
                    return (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        data-testid={`question-${question.id}`}
                      >
                        {question.options?.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`${question.id}-${option.id}`} />
                            <Label htmlFor={`${question.id}-${option.id}`}>{option.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    );

                  case 'multi_choice':
                    return (
                      <div className="space-y-2" data-testid={`question-${question.id}`}>
                        {question.options?.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value?.includes(option.value) || false}
                              onCheckedChange={(checked) => {
                                const currentValues = field.value || [];
                                if (checked) {
                                  field.onChange([...currentValues, option.value]);
                                } else {
                                  field.onChange(currentValues.filter((v: string) => v !== option.value));
                                }
                              }}
                            />
                            <Label htmlFor={`${question.id}-${option.id}`}>{option.label}</Label>
                          </div>
                        ))}
                      </div>
                    );

                  default:
                    return (
                      <Input
                        {...field}
                        placeholder="Enter your response"
                        data-testid={`question-${question.id}`}
                      />
                    );
                }
              })()}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  // Sort questions by order index
  const sortedQuestions = [...survey.questions].sort((a, b) => a.orderIndex - b.orderIndex);

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Survey Submitted!</h2>
            <p className="text-slate-600 mb-4">
              Thank you for completing the survey for {patientName}. Your responses have been recorded.
            </p>
            <Button onClick={onComplete} className="w-full" data-testid="button-back-to-dashboard">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              {onBack && (
                <Button variant="outline" size="sm" onClick={onBack} data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900">{survey.title}</h1>
                <p className="text-slate-600">Patient: {patientName}</p>
              </div>
            </div>
            
            {survey.description && (
              <Alert>
                <AlertDescription>{survey.description}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Survey Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Survey Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {sortedQuestions.map((question) => (
                    <div key={question.id} className="border-b border-slate-200 pb-6 last:border-b-0 last:pb-0">
                      {renderQuestion(question)}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={submitSurveyMutation.isPending}
                  className="min-w-[150px]"
                  data-testid="button-submit-survey"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {submitSurveyMutation.isPending ? "Submitting..." : "Submit Survey"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}