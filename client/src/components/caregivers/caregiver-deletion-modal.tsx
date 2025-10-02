import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {  Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertTriangle, Archive, UserPlus, Trash2 } from "lucide-react";
import type { Caregiver } from "@shared/schema";

interface CaregiverDeletionModalProps {
  caregiver: Caregiver | null;
  isOpen: boolean;
  onClose: () => void;
}

type DeletionOption = "reassign" | "archive" | "delete_all";

export default function CaregiverDeletionModal({ caregiver, isOpen, onClose }: CaregiverDeletionModalProps) {
  const { toast } = useToast();
  const [deletionOption, setDeletionOption] = useState<DeletionOption>("reassign");
  const [selectedNewCaregiver, setSelectedNewCaregiver] = useState<string>("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Fetch deletion info
  const { data: deletionInfo } = useQuery({
    queryKey: ["/api/caregivers", caregiver?.id, "deletion-info"],
    queryFn: () => fetch(`/api/caregivers/${caregiver?.id}/deletion-info`).then(res => res.json()),
    enabled: !!caregiver?.id && isOpen,
  });

  // Fetch all caregivers for reassignment
  const { data: allCaregivers = [] } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
    enabled: isOpen,
  });

  // Filter out the current caregiver from reassignment options
  const availableCaregivers = allCaregivers.filter(c => c.id !== caregiver?.id && c.isActive);

  const reassignMutation = useMutation({
    mutationFn: async ({ caregiverId, newCaregiverId }: { caregiverId: number; newCaregiverId: number }) => {
      await apiRequest("POST", `/api/caregivers/${caregiverId}/reassign-patients`, { newCaregiverId });
      return apiRequest("DELETE", `/api/caregivers/${caregiverId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
      toast({
        title: "Success",
        description: "Patients reassigned and caregiver deleted successfully.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reassign patients. Please try again.",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (caregiverId: number) => {
      return apiRequest("POST", `/api/caregivers/${caregiverId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
      toast({
        title: "Success",
        description: "Caregiver and patients archived successfully.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive caregiver. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async (caregiverId: number) => {
      return apiRequest("DELETE", `/api/caregivers/${caregiverId}?cascade=true`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
      toast({
        title: "Success",
        description: "Caregiver and all associated records deleted successfully.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete caregiver. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setDeletionOption("reassign");
    setSelectedNewCaregiver("");
    setDeleteConfirmText("");
    onClose();
  };

  const handleProceed = () => {
    if (!caregiver) return;

    if (deletionOption === "reassign") {
      if (!selectedNewCaregiver) {
        toast({
          title: "Selection Required",
          description: "Please select a caregiver to reassign patients to.",
          variant: "destructive",
        });
        return;
      }
      reassignMutation.mutate({
        caregiverId: caregiver.id,
        newCaregiverId: parseInt(selectedNewCaregiver),
      });
    } else if (deletionOption === "archive") {
      archiveMutation.mutate(caregiver.id);
    } else if (deletionOption === "delete_all") {
      if (deleteConfirmText !== "DELETE") {
        toast({
          title: "Confirmation Required",
          description: 'Please type "DELETE" to confirm permanent deletion.',
          variant: "destructive",
        });
        return;
      }
      deleteAllMutation.mutate(caregiver.id);
    }
  };

  const hasPatients = (deletionInfo?.patientCount || 0) > 0;
  const isPending = reassignMutation.isPending || archiveMutation.isPending || deleteAllMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Delete Caregiver: {caregiver?.name}</DialogTitle>
          <DialogDescription>
            {hasPatients ? (
              <span className="text-amber-600 font-medium">
                This caregiver has {deletionInfo?.patientCount} patient(s) and {deletionInfo?.checkInCount} check-in(s). 
                Please choose how to proceed.
              </span>
            ) : (
              "This caregiver has no associated patients. Confirm deletion below."
            )}
          </DialogDescription>
        </DialogHeader>

        {hasPatients ? (
          <div className="space-y-6 py-4">
            <RadioGroup value={deletionOption} onValueChange={(value) => setDeletionOption(value as DeletionOption)}>
              {/* Option 1: Reassign Patients */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                <RadioGroupItem value="reassign" id="reassign" className="mt-1" data-testid="radio-reassign" />
                <div className="flex-1">
                  <Label htmlFor="reassign" className="font-medium cursor-pointer flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                    Reassign Patients & Delete Caregiver
                  </Label>
                  <p className="text-sm text-slate-600 mt-1">
                    Transfer all patients to another caregiver before deletion. Patient history is preserved.
                  </p>
                  {deletionOption === "reassign" && (
                    <div className="mt-3">
                      <Label className="text-sm mb-2 block">Select new caregiver:</Label>
                      <Select value={selectedNewCaregiver} onValueChange={setSelectedNewCaregiver}>
                        <SelectTrigger data-testid="select-new-caregiver">
                          <SelectValue placeholder="Choose a caregiver..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCaregivers.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.name} ({c.state})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Option 2: Archive */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                <RadioGroupItem value="archive" id="archive" className="mt-1" data-testid="radio-archive" />
                <div className="flex-1">
                  <Label htmlFor="archive" className="font-medium cursor-pointer flex items-center gap-2">
                    <Archive className="h-4 w-4 text-green-600" />
                    Archive Caregiver & Patients
                  </Label>
                  <p className="text-sm text-slate-600 mt-1">
                    Hide from active lists but keep all data. Can be restored later if needed.
                  </p>
                </div>
              </div>

              {/* Option 3: Delete All */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                <RadioGroupItem value="delete_all" id="delete_all" className="mt-1" data-testid="radio-delete-all" />
                <div className="flex-1">
                  <Label htmlFor="delete_all" className="font-medium cursor-pointer flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-600" />
                    Permanently Delete All Records
                  </Label>
                  <p className="text-sm text-slate-600 mt-1">
                    Delete caregiver, all patients, and all check-in history. This cannot be undone.
                  </p>
                  {deletionOption === "delete_all" && (
                    <div className="mt-3">
                      <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-900 text-sm">
                          This will permanently delete {deletionInfo?.patientCount} patient(s) and {deletionInfo?.checkInCount} check-in(s). Type <strong>DELETE</strong> to confirm.
                        </AlertDescription>
                      </Alert>
                      <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder='Type "DELETE" to confirm'
                        className="mt-3"
                        data-testid="input-delete-confirm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>
        ) : (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              Are you sure you want to delete this caregiver? This action cannot be undone.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
            data-testid="button-cancel-deletion"
          >
            Cancel
          </Button>
          <Button
            variant={deletionOption === "delete_all" ? "destructive" : deletionOption === "archive" ? "secondary" : "default"}
            onClick={handleProceed}
            disabled={isPending}
            data-testid="button-confirm-deletion"
          >
            {isPending ? "Processing..." : deletionOption === "reassign" ? "Reassign & Delete" : deletionOption === "archive" ? "Archive" : "Delete All"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
