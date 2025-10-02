import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, Save, ArrowUp, ArrowDown, CheckCircle, Settings2 } from "lucide-react";
import type { CheckInQuestionTemplate } from "@shared/schema";

const templateSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  helpText: z.string().optional(),
  detailsPrompt: z.string().optional(),
  isEnabled: z.boolean(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

export default function CheckInTemplates() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: templates = [], isLoading } = useQuery<CheckInQuestionTemplate[]>({
    queryKey: ["/api/admin/checkin-templates"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TemplateFormData }) => {
      return apiRequest("PUT", `/api/admin/checkin-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/checkin-templates"] });
      setEditingId(null);
      toast({
        title: "Template Updated",
        description: "The question template has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (templateIds: number[]) => {
      return apiRequest("PUT", "/api/admin/checkin-templates/reorder", { templateIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/checkin-templates"] });
      toast({
        title: "Templates Reordered",
        description: "Question order has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reorder Failed",
        description: error.message || "Failed to reorder templates.",
        variant: "destructive",
      });
    },
  });

  const moveTemplate = (index: number, direction: "up" | "down") => {
    const newTemplates = [...templates];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newTemplates.length) return;
    
    [newTemplates[index], newTemplates[targetIndex]] = [newTemplates[targetIndex], newTemplates[index]];
    const newOrder = newTemplates.map(t => t.id);
    reorderMutation.mutate(newOrder);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-slate-900">Check-In Question Templates</h1>
          </div>
          <p className="text-slate-600">
            Customize the questions caregivers see in their weekly patient assessments
          </p>
        </div>

        {/* Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Changes apply to new assessments</p>
                <p>Modified questions will appear in all future weekly check-ins. Existing completed assessments remain unchanged.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-slate-500">Loading templates...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {templates.map((template, index) => (
              <TemplateCard
                key={template.id}
                template={template}
                index={index}
                totalCount={templates.length}
                isEditing={editingId === template.id}
                onEdit={() => setEditingId(template.id)}
                onCancel={() => setEditingId(null)}
                onSave={(data) => updateMutation.mutate({ id: template.id, data })}
                onMoveUp={() => moveTemplate(index, "up")}
                onMoveDown={() => moveTemplate(index, "down")}
                isSaving={updateMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: CheckInQuestionTemplate;
  index: number;
  totalCount: number;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (data: TemplateFormData) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isSaving: boolean;
}

function TemplateCard({
  template,
  index,
  totalCount,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onMoveUp,
  onMoveDown,
  isSaving,
}: TemplateCardProps) {
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      questionText: template.questionText,
      helpText: template.helpText || "",
      detailsPrompt: template.detailsPrompt || "",
      isEnabled: template.isEnabled,
    },
  });

  if (!isEditing) {
    return (
      <Card className={!template.isEnabled ? "opacity-60" : ""}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-slate-500">Question {template.order}</span>
                {!template.isEnabled && (
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Disabled</span>
                )}
              </div>
              <CardTitle className="text-lg">{template.questionText}</CardTitle>
              {template.helpText && (
                <CardDescription className="mt-2">{template.helpText}</CardDescription>
              )}
              {template.requiresDetails && template.detailsPrompt && (
                <p className="text-sm text-slate-600 mt-2 italic">
                  Follow-up: "{template.detailsPrompt}"
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMoveUp}
                  disabled={index === 0}
                  data-testid={`button-move-up-${template.id}`}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMoveDown}
                  disabled={index === totalCount - 1}
                  data-testid={`button-move-down-${template.id}`}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={onEdit}
                data-testid={`button-edit-${template.id}`}
              >
                <FileText className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="text-lg">
          Editing Question {template.order}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
            <FormField
              control={form.control}
              name="questionText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Text</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter the main question..."
                      className="min-h-[80px]"
                      data-testid="textarea-question-text"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="helpText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Help Text (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional guidance or examples..."
                      className="min-h-[60px]"
                      data-testid="textarea-help-text"
                    />
                  </FormControl>
                  <FormDescription>
                    Helpful context that appears below the question
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {template.requiresDetails && (
              <FormField
                control={form.control}
                name="detailsPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Follow-up Details Prompt (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Please provide details..."
                        data-testid="input-details-prompt"
                      />
                    </FormControl>
                    <FormDescription>
                      Prompt shown when user answers "Yes"
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="isEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable this question</FormLabel>
                    <FormDescription>
                      Disabled questions won't appear in check-in assessments
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-is-enabled"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                disabled={isSaving}
                data-testid="button-save-template"
              >
                {isSaving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSaving}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
