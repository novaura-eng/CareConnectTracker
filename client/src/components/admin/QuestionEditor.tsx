import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Save, 
  X,
  List,
  Settings2
} from "lucide-react";

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

type QuestionForm = z.infer<typeof questionSchema>;

interface QuestionEditorProps {
  question: Question | null;
  onSave: (question: Question) => void;
  onCancel: () => void;
}

export default function QuestionEditor({ question, onSave, onCancel }: QuestionEditorProps) {
  const [options, setOptions] = useState<QuestionOption[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState("");

  const form = useForm<QuestionForm>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      text: "",
      type: "text",
      required: false,
      validation: {},
    },
  });

  const watchedType = form.watch("type");

  useEffect(() => {
    if (question) {
      form.reset({
        text: question.text,
        type: question.type,
        required: question.required,
        validation: question.validation || {},
      });
      setOptions(question.options || []);
    } else {
      form.reset({
        text: "",
        type: "text",
        required: false,
        validation: {},
      });
      setOptions([]);
    }
  }, [question, form]);

  const handleAddOption = () => {
    if (!newOptionLabel.trim()) return;
    
    const newOption: QuestionOption = {
      label: newOptionLabel.trim(),
      value: newOptionLabel.trim().toLowerCase().replace(/\s+/g, '_'),
      orderIndex: options.length,
    };
    
    setOptions([...options, newOption]);
    setNewOptionLabel("");
  };

  const handleUpdateOption = (index: number, field: 'label' | 'value', value: string) => {
    const updatedOptions = [...options];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    setOptions(updatedOptions);
  };

  const handleDeleteOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const moveOptionUp = (index: number) => {
    if (index === 0) return;
    const newOptions = [...options];
    [newOptions[index - 1], newOptions[index]] = [newOptions[index], newOptions[index - 1]];
    updateOptionOrder(newOptions);
  };

  const moveOptionDown = (index: number) => {
    if (index === options.length - 1) return;
    const newOptions = [...options];
    [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
    updateOptionOrder(newOptions);
  };

  const updateOptionOrder = (newOptions: QuestionOption[]) => {
    newOptions.forEach((option, index) => {
      option.orderIndex = index;
    });
    setOptions(newOptions);
  };

  const handleBulkAddOptions = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const newOptions = lines.map((line, index) => ({
      label: line.trim(),
      value: line.trim().toLowerCase().replace(/\s+/g, '_'),
      orderIndex: options.length + index,
    }));
    setOptions([...options, ...newOptions]);
  };

  const onSubmit = (data: QuestionForm) => {
    // Validate choice questions have at least 2 options
    const isChoiceQuestion = data.type === 'single_choice' || data.type === 'multi_choice';
    if (isChoiceQuestion && options.length < 2) {
      form.setError('type', {
        type: 'custom',
        message: `${getQuestionTypeLabel(data.type)} questions require at least 2 options`
      });
      return;
    }

    const questionData: Question = {
      ...data,
      id: question?.id,
      orderIndex: question?.orderIndex ?? 0,
      options: isChoiceQuestion ? options : undefined,
    };
    
    onSave(questionData);
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

  const isChoiceType = watchedType === 'single_choice' || watchedType === 'multi_choice';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          {question ? "Edit Question" : "Add New Question"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Question Configuration */}
            <div className="space-y-4">
              <FormField
                control={form.control}
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="required"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Required Question</FormLabel>
                        <FormDescription>
                          Must be answered to submit
                        </FormDescription>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                          data-testid="checkbox-question-required"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Type-Specific Configuration */}
            {watchedType === 'text' && (
              <Card className="bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Text Input Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="validation.minLength"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Length</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 5"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-min-length"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="validation.maxLength"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Length</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 100"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-max-length"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {watchedType === 'number' && (
              <Card className="bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Number Input Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="validation.min"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Value</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 0"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-min-value"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="validation.max"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Value</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 100"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-max-value"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Options Manager for Choice Questions */}
            {isChoiceType && (
              <Card className="bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Answer Options
                    <Badge variant="outline" className="ml-auto">
                      {options.length} option{options.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-gray-600">
                    {watchedType === 'single_choice' 
                      ? "Caregivers can select one option" 
                      : "Caregivers can select multiple options"
                    }
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add New Option */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter option text"
                      value={newOptionLabel}
                      onChange={(e) => setNewOptionLabel(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
                      className="flex-1"
                      data-testid="input-new-option"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddOption}
                      disabled={!newOptionLabel.trim()}
                      data-testid="button-add-option"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Bulk Add Options */}
                  <div className="border rounded-lg p-3 bg-blue-50">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-medium text-blue-900">Bulk Add Options</h4>
                      <Badge variant="outline" className="text-xs">Advanced</Badge>
                    </div>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Enter one option per line...\nExample:\nOption 1\nOption 2\nOption 3"
                        rows={4}
                        className="text-sm"
                        data-testid="textarea-bulk-options"
                        onChange={(e) => {
                          if (e.target.value.trim() && !e.target.value.endsWith('\n')) {
                            return; // Don't process until user is done typing
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            handleBulkAddOptions(e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-blue-700">
                          Type options (one per line) and click outside to add them
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const textarea = document.querySelector('[data-testid="textarea-bulk-options"]') as HTMLTextAreaElement;
                            if (textarea?.value.trim()) {
                              handleBulkAddOptions(textarea.value);
                              textarea.value = '';
                            }
                          }}
                          data-testid="button-process-bulk-options"
                        >
                          Add All
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Options List */}
                  {options.length > 0 && (
                    <div className="space-y-2">
                      <Separator />
                      {options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                          <div className="flex flex-col gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveOptionUp(index)}
                              disabled={index === 0}
                              className="h-5 w-5 p-0"
                              data-testid={`button-option-up-${index}`}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveOptionDown(index)}
                              disabled={index === options.length - 1}
                              className="h-5 w-5 p-0"
                              data-testid={`button-option-down-${index}`}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex-1 space-y-1">
                            <Input
                              value={option.label}
                              onChange={(e) => handleUpdateOption(index, 'label', e.target.value)}
                              placeholder="Option label"
                              className="text-sm h-8"
                              data-testid={`input-option-label-${index}`}
                            />
                            <Input
                              value={option.value}
                              onChange={(e) => handleUpdateOption(index, 'value', e.target.value)}
                              placeholder="Option value"
                              className="text-xs h-6 text-gray-600"
                              data-testid={`input-option-value-${index}`}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOption(index)}
                            className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                            data-testid={`button-delete-option-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {isChoiceType && options.length < 2 && (
                    <div className="text-center p-4 border-2 border-dashed border-red-200 bg-red-50 rounded text-sm text-red-700" data-testid="warning-minimum-options">
                      ⚠️ Add at least 2 options for {getQuestionTypeLabel(watchedType)} questions
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                data-testid="button-cancel-question"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isChoiceType && options.length < 2}
                data-testid="button-save-question"
              >
                <Save className="mr-2 h-4 w-4" />
                {question ? "Update Question" : "Add Question"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}