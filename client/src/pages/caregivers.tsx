import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type InsertCaregiver, type Caregiver } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import InputMask from "react-input-mask";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Phone, Mail, MapPin, User, AlertCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";

export default function Caregivers() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(null);
  const [showPatients, setShowPatients] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [caregiverToDelete, setCaregiverToDelete] = useState<Caregiver | null>(null);

  const { data: caregivers, isLoading } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
  });

  const { data: patients } = useQuery<any[]>({
    queryKey: [`/api/patients/${selectedCaregiver?.id}`],
    enabled: !!selectedCaregiver && showPatients,
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    emergencyContact: "",
    state: "",
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Phone number formatting helper
  const formatPhoneNumber = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  // Helper functions
  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      emergencyContact: "",
      state: "",
      isActive: true,
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    
    const digits = formData.phone.replace(/\D/g, "");
    if (!formData.phone.trim()) {
      errors.phone = "Phone is required";
    } else if (digits.length !== 10) {
      errors.phone = "Please enter a valid 10-digit phone number";
    }
    
    if (!formData.state.trim()) errors.state = "State is required";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Format phone number before submitting
    const digits = formData.phone.replace(/\D/g, "");
    const formattedPhone = formatPhoneNumber(digits);

    const submitData: InsertCaregiver = {
      name: formData.name,
      phone: formattedPhone,
      email: formData.email || undefined,
      address: formData.address || undefined,
      emergencyContact: formData.emergencyContact || undefined,
      state: formData.state,
      isActive: formData.isActive,
    };

    createMutation.mutate(submitData);
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertCaregiver) => {
      if (selectedCaregiver) {
        // Update existing caregiver
        return apiRequest("PUT", `/api/caregivers/${selectedCaregiver.id}`, data);
      } else {
        // Create new caregiver
        return apiRequest("POST", "/api/caregivers", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
      setIsDialogOpen(false);
      setSelectedCaregiver(null);
      resetForm();
      toast({
        title: selectedCaregiver ? "Caregiver Updated" : "Caregiver Added",
        description: selectedCaregiver 
          ? "Caregiver information has been successfully updated."
          : "New caregiver has been successfully added to the system.",
      });
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: selectedCaregiver 
          ? "Failed to update caregiver. Please try again."
          : "Failed to add caregiver. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (caregiverId: number) => {
      return apiRequest("DELETE", `/api/caregivers/${caregiverId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
      setDeleteConfirmOpen(false);
      setCaregiverToDelete(null);
      toast({
        title: "Caregiver Deleted",
        description: "Caregiver has been successfully removed from the system.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to delete caregiver. Please try again.";
      toast({
        title: "Cannot Delete Caregiver",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Reset form when dialog state changes
  React.useEffect(() => {
    if (selectedCaregiver && isDialogOpen) {
      setFormData({
        name: selectedCaregiver.name,
        phone: selectedCaregiver.phone,
        email: selectedCaregiver.email || "",
        address: selectedCaregiver.address || "",
        emergencyContact: selectedCaregiver.emergencyContact || "",
        state: selectedCaregiver.state || "default",
        isActive: selectedCaregiver.isActive,
      });
    } else if (!selectedCaregiver && isDialogOpen) {
      resetForm();
    }
  }, [selectedCaregiver, isDialogOpen]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatPhone = (phone: string) => {
    // Simple phone number formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Hidden on mobile to avoid duplication with mobile nav */}
        <header className="hidden lg:block bg-white shadow-sm border-b border-slate-200">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Caregiver Management</h1>
                <p className="mt-1 text-sm text-slate-600">Manage caregiver profiles and contact information</p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) setSelectedCaregiver(null);
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setSelectedCaregiver(null)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Caregiver
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{selectedCaregiver ? "Edit Caregiver" : "Add New Caregiver"}</DialogTitle>
                    <DialogDescription>
                      {selectedCaregiver ? "Update the caregiver's information below." : "Enter the caregiver's contact details and information."}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter caregiver's full name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={formErrors.name ? "border-red-500" : ""}
                      />
                      {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <InputMask
                        mask="999-999-9999"
                        maskChar=""
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      >
                        {(inputProps: any) => (
                          <Input
                            {...inputProps}
                            id="phone"
                            type="tel"
                            placeholder="203-555-1234"
                            className={formErrors.phone ? "border-red-500" : ""}
                          />
                        )}
                      </InputMask>
                      {formErrors.phone && <p className="text-sm text-red-500">{formErrors.phone}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => setFormData({ ...formData, state: value })}
                      >
                        <SelectTrigger className={formErrors.state ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select a state" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Alabama">Alabama</SelectItem>
                          <SelectItem value="Alaska">Alaska</SelectItem>
                          <SelectItem value="Arizona">Arizona</SelectItem>
                          <SelectItem value="Arkansas">Arkansas</SelectItem>
                          <SelectItem value="California">California</SelectItem>
                          <SelectItem value="Colorado">Colorado</SelectItem>
                          <SelectItem value="Connecticut">Connecticut</SelectItem>
                          <SelectItem value="Delaware">Delaware</SelectItem>
                          <SelectItem value="Florida">Florida</SelectItem>
                          <SelectItem value="Georgia">Georgia</SelectItem>
                          <SelectItem value="Hawaii">Hawaii</SelectItem>
                          <SelectItem value="Idaho">Idaho</SelectItem>
                          <SelectItem value="Illinois">Illinois</SelectItem>
                          <SelectItem value="Indiana">Indiana</SelectItem>
                          <SelectItem value="Iowa">Iowa</SelectItem>
                          <SelectItem value="Kansas">Kansas</SelectItem>
                          <SelectItem value="Kentucky">Kentucky</SelectItem>
                          <SelectItem value="Louisiana">Louisiana</SelectItem>
                          <SelectItem value="Maine">Maine</SelectItem>
                          <SelectItem value="Maryland">Maryland</SelectItem>
                          <SelectItem value="Massachusetts">Massachusetts</SelectItem>
                          <SelectItem value="Michigan">Michigan</SelectItem>
                          <SelectItem value="Minnesota">Minnesota</SelectItem>
                          <SelectItem value="Mississippi">Mississippi</SelectItem>
                          <SelectItem value="Missouri">Missouri</SelectItem>
                          <SelectItem value="Montana">Montana</SelectItem>
                          <SelectItem value="Nebraska">Nebraska</SelectItem>
                          <SelectItem value="Nevada">Nevada</SelectItem>
                          <SelectItem value="New Hampshire">New Hampshire</SelectItem>
                          <SelectItem value="New Jersey">New Jersey</SelectItem>
                          <SelectItem value="New Mexico">New Mexico</SelectItem>
                          <SelectItem value="New York">New York</SelectItem>
                          <SelectItem value="North Carolina">North Carolina</SelectItem>
                          <SelectItem value="North Dakota">North Dakota</SelectItem>
                          <SelectItem value="Ohio">Ohio</SelectItem>
                          <SelectItem value="Oklahoma">Oklahoma</SelectItem>
                          <SelectItem value="Oregon">Oregon</SelectItem>
                          <SelectItem value="Pennsylvania">Pennsylvania</SelectItem>
                          <SelectItem value="Rhode Island">Rhode Island</SelectItem>
                          <SelectItem value="South Carolina">South Carolina</SelectItem>
                          <SelectItem value="South Dakota">South Dakota</SelectItem>
                          <SelectItem value="Tennessee">Tennessee</SelectItem>
                          <SelectItem value="Texas">Texas</SelectItem>
                          <SelectItem value="Utah">Utah</SelectItem>
                          <SelectItem value="Vermont">Vermont</SelectItem>
                          <SelectItem value="Virginia">Virginia</SelectItem>
                          <SelectItem value="Washington">Washington</SelectItem>
                          <SelectItem value="West Virginia">West Virginia</SelectItem>
                          <SelectItem value="Wisconsin">Wisconsin</SelectItem>
                          <SelectItem value="Wyoming">Wyoming</SelectItem>
                        </SelectContent>
                      </Select>
                      {formErrors.state && <p className="text-sm text-red-500">{formErrors.state}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (Optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="caregiver@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address">Address (Optional)</Label>
                      <Input
                        id="address"
                        placeholder="Street address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact">Emergency Contact (Optional)</Label>
                      <Input
                        id="emergencyContact"
                        placeholder="Emergency contact information"
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending 
                          ? (selectedCaregiver ? "Updating..." : "Adding...") 
                          : (selectedCaregiver ? "Update Caregiver" : "Add Caregiver")
                        }
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Mobile Add Caregiver Button - Only visible on mobile */}
        <div className="lg:hidden px-4 pt-4 pb-2">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setSelectedCaregiver(null);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedCaregiver(null)} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Caregiver
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{selectedCaregiver ? "Edit Caregiver" : "Add New Caregiver"}</DialogTitle>
                <DialogDescription>
                  {selectedCaregiver ? "Update the caregiver's information below." : "Enter the caregiver's contact details and information."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile-name">Full Name</Label>
                  <Input
                    id="mobile-name"
                    placeholder="Enter caregiver's full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={formErrors.name ? "border-red-500" : ""}
                  />
                  {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mobile-phone">Phone Number</Label>
                  <InputMask
                    mask="999-999-9999"
                    maskChar=""
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        id="mobile-phone"
                        type="tel"
                        placeholder="203-555-1234"
                        className={formErrors.phone ? "border-red-500" : ""}
                      />
                    )}
                  </InputMask>
                  {formErrors.phone && <p className="text-sm text-red-500">{formErrors.phone}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mobile-state">State</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger className={formErrors.state ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select a state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alabama">Alabama</SelectItem>
                      <SelectItem value="Alaska">Alaska</SelectItem>
                      <SelectItem value="Arizona">Arizona</SelectItem>
                      <SelectItem value="Arkansas">Arkansas</SelectItem>
                      <SelectItem value="California">California</SelectItem>
                      <SelectItem value="Colorado">Colorado</SelectItem>
                      <SelectItem value="Connecticut">Connecticut</SelectItem>
                      <SelectItem value="Delaware">Delaware</SelectItem>
                      <SelectItem value="Florida">Florida</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Hawaii">Hawaii</SelectItem>
                      <SelectItem value="Idaho">Idaho</SelectItem>
                      <SelectItem value="Illinois">Illinois</SelectItem>
                      <SelectItem value="Indiana">Indiana</SelectItem>
                      <SelectItem value="Iowa">Iowa</SelectItem>
                      <SelectItem value="Kansas">Kansas</SelectItem>
                      <SelectItem value="Kentucky">Kentucky</SelectItem>
                      <SelectItem value="Louisiana">Louisiana</SelectItem>
                      <SelectItem value="Maine">Maine</SelectItem>
                      <SelectItem value="Maryland">Maryland</SelectItem>
                      <SelectItem value="Massachusetts">Massachusetts</SelectItem>
                      <SelectItem value="Michigan">Michigan</SelectItem>
                      <SelectItem value="Minnesota">Minnesota</SelectItem>
                      <SelectItem value="Mississippi">Mississippi</SelectItem>
                      <SelectItem value="Missouri">Missouri</SelectItem>
                      <SelectItem value="Montana">Montana</SelectItem>
                      <SelectItem value="Nebraska">Nebraska</SelectItem>
                      <SelectItem value="Nevada">Nevada</SelectItem>
                      <SelectItem value="New Hampshire">New Hampshire</SelectItem>
                      <SelectItem value="New Jersey">New Jersey</SelectItem>
                      <SelectItem value="New Mexico">New Mexico</SelectItem>
                      <SelectItem value="New York">New York</SelectItem>
                      <SelectItem value="North Carolina">North Carolina</SelectItem>
                      <SelectItem value="North Dakota">North Dakota</SelectItem>
                      <SelectItem value="Ohio">Ohio</SelectItem>
                      <SelectItem value="Oklahoma">Oklahoma</SelectItem>
                      <SelectItem value="Oregon">Oregon</SelectItem>
                      <SelectItem value="Pennsylvania">Pennsylvania</SelectItem>
                      <SelectItem value="Rhode Island">Rhode Island</SelectItem>
                      <SelectItem value="South Carolina">South Carolina</SelectItem>
                      <SelectItem value="South Dakota">South Dakota</SelectItem>
                      <SelectItem value="Tennessee">Tennessee</SelectItem>
                      <SelectItem value="Texas">Texas</SelectItem>
                      <SelectItem value="Utah">Utah</SelectItem>
                      <SelectItem value="Vermont">Vermont</SelectItem>
                      <SelectItem value="Virginia">Virginia</SelectItem>
                      <SelectItem value="Washington">Washington</SelectItem>
                      <SelectItem value="West Virginia">West Virginia</SelectItem>
                      <SelectItem value="Wisconsin">Wisconsin</SelectItem>
                      <SelectItem value="Wyoming">Wyoming</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.state && <p className="text-sm text-red-500">{formErrors.state}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mobile-email">Email (Optional)</Label>
                  <Input
                    id="mobile-email"
                    type="email"
                    placeholder="caregiver@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mobile-address">Address (Optional)</Label>
                  <Input
                    id="mobile-address"
                    placeholder="Street address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mobile-emergencyContact">Emergency Contact (Optional)</Label>
                  <Input
                    id="mobile-emergencyContact"
                    placeholder="Emergency contact information"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending 
                      ? (selectedCaregiver ? "Updating..." : "Adding...") 
                      : (selectedCaregiver ? "Update Caregiver" : "Add Caregiver")
                    }
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <User className="h-5 w-5 text-primary-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-slate-600">Total Caregivers</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {isLoading ? "..." : (caregivers?.length || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-healthcare-100 rounded-lg flex items-center justify-center">
                        <Phone className="h-5 w-5 text-healthcare-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-slate-600">Active This Week</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {isLoading ? "..." : (caregivers?.filter((c: Caregiver) => c.isActive).length || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-slate-600">Need Attention</p>
                      <p className="text-2xl font-bold text-slate-900">0</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Caregivers Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Caregivers</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Caregiver</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Emergency Contact</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(caregivers?.length || 0) === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <div className="text-slate-500">
                                <User className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                <p className="text-lg font-medium">No caregivers found</p>
                                <p className="text-sm">Get started by adding your first caregiver</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          caregivers?.map((caregiver: Caregiver) => (
                            <TableRow key={caregiver.id} className="hover:bg-slate-50">
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-sm font-medium text-slate-600">
                                      {getInitials(caregiver.name)}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-slate-900">
                                      {caregiver.name}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                      ID: #{caregiver.id}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex items-center text-sm text-slate-900">
                                    <Phone className="h-4 w-4 mr-2 text-slate-400" />
                                    {formatPhone(caregiver.phone)}
                                  </div>
                                  {caregiver.email && (
                                    <div className="flex items-center text-sm text-slate-500">
                                      <Mail className="h-4 w-4 mr-2 text-slate-400" />
                                      {caregiver.email}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {caregiver.address ? (
                                  <div className="flex items-center text-sm text-slate-900">
                                    <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                                    {caregiver.address}
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-500">Not provided</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-slate-900">
                                  {caregiver.emergencyContact || "Not provided"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={caregiver.isActive ? "secondary" : "outline"}
                                  className={caregiver.isActive ? "bg-healthcare-100 text-healthcare-800" : ""}
                                >
                                  {caregiver.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCaregiver(caregiver);
                                      setIsDialogOpen(true);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCaregiver(caregiver);
                                      setShowPatients(true);
                                    }}
                                  >
                                    View Patients
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setCaregiverToDelete(caregiver);
                                      setDeleteConfirmOpen(true);
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Patients View Dialog */}
      <Dialog open={showPatients} onOpenChange={setShowPatients}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Patients for {selectedCaregiver?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {patients && patients.length > 0 ? (
              <div className="space-y-4">
                {patients.map((patient: any) => (
                  <div key={patient.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900">{patient.name}</h3>
                        <p className="text-sm text-slate-600">Medicaid ID: {patient.medicaidId}</p>
                        {patient.address && (
                          <p className="text-sm text-slate-500">{patient.address}</p>
                        )}
                      </div>
                      <Badge variant={patient.isActive ? "secondary" : "outline"}>
                        {patient.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-500">No patients found</p>
                <p className="text-sm text-slate-400">This caregiver has no assigned patients yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Caregiver</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{caregiverToDelete?.name}</strong>? 
              This action cannot be undone. All associated data including patients and check-ins may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCaregiverToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (caregiverToDelete) {
                  deleteMutation.mutate(caregiverToDelete.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}