import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCaregiverSchema, type InsertCaregiver, type Caregiver } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Phone, Mail, MapPin, User, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";

export default function Caregivers() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(null);
  const [showPatients, setShowPatients] = useState(false);

  const { data: caregivers, isLoading } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
  });

  const { data: patients } = useQuery<any[]>({
    queryKey: [`/api/patients/${selectedCaregiver?.id}`],
    enabled: !!selectedCaregiver && showPatients,
  });

  const form = useForm<InsertCaregiver>({
    resolver: zodResolver(insertCaregiverSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: undefined,
      address: undefined,
      emergencyContact: undefined,
      isActive: true,
    },
  });

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
      form.reset();
      toast({
        title: selectedCaregiver ? "Caregiver Updated" : "Caregiver Added",
        description: selectedCaregiver 
          ? "Caregiver information has been successfully updated."
          : "New caregiver has been successfully added to the system.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: selectedCaregiver 
          ? "Failed to update caregiver. Please try again."
          : "Failed to add caregiver. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reset form when dialog state changes
  React.useEffect(() => {
    if (selectedCaregiver && isDialogOpen) {
      form.reset({
        name: selectedCaregiver.name,
        phone: selectedCaregiver.phone,
        email: selectedCaregiver.email || "",
        address: selectedCaregiver.address || "",
        emergencyContact: selectedCaregiver.emergencyContact || "",
        isActive: selectedCaregiver.isActive,
      });
    } else if (!selectedCaregiver && isDialogOpen) {
      form.reset({
        name: "",
        phone: "",
        email: "",
        address: "",
        emergencyContact: "",
        isActive: true,
      });
    }
  }, [selectedCaregiver, isDialogOpen, form]);

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
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200">
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
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter caregiver's full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email (Optional)</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="caregiver@example.com" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Street address" {...field} value={field.value || ""} />
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
                            <FormLabel>Emergency Contact (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Emergency contact information" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

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
    </div>
  );
}