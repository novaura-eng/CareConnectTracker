import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Edit, 
  Save, 
  Eye,
  FileText,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import DynamicSurveyRenderer from "@/components/survey/dynamic-survey-renderer";
import QuestionEditor from "@/components/admin/QuestionEditor";

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

export default function AdminSurveyBuilder() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const [, setLocation] = useLocation();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [surveyData, setSurveyData] = useState<Survey | null>(null);
  const { toast } = useToast();

  const surveyForm = useForm<SurveyForm>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });


  // Load survey data if editing existing survey
  const { data: survey, isLoading: surveyLoading } = useQuery({
    queryKey: [`/api/admin/surveys/${surveyId}`],
    enabled: !!surveyId,
  });

  useEffect(() => {
    if (survey && typeof survey === 'object' && 'id' in survey) {
      const surveyData = survey as Survey;
      setSurveyData(surveyData);
      surveyForm.reset({
        title: surveyData.title,
        description: surveyData.description || "",
      });
      fetchSurveyQuestions(surveyData.id);
    }
  }, [survey]);

  const fetchSurveyQuestions = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/surveys/${id}/questions`);
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
      const url = surveyData?.id 
        ? `/api/admin/surveys/${surveyData.id}`
        : '/api/admin/surveys';
      
      const response = await fetch(url, {
        method: surveyData?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save survey");
      return response.json();
    },
    onSuccess: (savedSurvey: any) => {
      setSurveyData(savedSurvey);
      if (questions.length > 0) {
        saveQuestionsMutation.mutate({
          surveyId: savedSurvey.id,
          questions: questions
        });
      } else {
        toast({
          title: "Survey Saved",
          description: `Survey "${savedSurvey.title}" has been saved successfully.`,
        });
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
      toast({
        title: "Survey Saved",
        description: "Survey and questions have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save questions. Please try again.",
        variant: "destructive",
      });
    },
  });

  const publishSurveyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/surveys/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to publish survey");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/surveys/${surveyId}`] });
      toast({
        title: "Survey Published",
        description: "Survey is now available for assignment to caregivers.",
      });
      setLocation("/admin");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to publish survey. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSurvey = (data: SurveyForm) => {
    saveSurveyMutation.mutate(data);
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setEditingQuestionIndex(null);
    setIsEditorOpen(true);
  };

  const handleEditQuestion = (question: Question, index: number) => {
    setEditingQuestion(question);
    setEditingQuestionIndex(index);
    setIsEditorOpen(true);
  };

  const handleSaveQuestion = (question: Question) => {
    if (editingQuestion && editingQuestionIndex !== null) {
      // Update existing question at specific index
      const updatedQuestions = [...questions];
      updatedQuestions[editingQuestionIndex] = {
        ...question,
        id: editingQuestion.id, // Preserve original ID if it exists
        orderIndex: editingQuestionIndex // Preserve the order index
      };
      setQuestions(updatedQuestions);
    } else {
      // Add new question
      const newQuestion = {
        ...question,
        id: question.id || undefined, // Keep ID undefined for new questions until saved to backend
        orderIndex: questions.length,
      };
      setQuestions([...questions, newQuestion]);
    }

    setEditingQuestion(null);
    setEditingQuestionIndex(null);
    setIsEditorOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setEditingQuestionIndex(null);
    setIsEditorOpen(false);
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestionUp = (index: number) => {
    if (index === 0) return;
    const newQuestions = [...questions];
    [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
    updateQuestionOrder(newQuestions);
  };

  const moveQuestionDown = (index: number) => {
    if (index === questions.length - 1) return;
    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
    updateQuestionOrder(newQuestions);
  };

  const updateQuestionOrder = (newQuestions: Question[]) => {
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

  if (surveyLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/admin")}
                data-testid="button-back-to-admin"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {surveyData ? "Edit Survey" : "Create New Survey"}
                </h1>
                <p className="text-sm text-gray-600">
                  {surveyData ? `Editing: ${surveyData.title}` : "Build a custom survey with multiple question types"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {surveyData && (
                <Badge variant={surveyData.status === 'published' ? 'default' : 'secondary'}>
                  {surveyData.status}
                </Badge>
              )}
              <Button
                onClick={surveyForm.handleSubmit(handleSaveSurvey)}
                disabled={saveSurveyMutation.isPending || saveQuestionsMutation.isPending}
                data-testid="button-save-survey"
              >
                <Save className="mr-2 h-4 w-4" />
                {saveSurveyMutation.isPending || saveQuestionsMutation.isPending ? "Saving..." : "Save Survey"}
              </Button>
              {surveyData && surveyData.status === 'draft' && questions.length > 0 && (
                <Button
                  onClick={() => publishSurveyMutation.mutate(surveyData.id)}
                  disabled={publishSurveyMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-publish-survey"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {publishSurveyMutation.isPending ? "Publishing..." : "Publish"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Survey Builder */}
          <div className="space-y-6">
            {/* Survey Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Survey Details
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Questions Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Questions ({questions.length})</CardTitle>
                  <Button onClick={handleAddQuestion} size="sm" data-testid="button-add-question">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.length > 0 ? (
                  <div className="space-y-3">
                    {questions.map((question, index) => (
                      <div key={question.id || index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveQuestionUp(index)}
                              disabled={index === 0}
                              className="h-6 w-6 p-0"
                              data-testid={`button-move-up-${index}`}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveQuestionDown(index)}
                              disabled={index === questions.length - 1}
                              className="h-6 w-6 p-0"
                              data-testid={`button-move-down-${index}`}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <p className="font-medium" data-testid={`text-question-${index}`}>
                                  {index + 1}. {question.text}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-white px-2 py-1 rounded border">
                                    {getQuestionTypeLabel(question.type)}
                                  </span>
                                  {question.required && (
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                      Required
                                    </span>
                                  )}
                                  {(question.type === 'single_choice' || question.type === 'multi_choice') && question.options && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      {question.options.length} options
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditQuestion(question, index)}
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No questions added yet</p>
                    <Button onClick={handleAddQuestion} variant="outline" data-testid="button-add-first-question">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Question
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Question Editor */}
            {isEditorOpen && (
              <QuestionEditor
                question={editingQuestion}
                onSave={handleSaveQuestion}
                onCancel={handleCancelEdit}
              />
            )}
          </div>

          {/* Right Column - Live Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview
                </CardTitle>
                <p className="text-sm text-gray-600">See how your survey will appear to caregivers</p>
              </CardHeader>
              <CardContent>
                {questions.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <DynamicSurveyRenderer 
                      assignment={{
                        id: 1,
                        surveyId: surveyData?.id || 1,
                        caregiverId: 1,
                        patientId: 1,
                        dueAt: new Date().toISOString(),
                        status: 'pending',
                        assignedAt: new Date().toISOString(),
                        patientName: "Preview Patient"
                      }}
                      survey={{
                        id: surveyData?.id || 1,
                        title: surveyForm.getValues("title") || "New Survey",
                        description: surveyForm.getValues("description") || "",
                        status: "draft" as const,
                        questions: questions.map(q => ({
                          ...q,
                          id: q.id || Math.random(),
                          surveyId: surveyData?.id || 1,
                          options: q.options?.map(opt => ({
                            ...opt,
                            id: opt.id || Math.random()
                          }))
                        }))
                      }}
                      patientName="Preview Patient"
                      onComplete={() => {}}
                      onBack={() => {}}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                    <Eye className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No preview available</h3>
                    <p className="text-gray-600">
                      Add questions to see how your survey will look to caregivers
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}