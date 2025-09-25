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
import { Plus, Phone, Mail, MapPin, User, AlertCircle, Trash2, Key, Download, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
export default function Caregivers() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(null);
  const [showPatients, setShowPatients] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [caregiverToDelete, setCaregiverToDelete] = useState<Caregiver | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedCaregiverForPassword, setSelectedCaregiverForPassword] = useState<Caregiver | null>(null);
  const [newPassword, setNewPassword] = useState("");
  
  // CSV Import state - NEW FUNCTIONALITY
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter state
  const [stateFilter, setStateFilter] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");

  const { data: caregivers, isLoading } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
  });

  const { data: patients } = useQuery<any[]>({
    queryKey: [`/api/patients/${selectedCaregiver?.id}`],
    enabled: !!selectedCaregiver && showPatients,
  });

  // Filter caregivers based on state and search text
  const filteredCaregivers = React.useMemo(() => {
    if (!caregivers) return [];
    
    return caregivers.filter(caregiver => {
      // State filter (primary filter)
      if (stateFilter && caregiver.state !== stateFilter) {
        return false;
      }
      
      // Search text filter (secondary filters)
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        return (
          caregiver.name.toLowerCase().includes(searchLower) ||
          caregiver.phone.toLowerCase().includes(searchLower) ||
          (caregiver.email && caregiver.email.toLowerCase().includes(searchLower)) ||
          (caregiver.address && caregiver.address.toLowerCase().includes(searchLower)) ||
          (caregiver.emergencyContact && caregiver.emergencyContact.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
  }, [caregivers, stateFilter, searchText]);

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

  const setPasswordMutation = useMutation({
    mutationFn: async ({ caregiverId, password }: { caregiverId: number; password: string }) => {
      return apiRequest("POST", `/api/admin/caregivers/${caregiverId}/set-password`, { password });
    },
    onSuccess: () => {
      setPasswordDialogOpen(false);
      setSelectedCaregiverForPassword(null);
      setNewPassword("");
      toast({
        title: "Password Set",
        description: "Caregiver password has been successfully set.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to set password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSetPassword = () => {
    if (!selectedCaregiverForPassword || !newPassword.trim()) {
      toast({
        title: "Error",
        description: "Please enter a password.",
        variant: "destructive",
      });
      return;
    }
    
    setPasswordMutation.mutate({
      caregiverId: selectedCaregiverForPassword.id,
      password: newPassword,
    });
  };

  // CSV IMPORT FUNCTIONALITY - NEW
  const downloadTemplate = () => {
    const headers = ['name', 'phone', 'email', 'address', 'emergencyContact', 'state', 'isActive'];
    const exampleData = [
      'John Doe',
      '2035551234',
      'john.doe@example.com',
      '123 Main St, Anytown, CT 06511',
      'Jane Doe - 2035555678',
      'Connecticut',
      'true'
    ];
    
    const csvContent = [
      headers.join(','),
      exampleData.join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'caregiver_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file.",
        variant: "destructive",
      });
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to import.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append('csvFile', csvFile);

    try {
      const response = await apiRequest("POST", "/api/caregivers/import", formData);
      const result = await response.json();

      queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
      setCsvFile(null);
      setImportModalOpen(false);
      
      // Reset file inputs
      const fileInput1 = document.getElementById('csv-upload') as HTMLInputElement;
      const fileInput2 = document.getElementById('csv-upload-modal') as HTMLInputElement;
      if (fileInput1) fileInput1.value = '';
      if (fileInput2) fileInput2.value = '';

      toast({
        title: "Import Completed", 
        description: `Successfully imported ${result.imported} caregivers. ${result.skipped > 0 ? `Skipped ${result.skipped} duplicates.` : ''} ${result.errors && result.errors.length > 0 ? `${result.errors.length} errors encountered.` : ''}`,
      });
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error?.message || "Failed to import caregivers. Please check your CSV format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

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

  // Pagination calculations
  const totalItems = filteredCaregivers?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredCaregivers?.slice(startIndex, endIndex) || [];

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [stateFilter, searchText]);

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200">
            <div className="px-4 py-6 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Caregiver Management</h1>
                  <p className="mt-1 text-sm text-slate-600">Manage caregiver profiles and contact information</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* CSV Import Button */}
                  <Button 
                    variant="outline" 
                    onClick={() => setImportModalOpen(true)}
                    data-testid="button-open-import-modal"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </Button>
                  
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
            </div>
          </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Caregivers
              </CardTitle>
            </CardHeader>
            <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Filter Controls */}
                      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 rounded-lg border">
                        <div className="flex-1">
                          <Label htmlFor="state-filter" className="text-sm font-medium mb-2 block">
                            Filter by State (Primary)
                          </Label>
                          <Select value={stateFilter} onValueChange={setStateFilter}>
                            <SelectTrigger id="state-filter" data-testid="select-state-filter">
                              <SelectValue placeholder="All states" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All states</SelectItem>
                              {Array.from(new Set(caregivers?.map(c => c.state) || [])).sort().map(state => (
                                <SelectItem key={state} value={state}>{state}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex-1">
                          <Label htmlFor="search-filter" className="text-sm font-medium mb-2 block">
                            Search (Name, Phone, Email, Address)
                          </Label>
                          <Input
                            id="search-filter"
                            placeholder="Search caregivers..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            data-testid="input-search-filter"
                          />
                        </div>
                        
                        <div className="flex items-end">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setStateFilter("");
                              setSearchText("");
                              setCurrentPage(1);
                            }}
                            data-testid="button-clear-filters"
                          >
                            Clear Filters
                          </Button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Caregiver</TableHead>
                              <TableHead>Contact</TableHead>
                              <TableHead>Address</TableHead>
                              <TableHead>State</TableHead>
                              <TableHead>Emergency Contact</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(caregivers?.length || 0) === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                  <div className="text-slate-500">
                                    <User className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                    <p className="text-lg font-medium">No caregivers found</p>
                                    <p className="text-sm">Get started by adding your first caregiver</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              currentItems?.map((caregiver, index) => (
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
                                      <div className="flex items-center text-sm text-slate-600">
                                        <Mail className="h-4 w-4 mr-2 text-slate-400" />
                                        {caregiver.email}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {caregiver.address ? (
                                    <div className="flex items-center text-sm text-slate-600">
                                      <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                                      <span className="max-w-xs truncate">{caregiver.address}</span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-slate-400">No address</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-slate-600 font-medium">{caregiver.state || 'N/A'}</span>
                                </TableCell>
                                <TableCell>
                                  {caregiver.emergencyContact ? (
                                    <span className="text-sm text-slate-600">{caregiver.emergencyContact}</span>
                                  ) : (
                                    <span className="text-sm text-slate-400">Not provided</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={caregiver.isActive ? "secondary" : "outline"}>
                                    {caregiver.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
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
                                        setSelectedCaregiverForPassword(caregiver);
                                        setPasswordDialogOpen(true);
                                      }}
                                      className="text-blue-600 hover:text-blue-700"
                                    >
                                      <Key className="h-4 w-4 mr-1" />
                                      Set Password
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

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                        <div className="flex items-center text-sm text-slate-600">
                          Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} caregivers
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            data-testid="button-prev-page"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter(page => {
                                if (totalPages <= 7) return true;
                                if (page === 1 || page === totalPages) return true;
                                if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                                return false;
                              })
                              .map((page, index, array) => (
                                <div key={page} className="flex items-center">
                                  {index > 0 && array[index - 1] !== page - 1 && (
                                    <span className="px-2 text-slate-400">...</span>
                                  )}
                                  <Button
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => goToPage(page)}
                                    className="min-w-[40px]"
                                    data-testid={`button-page-${page}`}
                                  >
                                    {page}
                                  </Button>
                                </div>
                              ))
                            }
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            data-testid="button-next-page"
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                      )}
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (caregiverToDelete) {
                  deleteMutation.mutate(caregiverToDelete.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Password for {selectedCaregiverForPassword?.name}</DialogTitle>
            <DialogDescription>
              Enter a new password for this caregiver. They will use this to log into their portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
                data-testid="input-new-password"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPasswordDialogOpen(false);
                  setSelectedCaregiverForPassword(null);
                  setNewPassword("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSetPassword}
                disabled={setPasswordMutation.isPending || !newPassword.trim()}
              >
                {setPasswordMutation.isPending ? "Setting..." : "Set Password"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Import Modal - NEW FUNCTIONALITY */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Caregivers from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk import caregivers. Make sure your file includes all required fields.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input
                type="file"
                id="csv-upload-modal"
                accept=".csv"
                onChange={handleCsvFileChange}
                className="hidden"
                data-testid="input-csv-file-modal"
              />
              
              {!csvFile ? (
                <div>
                  <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('csv-upload-modal')?.click()}
                      data-testid="button-select-csv-modal"
                    >
                      Select CSV File
                    </Button>
                    <p className="text-sm text-slate-500">
                      Choose a CSV file from your computer
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="font-medium text-slate-900">{csvFile.name}</p>
                      <p className="text-sm text-slate-500">{(csvFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setCsvFile(null);
                      const fileInput = document.getElementById('csv-upload-modal') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                    data-testid="button-remove-csv"
                  >
                    Remove File
                  </Button>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="text-sm text-slate-600 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">Required CSV Format:</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadTemplate}
                  data-testid="button-download-template-modal"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
              <p>Your CSV must include these columns: <span className="font-mono text-xs bg-slate-100 px-1 rounded">name, phone, email, address, emergencyContact, state, isActive</span></p>
              <p>• Name, phone, and state are required fields</p>
              <p>• Phone numbers should be 10 digits</p>
              <p>• isActive should be "true" or "false"</p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setImportModalOpen(false);
                  setCsvFile(null);
                  const fileInput = document.getElementById('csv-upload-modal') as HTMLInputElement;
                  if (fileInput) fileInput.value = '';
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCsvImport}
                disabled={!csvFile || isImporting}
                data-testid="button-import-csv-modal"
              >
                {isImporting ? 'Importing...' : 'Import Caregivers'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}