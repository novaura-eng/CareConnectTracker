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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Settings,
  Calendar,
  Clock,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import DynamicSurveyRenderer from "@/components/survey/dynamic-survey-renderer";
import QuestionEditor from "@/components/admin/QuestionEditor";
import { US_STATE_CODES, StateCodeSchema, type StateCode } from "@shared/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, X, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface Survey {
  id: number;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  states?: StateCode[];
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

interface SurveySchedule {
  id: number;
  surveyId: number;
  scheduleType: 'one_time' | 'daily' | 'weekly' | 'monthly' | 'custom';
  frequencyValue?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay: string;
  startDate: string;
  endDate?: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  lastRun?: string;
  nextRun?: string;
}

const surveySchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be under 200 characters"),
  description: z.string().max(1000, "Description must be under 1000 characters").optional(),
  states: z.array(StateCodeSchema).optional().default([]),
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

const scheduleSchema = z.object({
  scheduleType: z.enum(['one_time', 'daily', 'weekly', 'monthly', 'custom']),
  frequencyValue: z.number().optional(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  timeOfDay: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format").default("09:00"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  timezone: z.string().min(1, "Timezone is required"),
}).refine((data) => {
  if (data.scheduleType === 'weekly' && data.dayOfWeek === undefined) {
    return false;
  }
  if (data.scheduleType === 'monthly' && data.dayOfMonth === undefined) {
    return false;
  }
  return true;
}, {
  message: "Invalid schedule configuration: weekly schedules need day of week, monthly schedules need day of month"
});

type SurveyForm = z.infer<typeof surveySchema>;
type QuestionForm = z.infer<typeof questionSchema>;
type ScheduleForm = z.infer<typeof scheduleSchema>;

export default function AdminSurveyBuilder() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const [, setLocation] = useLocation();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [surveyData, setSurveyData] = useState<Survey | null>(null);
  const [selectedStates, setSelectedStates] = useState<StateCode[]>([]);
  const [isStatesOpen, setIsStatesOpen] = useState(false);
  const [schedules, setSchedules] = useState<SurveySchedule[]>([]);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<SurveySchedule | null>(null);
  const { toast } = useToast();

  const surveyForm = useForm<SurveyForm>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      title: "",
      description: "",
      states: [],
    },
  });

  const scheduleForm = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      scheduleType: 'one_time',
      timeOfDay: '09:00',
      startDate: new Date().toISOString().split('T')[0],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });


  // Load survey data if editing existing survey
  const { data: survey, isLoading: surveyLoading } = useQuery({
    queryKey: [`/api/admin/surveys/${surveyId}`],
    enabled: !!surveyId,
  });

  // Load schedules for the survey
  const { data: surveySchedules, refetch: refetchSchedules } = useQuery({
    queryKey: [`/api/admin/surveys/${surveyId}/schedules`],
    enabled: !!surveyId,
  });

  useEffect(() => {
    if (surveySchedules && Array.isArray(surveySchedules)) {
      setSchedules(surveySchedules);
    }
  }, [surveySchedules]);

  useEffect(() => {
    if (survey && typeof survey === 'object' && 'id' in survey) {
      const surveyData = survey as Survey & { states?: StateCode[] };
      setSurveyData(surveyData);
      const states = surveyData.states || [];
      setSelectedStates(states);
      surveyForm.reset({
        title: surveyData.title,
        description: surveyData.description || "",
        states: states,
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
      
      const payload = {
        ...data,
        states: selectedStates
      };
      
      const response = await fetch(url, {
        method: surveyData?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  // Schedule mutations
  const createScheduleMutation = useMutation({
    mutationFn: async (scheduleData: ScheduleForm) => {
      return apiRequest("POST", `/api/admin/surveys/${surveyData?.id}/schedules`, scheduleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/surveys/${surveyData?.id}/schedules`] });
      setIsScheduleDialogOpen(false);
      scheduleForm.reset();
      toast({
        title: "Schedule Created",
        description: "Survey schedule has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ScheduleForm> }) => {
      return apiRequest("PATCH", `/api/admin/schedules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/surveys/${surveyId}/schedules`] });
      refetchSchedules();
      setEditingSchedule(null);
      setIsScheduleDialogOpen(false);
      toast({
        title: "Schedule Updated",
        description: "Survey schedule has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest("POST", `/api/admin/schedules/${id}/toggle`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/surveys/${surveyId}/schedules`] });
      refetchSchedules();
      toast({
        title: "Schedule Updated",
        description: "Schedule status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update schedule status. Please try again.",
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

  // Schedule helper functions
  const handleCreateSchedule = () => {
    setEditingSchedule(null);
    scheduleForm.reset({
      scheduleType: 'one_time',
      timeOfDay: '09:00',
      startDate: new Date().toISOString().split('T')[0],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setIsScheduleDialogOpen(true);
  };

  const handleEditSchedule = (schedule: SurveySchedule) => {
    setEditingSchedule(schedule);
    scheduleForm.reset({
      scheduleType: schedule.scheduleType,
      frequencyValue: schedule.frequencyValue,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      timeOfDay: schedule.timeOfDay || '09:00',
      startDate: schedule.startDate.split('T')[0],
      endDate: schedule.endDate ? schedule.endDate.split('T')[0] : undefined,
      timezone: schedule.timezone,
    });
    setIsScheduleDialogOpen(true);
  };

  const handleSaveSchedule = (data: ScheduleForm) => {
    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, data });
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const handleToggleSchedule = (schedule: SurveySchedule) => {
    toggleScheduleMutation.mutate({ id: schedule.id, isActive: !schedule.isActive });
  };

  const formatScheduleDescription = (schedule: SurveySchedule) => {
    if (schedule.scheduleType === 'one_time') {
      return `One-time on ${new Date(schedule.startDate).toLocaleDateString()}`;
    }
    
    let description = `${schedule.scheduleType.charAt(0).toUpperCase()}${schedule.scheduleType.slice(1)}`;
    
    if (schedule.scheduleType === 'weekly' && schedule.dayOfWeek !== undefined) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      description += ` on ${days[schedule.dayOfWeek]}`;
    }
    
    if (schedule.scheduleType === 'monthly' && schedule.dayOfMonth !== undefined) {
      description += ` on the ${schedule.dayOfMonth}${getOrdinalSuffix(schedule.dayOfMonth)}`;
    }
    
    if (schedule.timeOfDay) {
      description += ` at ${schedule.timeOfDay}`;
    }
    
    return description;
  };

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
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
          {/* Left Column - Tabbed Survey Builder */}
          <div className="space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="questions" data-testid="tab-questions">Questions ({questions.length})</TabsTrigger>
                <TabsTrigger value="schedule" data-testid="tab-schedule">Schedule ({schedules.length})</TabsTrigger>
              </TabsList>

              {/* Tab 1: Overview */}
              <TabsContent value="overview" className="space-y-6 mt-6">
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
                        
                        {/* State Selection */}
                        <div className="space-y-2">
                          <FormLabel className="text-sm font-medium">
                            <MapPin className="inline-block h-4 w-4 mr-1" />
                            Target States (Optional)
                          </FormLabel>
                          <FormDescription className="text-xs text-gray-500">
                            Select states where this survey will be used. Leave empty for all states.
                          </FormDescription>
                          <Popover open={isStatesOpen} onOpenChange={setIsStatesOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isStatesOpen}
                                className="w-full justify-between text-left font-normal"
                                data-testid="button-select-states"
                              >
                                {selectedStates.length === 0 
                                  ? "Select states..." 
                                  : selectedStates.length === 1 
                                    ? `${selectedStates[0]}` 
                                    : `${selectedStates.length} states selected`
                                }
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search states..." />
                                <CommandEmpty>No states found.</CommandEmpty>
                                <CommandList>
                                  <CommandGroup>
                                    {/* Select All / Clear All Options */}
                                    <CommandItem
                                      onSelect={() => {
                                        if (selectedStates.length === US_STATE_CODES.length) {
                                          // Clear all if all are selected
                                          setSelectedStates([]);
                                          surveyForm.setValue('states', []);
                                        } else {
                                          // Select all states
                                          setSelectedStates([...US_STATE_CODES]);
                                          surveyForm.setValue('states', [...US_STATE_CODES]);
                                        }
                                      }}
                                      className="font-medium border-b"
                                      data-testid="option-toggle-all-states"
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          selectedStates.length === US_STATE_CODES.length ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {selectedStates.length === US_STATE_CODES.length ? "Clear All States" : "Select All States"}
                                    </CommandItem>
                                    {US_STATE_CODES.map((stateCode) => (
                                      <CommandItem
                                        key={stateCode}
                                        value={stateCode}
                                        onSelect={() => {
                                          const newStates = selectedStates.includes(stateCode)
                                            ? selectedStates.filter(s => s !== stateCode)
                                            : [...selectedStates, stateCode];
                                          setSelectedStates(newStates);
                                          surveyForm.setValue('states', newStates);
                                        }}
                                        data-testid={`option-state-${stateCode}`}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            selectedStates.includes(stateCode) ? "opacity-100" : "opacity-0"
                                          }`}
                                        />
                                        {stateCode}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          
                          {/* Selected States Display */}
                          {selectedStates.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {selectedStates.map((state) => (
                                <Badge 
                                  key={state} 
                                  variant="secondary" 
                                  className="text-xs"
                                  data-testid={`badge-state-${state}`}
                                >
                                  {state}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newStates = selectedStates.filter(s => s !== state);
                                      setSelectedStates(newStates);
                                      surveyForm.setValue('states', newStates);
                                    }}
                                    className="ml-1 hover:bg-gray-300 rounded-full w-3 h-3 flex items-center justify-center"
                                    data-testid={`button-remove-state-${state}`}
                                  >
                                    <X className="h-2 w-2" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: Questions */}
              <TabsContent value="questions" className="space-y-6 mt-6">
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
              </TabsContent>

              {/* Tab 3: Schedule */}
              <TabsContent value="schedule" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Survey Schedules ({schedules.length})
                      </CardTitle>
                      {surveyData && (
                        <Button 
                          onClick={handleCreateSchedule} 
                          size="sm" 
                          data-testid="button-create-schedule"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create Schedule
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {surveyLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-pulse">
                          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-gray-500">Loading survey data...</p>
                        </div>
                      </div>
                    ) : !surveyData ? (
                      <div className="text-center py-8 text-orange-600 bg-orange-50 rounded-lg border border-orange-200">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium mb-2">Save survey first</p>
                        <p className="text-sm">You need to save the survey before you can manage schedules</p>
                      </div>
                    ) : schedules.length > 0 ? (
                      <div className="space-y-3">
                        {schedules.map((schedule) => (
                          <div key={schedule.id} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                                    {schedule.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {schedule.scheduleType === 'one_time' ? 'One-time' : 'Recurring'}
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  {formatScheduleDescription(schedule)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Timezone: {schedule.timezone}
                                  {schedule.nextRun && (
                                    <span className="ml-2">
                                      Next: {new Date(schedule.nextRun).toLocaleString()}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleSchedule(schedule)}
                                  disabled={toggleScheduleMutation.isPending}
                                  data-testid={`button-toggle-schedule-${schedule.id}`}
                                >
                                  {schedule.isActive ? (
                                    <ToggleRight className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditSchedule(schedule)}
                                  data-testid={`button-edit-schedule-${schedule.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium mb-2">No schedules created yet</p>
                        <p className="text-sm">Create a schedule to automate survey assignments</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
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
                        status: 'pending'
                      }}
                      survey={{
                        id: surveyData?.id || 1,
                        title: surveyForm.getValues("title") || "New Survey",
                        description: surveyForm.getValues("description") || "",
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

      {/* Schedule Creation/Editing Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? "Edit Schedule" : "Create Schedule"}
            </DialogTitle>
            <DialogDescription>
              Set up automated survey assignments with custom scheduling rules.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...scheduleForm}>
            <form onSubmit={scheduleForm.handleSubmit(handleSaveSchedule)} className="space-y-4">
              {/* Schedule Type */}
              <FormField
                control={scheduleForm.control}
                name="scheduleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schedule Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-schedule-type">
                          <SelectValue placeholder="Select schedule type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="one_time">One-time</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time of Day */}
              <FormField
                control={scheduleForm.control}
                name="timeOfDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time of Day</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        data-testid="input-time-of-day"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Day of Week (only for weekly) */}
              {scheduleForm.watch("scheduleType") === "weekly" && (
                <FormField
                  control={scheduleForm.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of Week</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-day-of-week">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Sunday</SelectItem>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Day of Month (only for monthly) */}
              {scheduleForm.watch("scheduleType") === "monthly" && (
                <FormField
                  control={scheduleForm.control}
                  name="dayOfMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of Month</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Day (1-31)"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          value={field.value || ""}
                          data-testid="input-day-of-month"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Start Date */}
              <FormField
                control={scheduleForm.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-start-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date (optional) */}
              <FormField
                control={scheduleForm.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-end-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Timezone */}
              <FormField
                control={scheduleForm.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., America/New_York"
                        {...field}
                        data-testid="input-timezone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dialog Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsScheduleDialogOpen(false)}
                  data-testid="button-cancel-schedule"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                  data-testid="button-save-schedule"
                >
                  {createScheduleMutation.isPending || updateScheduleMutation.isPending ? "Saving..." : "Save Schedule"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}