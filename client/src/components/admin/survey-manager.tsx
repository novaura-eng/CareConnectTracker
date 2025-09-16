import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, MoreVertical, Edit, Trash2, Send, Calendar, Users, FileText, MapPin, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { US_STATE_CODES, type StateCode } from "@shared/schema";
import SurveyAssignments from "./survey-assignments";

interface Survey {
  id: number;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  states?: StateCode[];
}

export default function SurveyManager() {
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [isAssignmentsOpen, setIsAssignmentsOpen] = useState(false);
  const [filterState, setFilterState] = useState<StateCode | "all">("all");
  const [selectedSurveyIds, setSelectedSurveyIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: surveyData, isLoading } = useQuery({
    queryKey: ["/api/admin/surveys", currentPage, pageSize],
    queryFn: async () => {
      const response = await fetch(`/api/admin/surveys?page=${currentPage}&limit=${pageSize}`);
      if (!response.ok) throw new Error('Failed to fetch surveys');
      return response.json();
    },
  });

  // Handle both paginated and non-paginated responses
  const surveys = surveyData?.surveys || surveyData || [];
  const pagination = surveyData?.pagination;

  // Filter surveys based on selected state
  const filteredSurveys = surveys && Array.isArray(surveys) ? (surveys as Survey[]).filter((survey: Survey) => {
    if (filterState === "all") return true;
    return survey.states && survey.states.includes(filterState);
  }) : [];

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

  const bulkDeleteSurveysMutation = useMutation({
    mutationFn: async (surveyIds: number[]) => {
      return await apiRequest("POST", "/api/admin/surveys/bulk-delete", { surveyIds });
    },
    onSuccess: (_, surveyIds) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/surveys"] });
      setSelectedSurveyIds(new Set());
      toast({
        title: "Surveys Deleted",
        description: `${surveyIds.length} survey(s) have been permanently deleted.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete surveys. Please try again.",
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

  const handleManageSchedule = (survey: Survey) => {
    setLocation(`/admin/surveys/builder/${survey.id}`);
  };

  // Bulk selection helper functions
  const handleSelectSurvey = (surveyId: number, checked: boolean) => {
    const newSelected = new Set(selectedSurveyIds);
    if (checked) {
      newSelected.add(surveyId);
    } else {
      newSelected.delete(surveyId);
    }
    setSelectedSurveyIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFilteredIds = new Set(filteredSurveys.map((survey: Survey) => survey.id));
      setSelectedSurveyIds(allFilteredIds);
    } else {
      setSelectedSurveyIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    const surveyIds = Array.from(selectedSurveyIds);
    
    if (surveyIds.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select surveys to delete.",
        variant: "destructive",
      });
      return;
    }
    
    bulkDeleteSurveysMutation.mutate(surveyIds);
  };

  // Selection state calculations
  const allFilteredSelected = filteredSurveys.length > 0 && filteredSurveys.every((survey: Survey) => selectedSurveyIds.has(survey.id));
  const someFilteredSelected = filteredSurveys.some((survey: Survey) => selectedSurveyIds.has(survey.id));
  const selectedCount = selectedSurveyIds.size;

  // Pagination helper functions
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setSelectedSurveyIds(new Set()); // Clear selections when changing pages
  };

  const handlePageSizeChange = (newPageSize: string) => {
    const size = parseInt(newPageSize);
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
    setSelectedSurveyIds(new Set()); // Clear selections
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

  const renderStatesBadges = (states?: StateCode[]) => {
    if (!states || states.length === 0) {
      return <span className="text-sm text-gray-500">All states</span>;
    }
    
    if (states.length <= 3) {
      return (
        <div className="flex flex-wrap gap-1">
          {states.map((state) => (
            <Badge key={state} variant="outline" className="text-xs">
              {state}
            </Badge>
          ))}
        </div>
      );
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {states.slice(0, 2).map((state) => (
          <Badge key={state} variant="outline" className="text-xs">
            {state}
          </Badge>
        ))}
        <Badge variant="outline" className="text-xs bg-gray-100">
          +{states.length - 2}
        </Badge>
      </div>
    );
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
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">States</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* State Filter */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <Select value={filterState} onValueChange={(value) => setFilterState(value as StateCode | "all")}>
              <SelectTrigger className="w-32" data-testid="select-state-filter">
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                {US_STATE_CODES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterState !== "all" && (
              <Button
                variant="ghost" 
                size="sm"
                onClick={() => setFilterState("all")}
                className="h-8 w-8 p-0"
                data-testid="button-clear-state-filter"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button onClick={handleCreateNew} data-testid="button-create-new-survey">
            <Plus className="mr-2 h-4 w-4" />
            Create New Survey
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedCount} survey(s) selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSurveyIds(new Set())}
              className="text-blue-700 hover:text-blue-900"
            >
              Clear selection
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={bulkDeleteSurveysMutation.isPending}
                  data-testid="button-bulk-delete-surveys"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedCount})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selected Surveys</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedCount} survey(s)? This action cannot be undone and will permanently delete all survey data, questions, responses, and schedules.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                    Delete {selectedCount} Survey(s)
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Survey Table */}
      {surveys && Array.isArray(surveys) && surveys.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all surveys"
                    data-testid="checkbox-select-all-surveys"
                    className="h-4 w-4 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">States</TableHead>
                <TableHead className="hidden sm:table-cell">Last Updated</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSurveys.map((survey: Survey) => (
                <TableRow key={survey.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedSurveyIds.has(survey.id)}
                      onCheckedChange={(checked) => handleSelectSurvey(survey.id, checked as boolean)}
                      aria-label={`Select survey ${survey.title}`}
                      data-testid={`checkbox-select-survey-${survey.id}`}
                      className="h-4 w-4 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <div className="font-semibold" data-testid={`text-survey-title-${survey.id}`}>
                        {survey.title}
                      </div>
                      {survey.description && (
                        <div className="text-sm text-gray-600 md:hidden line-clamp-1">
                          {survey.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="text-sm text-gray-600 line-clamp-2 max-w-xs">
                      {survey.description || "No description"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(survey.status)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {renderStatesBadges(survey.states)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="text-sm text-gray-500">
                      {new Date(survey.updatedAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
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
                          <>
                            <DropdownMenuItem onClick={() => handleAssignSurvey(survey)} data-testid={`button-assign-survey-${survey.id}`}>
                              <Send className="mr-2 h-4 w-4" />
                              Assign to Caregivers
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManageSchedule(survey)} data-testid={`button-manage-schedule-${survey.id}`}>
                              <Calendar className="mr-2 h-4 w-4" />
                              Manage Schedule
                            </DropdownMenuItem>
                          </>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Last Updated</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center">
                    <FileText className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No surveys yet</h3>
                    <p className="text-gray-600 mb-4">
                      Create your first custom survey to start collecting targeted data from caregivers.
                    </p>
                    <Button onClick={handleCreateNew} data-testid="button-create-first-survey">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Survey
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && (
        <div className="flex items-center justify-between border-t px-4 py-3 mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} surveys
            </span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPreviousPage}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNumber = Math.max(1, Math.min(
                  pagination.totalPages - 4,
                  Math.max(1, currentPage - 2)
                )) + i;
                
                if (pageNumber <= pagination.totalPages) {
                  return (
                    <Button
                      key={pageNumber}
                      variant={pageNumber === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNumber)}
                      className="w-8 h-8 p-0"
                      data-testid={`button-page-${pageNumber}`}
                    >
                      {pageNumber}
                    </Button>
                  );
                }
                return null;
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
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