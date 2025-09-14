import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical, Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Survey {
  id: number;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
}

interface Question {
  id?: number;
  text: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'single_choice' | 'multi_choice';
  required: boolean;
  orderIndex: number;
  validation?: any;
  options?: QuestionOption[];
}

interface QuestionOption {
  id?: number;
  value: string;
  label: string;
  orderIndex: number;
}

const surveySchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be under 200 characters"),
  description: z.string().max(1000, "Description must be under 1000 characters").optional(),
});

const questionSchema = z.object({
  text: z.string().min(1, "Question text is required").max(500, "Question text must be under 500 characters"),
  type: z.enum(['text', 'number', 'boolean', 'date', 'single_choice', 'multi_choice']),
  required: z.boolean(),
  validation: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
});

type SurveyForm = z.infer<typeof surveySchema>;
type QuestionForm = z.infer<typeof questionSchema>;

interface SurveyBuilderProps {
  survey: Survey | null;
  onClose: () => void;
}

export default function SurveyBuilder({ survey, onClose }: SurveyBuilderProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const { toast } = useToast();

  const surveyForm = useForm<SurveyForm>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      title: survey?.title || "",
      description: survey?.description || "",
    },
  });

  const questionForm = useForm<QuestionForm>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      text: "",
      type: "text",
      required: false,
      validation: {},
    },
  });

  // Load existing questions if editing a survey
  useEffect(() => {
    if (survey?.id) {
      // Fetch questions for existing survey
      fetchSurveyQuestions(survey.id);
    }
  }, [survey]);

  const fetchSurveyQuestions = async (surveyId: number) => {
    try {
      const response = await fetch(`/api/admin/surveys/${surveyId}/questions`);
      if (response.ok) {
        const questionsData = await response.json();
        setQuestions(questionsData);
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    }
  };

  const saveSurveyMutation = useMutation({
    mutationFn: async (data: SurveyForm) => {
      const url = survey?.id 
        ? `/api/admin/surveys/${survey.id}`
        : '/api/admin/surveys';
      
      const response = await fetch(url, {
        method: survey?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save survey");
      return response.json();
    },
    onSuccess: (savedSurvey: any) => {
      // Save questions after survey is saved
      if (questions.length > 0) {
        saveQuestionsMutation.mutate({
          surveyId: savedSurvey.id,
          questions: questions
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/surveys"] });
        toast({
          title: "Survey Saved",
          description: `Survey "${savedSurvey.title}" has been saved successfully.`,
        });
        onClose();
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save survey. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveQuestionsMutation = useMutation({
    mutationFn: async ({ surveyId, questions }: { surveyId: number; questions: Question[] }) => {
      const response = await fetch(`/api/admin/surveys/${surveyId}/questions/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      if (!response.ok) throw new Error("Failed to save questions");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/surveys"] });
      toast({
        title: "Survey Saved",
        description: "Survey and questions have been saved successfully.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save questions. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSurvey = (data: SurveyForm) => {
    saveSurveyMutation.mutate(data);
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    questionForm.reset({
      text: "",
      type: "text",
      required: false,
      validation: {},
    });
    setIsQuestionDialogOpen(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    questionForm.reset({
      text: question.text,
      type: question.type,
      required: question.required,
      validation: question.validation || {},
    });
    setIsQuestionDialogOpen(true);
  };

  const handleSaveQuestion = (data: QuestionForm) => {
    const newQuestion: Question = {
      ...data,
      id: editingQuestion?.id,
      orderIndex: editingQuestion?.orderIndex || questions.length,
      options: editingQuestion?.options || [],
    };

    if (editingQuestion) {
      setQuestions(questions.map(q => q.id === editingQuestion.id ? newQuestion : q));
    } else {
      setQuestions([...questions, newQuestion]);
    }

    setIsQuestionDialogOpen(false);
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    const newQuestions = [...questions];
    const [removed] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, removed);
    
    // Update order indices
    newQuestions.forEach((q, index) => {
      q.orderIndex = index;
    });
    
    setQuestions(newQuestions);
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return 'Text Input';
      case 'number': return 'Number Input';
      case 'boolean': return 'Yes/No';
      case 'date': return 'Date Picker';
      case 'single_choice': return 'Single Choice';
      case 'multi_choice': return 'Multiple Choice';
      default: return type;
    }
  };

  return (
    <div className="space-y-6 max-h-[75vh] overflow-y-auto">
      {/* Survey Details Form */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Survey Details</h3>
        <Form {...surveyForm}>
          <form onSubmit={surveyForm.handleSubmit(handleSaveSurvey)} className="space-y-4">
            <FormField
              control={surveyForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Survey Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter survey title" {...field} data-testid="input-survey-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={surveyForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the purpose of this survey"
                      {...field}
                      rows={3}
                      data-testid="input-survey-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>

      {/* Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Questions ({questions.length})</h3>
          <Button onClick={handleAddQuestion} size="sm" data-testid="button-add-question">
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>

        {questions.length > 0 ? (
          <div className="space-y-3">
            {questions.map((question, index) => (
              <Card key={question.id || index} className="p-4">
                <div className="flex items-start gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-8 w-8 cursor-grab"
                    data-testid={`button-move-question-${index}`}
                  >
                    <GripVertical className="h-4 w-4 text-gray-400" />
                  </Button>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium" data-testid={`text-question-${index}`}>
                          {index + 1}. {question.text}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {getQuestionTypeLabel(question.type)}
                          </span>
                          {question.required && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditQuestion(question)}
                          data-testid={`button-edit-question-${index}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQuestion(index)}
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-delete-question-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-gray-500 mb-4">No questions added yet</p>
            <Button onClick={handleAddQuestion} variant="outline" data-testid="button-add-first-question">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Question
            </Button>
          </Card>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-survey">
          Cancel
        </Button>
        <Button 
          onClick={surveyForm.handleSubmit(handleSaveSurvey)}
          disabled={saveSurveyMutation.isPending || saveQuestionsMutation.isPending}
          data-testid="button-save-survey"
        >
          <Save className="mr-2 h-4 w-4" />
          {saveSurveyMutation.isPending || saveQuestionsMutation.isPending ? "Saving..." : "Save Survey"}
        </Button>
      </div>

      {/* Question Builder Dialog */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Edit Question" : "Add New Question"}
            </DialogTitle>
            <DialogDescription>
              Configure your question type and validation rules
            </DialogDescription>
          </DialogHeader>
          <Form {...questionForm}>
            <form onSubmit={questionForm.handleSubmit(handleSaveQuestion)} className="space-y-4">
              <FormField
                control={questionForm.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Text</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your question"
                        {...field}
                        rows={3}
                        data-testid="input-question-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={questionForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-question-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text Input</SelectItem>
                          <SelectItem value="number">Number Input</SelectItem>
                          <SelectItem value="boolean">Yes/No</SelectItem>
                          <SelectItem value="date">Date Picker</SelectItem>
                          <SelectItem value="single_choice">Single Choice</SelectItem>
                          <SelectItem value="multi_choice">Multiple Choice</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Choose how caregivers will answer this question
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={questionForm.control}
                name="required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Required Question</FormLabel>
                      <FormDescription>
                        Caregivers must answer this question to submit
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="data-[state=checked]:bg-primary"
                        data-testid="checkbox-question-required"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsQuestionDialogOpen(false)} data-testid="button-cancel-question">
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-save-question">
                  {editingQuestion ? "Update Question" : "Add Question"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}