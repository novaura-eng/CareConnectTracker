import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Edit, Trash2, Send, Calendar, Users, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import SurveyAssignments from "./survey-assignments";

interface Survey {
  id: number;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export default function SurveyManager() {
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [isAssignmentsOpen, setIsAssignmentsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: surveys, isLoading } = useQuery({
    queryKey: ["/api/admin/surveys"],
  });

  const deleteSurveyMutation = useMutation({
    mutationFn: async (surveyId: number) => {
      const response = await fetch(`/api/admin/surveys/${surveyId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to delete survey");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/surveys"] });
      toast({
        title: "Survey Deleted",
        description: "Survey has been permanently deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete survey. Please try again.",
        variant: "destructive",
      });
    },
  });

  const publishSurveyMutation = useMutation({
    mutationFn: async (surveyId: number) => {
      const response = await fetch(`/api/admin/surveys/${surveyId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to publish survey");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/surveys"] });
      toast({
        title: "Survey Published",
        description: "Survey is now available for assignment to caregivers.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to publish survey. Please try again.",
        variant: "destructive",
      });
    },
  });

  const archiveSurveyMutation = useMutation({
    mutationFn: async (surveyId: number) => {
      const response = await fetch(`/api/admin/surveys/${surveyId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to archive survey");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/surveys"] });
      toast({
        title: "Survey Archived",
        description: "Survey has been archived and is no longer available for new assignments.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive survey. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateNew = () => {
    setLocation("/admin/surveys/builder");
  };

  const handleEditSurvey = (survey: Survey) => {
    setLocation(`/admin/surveys/builder/${survey.id}`);
  };

  const handleAssignSurvey = (survey: Survey) => {
    setSelectedSurvey(survey);
    setIsAssignmentsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-gray-600">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Custom Surveys</h2>
            <p className="text-sm text-slate-600">Create and manage dynamic surveys with custom questions</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Custom Surveys</h2>
          <p className="text-sm text-slate-600">Create and manage dynamic surveys with custom questions</p>
        </div>
        <Button onClick={handleCreateNew} data-testid="button-create-new-survey">
          <Plus className="mr-2 h-4 w-4" />
          Create New Survey
        </Button>
      </div>

      {/* Survey Grid */}
      {surveys && Array.isArray(surveys) && surveys.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(surveys as Survey[]).map((survey: Survey) => (
            <Card key={survey.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base line-clamp-2" data-testid={`text-survey-title-${survey.id}`}>
                      {survey.title}
                    </CardTitle>
                    {survey.description && (
                      <CardDescription className="text-sm line-clamp-2">
                        {survey.description}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-survey-menu-${survey.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditSurvey(survey)} data-testid={`button-edit-survey-${survey.id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {survey.status === 'published' && (
                        <DropdownMenuItem onClick={() => handleAssignSurvey(survey)} data-testid={`button-assign-survey-${survey.id}`}>
                          <Send className="mr-2 h-4 w-4" />
                          Assign to Caregivers
                        </DropdownMenuItem>
                      )}
                      {survey.status === 'draft' && (
                        <DropdownMenuItem onClick={() => publishSurveyMutation.mutate(survey.id)} data-testid={`button-publish-survey-${survey.id}`}>
                          <FileText className="mr-2 h-4 w-4" />
                          Publish
                        </DropdownMenuItem>
                      )}
                      {survey.status === 'published' && (
                        <DropdownMenuItem onClick={() => archiveSurveyMutation.mutate(survey.id)} data-testid={`button-archive-survey-${survey.id}`}>
                          <Calendar className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => deleteSurveyMutation.mutate(survey.id)}
                        className="text-red-600"
                        data-testid={`button-delete-survey-${survey.id}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  {getStatusBadge(survey.status)}
                  <div className="text-xs text-gray-500">
                    Updated {new Date(survey.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No surveys yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first custom survey to start collecting targeted data from caregivers.
            </p>
            <Button onClick={handleCreateNew} data-testid="button-create-first-survey">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Survey
            </Button>
          </CardContent>
        </Card>
      )}


      {/* Survey Assignments Dialog */}
      <Dialog open={isAssignmentsOpen} onOpenChange={setIsAssignmentsOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Assign Survey to Caregivers</DialogTitle>
            <DialogDescription>
              Choose which caregivers should complete this survey
            </DialogDescription>
          </DialogHeader>
          {selectedSurvey && (
            <SurveyAssignments 
              survey={selectedSurvey} 
              onClose={() => setIsAssignmentsOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}