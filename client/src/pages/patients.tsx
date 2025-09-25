import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type InsertPatient, type Patient, type Caregiver } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import InputMask from "react-input-mask";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, User, MapPin, IdCard, Heart, Upload, Download, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";

export default function Patients() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: caregivers } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
  });

  const form = useForm<InsertPatient>({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      name: "",
      medicaidId: "",
      caregiverId: undefined,
      address: undefined,
      phoneNumber: undefined,
      emergencyContact: undefined,
      medicalConditions: undefined,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPatient) => {
      console.log("Creating patient with data:", data);
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.text();
        console.error("API Error:", response.status, errorData);
        throw new Error(`Failed to create patient: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      form.reset();
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Patient created successfully",
      });
    },
    onError: (error) => {
      console.error("Patient creation error:", error);
      toast({
        title: "Error",
        description: `Failed to create patient: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertPatient) => {
    createMutation.mutate(data);
  };

  // CSV Import functions
  const handleCsvImport = async () => {
    if (!csvFile) {
      toast({
        title: "Error",
        description: "Please select a CSV file first",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append('csvFile', csvFile);

    try {
      const response = await apiRequest("POST", "/api/patients/import", formData);
      const result = await response.json();

      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setCsvFile(null);
      setImportModalOpen(false);
      
      // Reset file inputs
      const fileInput1 = document.getElementById('csv-upload') as HTMLInputElement;
      const fileInput2 = document.getElementById('csv-upload-modal') as HTMLInputElement;
      if (fileInput1) fileInput1.value = '';
      if (fileInput2) fileInput2.value = '';

      toast({
        title: "Import Completed", 
        description: `Successfully imported ${result.imported} patients. ${result.skipped > 0 ? `Skipped ${result.skipped} duplicates.` : ''} ${result.errors && result.errors.length > 0 ? `${result.errors.length} errors encountered.` : ''}`,
      });
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error?.message || "Failed to import CSV file",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['name', 'medicaidId', 'address', 'phoneNumber', 'emergencyContact', 'medicalConditions', 'caregiverPhone', 'caregiverState', 'isActive'];
    const sampleData = [
      'John Doe,MED12345,123 Main St,(555) 123-4567,Jane Doe (555) 234-5678,Diabetes,(202) 555-0001,MD,true',
      'Mary Smith,MED67890,456 Oak Ave,,(555) 345-6789,Hypertension,(202) 555-0002,MD,true',
      'Bob Johnson,MED11111,789 Pine Rd,(555) 456-7890,Alice Johnson (555) 567-8901,,,true'
    ];
    
    const csvContent = [headers.join(','), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'patient-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateAndSetFile = (file: File) => {
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setCsvFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const getCaregiverName = (caregiverId: number) => {
    const caregiver = caregivers?.find(c => c.id === caregiverId);
    return caregiver?.name || "Unassigned";
  };

  return (
    <>
    <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6">
          {/* Header - Hidden on mobile to avoid duplication with mobile nav */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Patient Management</h1>
              <p className="text-slate-600">Manage patient records and caregiver assignments</p>
            </div>
            
            <div className="flex gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Patient
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Patient</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter patient name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="medicaidId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medicaid ID *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter Medicaid ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="caregiverId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign Caregiver</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select caregiver" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {caregivers?.filter(c => c.isActive).map((caregiver) => (
                                <SelectItem key={caregiver.id} value={caregiver.id.toString()}>
                                  {caregiver.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter address" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <InputMask
                              mask="999-999-9999"
                              maskChar=""
                              value={field.value || ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              inputRef={field.ref}
                            >
                              {(inputProps: any) => (
                                <Input
                                  {...inputProps}
                                  name={field.name}
                                  placeholder="203-555-1234"
                                  type="tel"
                                />
                              )}
                            </InputMask>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergencyContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter emergency contact" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="medicalConditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medical Conditions</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter medical conditions" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      className="w-full"
                    >
                      {createMutation.isPending ? "Creating..." : "Create Patient"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

              <Button
                variant="outline"
                onClick={() => setImportModalOpen(true)}
                data-testid="button-open-import-modal"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </div>
          </div>

          {/* Mobile Add Patient Button - Only visible on mobile */}
          <div className="lg:hidden mb-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Patient
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Patient</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter patient name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="medicaidId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medicaid ID *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter Medicaid ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="caregiverId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign Caregiver</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select caregiver" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {caregivers?.filter(c => c.isActive).map((caregiver) => (
                                <SelectItem key={caregiver.id} value={caregiver.id.toString()}>
                                  {caregiver.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter address" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <InputMask
                              mask="999-999-9999"
                              maskChar=""
                              value={field.value || ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              inputRef={field.ref}
                            >
                              {(inputProps: any) => (
                                <Input
                                  {...inputProps}
                                  name={field.name}
                                  placeholder="203-555-1234"
                                  type="tel"
                                />
                              )}
                            </InputMask>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergencyContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter emergency contact" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="medicalConditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medical Conditions</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter medical conditions" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      className="w-full"
                    >
                      {createMutation.isPending ? "Creating..." : "Create Patient"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Total Patients</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {isLoading ? "..." : (patients?.length || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Heart className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Active Patients</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {isLoading ? "..." : (patients?.filter(p => p.isActive).length || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <IdCard className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Assigned Patients</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {isLoading ? "..." : (patients?.filter(p => p.caregiverId).length || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Patients Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Patients</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Medicaid ID</TableHead>
                      <TableHead>Assigned Caregiver</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients && patients.length > 0 ? (
                      patients.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell className="font-medium">{patient.name}</TableCell>
                          <TableCell>{patient.medicaidId}</TableCell>
                          <TableCell>
                            {patient.caregiverId ? getCaregiverName(patient.caregiverId) : (
                              <Badge variant="outline">Unassigned</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {patient.address ? (
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                <span className="text-sm">{patient.address}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {patient.phoneNumber || (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={patient.isActive ? "secondary" : "outline"}>
                              {patient.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <User className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                          <p className="text-lg font-medium text-slate-500">No patients found</p>
                          <p className="text-sm text-slate-400">Add your first patient to get started</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Import CSV Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Patients from CSV</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* File Upload Area */}
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="csv-upload-modal"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-csv-file-modal"
              />
              <label 
                htmlFor="csv-upload-modal" 
                className="cursor-pointer block"
                data-testid="label-csv-file-modal"
              >
                <Upload className={`h-12 w-12 mx-auto mb-4 ${
                  isDragOver ? 'text-blue-500' : 'text-slate-400'
                }`} />
                <p className={`text-lg font-medium mb-2 ${
                  isDragOver ? 'text-blue-700' : 'text-slate-700'
                }`}>
                  {isDragOver ? 'Drop CSV file here' : 'Select or drag CSV file'}
                </p>
                <p className={`text-sm mb-4 ${
                  isDragOver ? 'text-blue-600' : 'text-slate-500'
                }`}>
                  {isDragOver 
                    ? 'Release to upload patient data'
                    : 'Upload a CSV file with patient data to import multiple patients at once'
                  }
                </p>
                {!isDragOver && (
                  <Button type="button" variant="outline">
                    Choose File
                  </Button>
                )}
              </label>
              
              {csvFile && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <IdCard className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">{csvFile.name}</span>
                      <span className="text-sm text-green-600">
                        ({(csvFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCsvFile(null)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* CSV Format Instructions */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h4 className="font-medium text-slate-900 mb-3">CSV Format Requirements</h4>
              <div className="text-sm text-slate-600 space-y-2">
                <p><strong>Required columns:</strong> name, medicaidId</p>
                <p><strong>Optional columns:</strong> address, phoneNumber, emergencyContact, medicalConditions, caregiverPhone, caregiverState, isActive</p>
                <p><strong>Notes:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Use caregiverPhone + caregiverState to assign patients to existing caregivers</li>
                  <li>Phone numbers should be 10 digits (formatting will be applied automatically)</li>
                  <li>isActive should be "true" or "false" (defaults to true if not provided)</li>
                  <li>Patients with duplicate Medicaid IDs will be skipped</li>
                </ul>
              </div>

              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  data-testid="button-download-template-modal"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setImportModalOpen(false);
                  setCsvFile(null);
                }}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCsvImport}
                disabled={!csvFile || isImporting}
                data-testid="button-import-patients"
              >
                {isImporting ? "Importing..." : "Import Patients"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}