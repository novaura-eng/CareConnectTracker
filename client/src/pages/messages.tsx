import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquare, Send, Users, CheckCircle, AlertCircle, User } from "lucide-react";
import type { Caregiver } from "@shared/schema";

const messageSchema = z.object({
  message: z.string()
    .min(1, "Message is required")
    .max(1600, "Message is too long (max 1600 characters)"),
  recipientType: z.enum(["individual", "multiple", "all"]),
  caregiverId: z.number().optional(),
  selectedCaregiversString: z.string().optional(),
});

type MessageFormData = z.infer<typeof messageSchema>;

export default function Messages() {
  const { toast } = useToast();
  const [selectedCaregivers, setSelectedCaregivers] = useState<number[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  // Fetch all caregivers for selection
  const { data: caregivers = [], isLoading: isLoadingCaregivers } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
  });

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: "",
      recipientType: "all",
      caregiverId: undefined,
      selectedCaregiversString: "",
    },
  });

  const recipientType = form.watch("recipientType");
  const messageContent = form.watch("message");

  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageFormData) => {
      if (data.recipientType === "individual") {
        return apiRequest("POST", "/api/admin/send-message", {
          caregiverId: data.caregiverId,
          message: data.message,
        });
      } else if (data.recipientType === "multiple") {
        return apiRequest("POST", "/api/admin/send-bulk-message", {
          caregiverIds: selectedCaregivers,
          message: data.message,
        });
      } else {
        // Send to all caregivers
        const allCaregiversIds = caregivers.map(c => c.id);
        return apiRequest("POST", "/api/admin/send-bulk-message", {
          caregiverIds: allCaregiversIds,
          message: data.message,
        });
      }
    },
    onSuccess: (response: any) => {
      setShowSuccess(true);
      setSendResult(response);
      form.reset({
        message: "",
        recipientType: "all",
        caregiverId: undefined,
        selectedCaregiversString: "",
      });
      setSelectedCaregivers([]);
      toast({
        title: "Message Sent Successfully",
        description: response.message || "Your message has been delivered.",
      });
      
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Message",
        description: error.message || "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MessageFormData) => {
    // Validate recipient selection
    if (data.recipientType === "individual" && !data.caregiverId) {
      toast({
        title: "Recipient Required",
        description: "Please select a caregiver to send the message to.",
        variant: "destructive",
      });
      return;
    }
    
    if (data.recipientType === "multiple" && selectedCaregivers.length === 0) {
      toast({
        title: "Recipients Required",
        description: "Please select at least one caregiver to send the message to.",
        variant: "destructive",
      });
      return;
    }
    
    sendMessageMutation.mutate(data);
  };

  const handleCaregiverToggle = (caregiverId: number) => {
    setSelectedCaregivers(prev =>
      prev.includes(caregiverId)
        ? prev.filter(id => id !== caregiverId)
        : [...prev, caregiverId]
    );
  };

  const selectAllCaregivers = () => {
    setSelectedCaregivers(caregivers.map(c => c.id));
  };

  const deselectAllCaregivers = () => {
    setSelectedCaregivers([]);
  };

  const getRecipientCount = () => {
    if (recipientType === "all") return caregivers.length;
    if (recipientType === "multiple") return selectedCaregivers.length;
    return 1;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-slate-900">Messages & Notifications</h1>
          </div>
          <p className="text-slate-600">
            Send SMS reminders and custom messages to caregivers
          </p>
        </div>

        {/* Success Alert */}
        {showSuccess && sendResult && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>{sendResult.message}</strong>
              {sendResult.errors && sendResult.errors.length > 0 && (
                <div className="mt-2 text-sm">
                  <p className="font-medium">Some messages failed:</p>
                  <ul className="list-disc list-inside mt-1">
                    {sendResult.errors.slice(0, 5).map((error: string, idx: number) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Message Composition Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Compose Message</CardTitle>
                <CardDescription>
                  Create and send SMS messages to your caregivers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Recipient Type Selection */}
                    <FormField
                      control={form.control}
                      name="recipientType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Send To</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-recipient-type">
                                <SelectValue placeholder="Select recipients" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">All Caregivers ({caregivers.length})</SelectItem>
                              <SelectItem value="multiple">Selected Caregivers</SelectItem>
                              <SelectItem value="individual">Individual Caregiver</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Individual Caregiver Selection */}
                    {recipientType === "individual" && (
                      <FormField
                        control={form.control}
                        name="caregiverId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Caregiver</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))} 
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-individual-caregiver">
                                  <SelectValue placeholder="Choose a caregiver" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {caregivers.map((caregiver) => (
                                  <SelectItem key={caregiver.id} value={caregiver.id.toString()}>
                                    {caregiver.name} ({caregiver.phone})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Message Field */}
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Type your message here... (e.g., 'Reminder: Please complete this week's check-ins by Friday.')"
                              className="min-h-[200px] resize-none"
                              data-testid="textarea-message"
                            />
                          </FormControl>
                          <FormDescription>
                            {messageContent.length} / 1600 characters
                            {messageContent.length > 160 && (
                              <span className="ml-2 text-amber-600">
                                (will be sent as {Math.ceil(messageContent.length / 160)} SMS messages)
                              </span>
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Send Button */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-slate-600">
                        <Users className="h-4 w-4 inline mr-1" />
                        Will send to <strong>{getRecipientCount()}</strong> caregiver{getRecipientCount() !== 1 ? 's' : ''}
                      </div>
                      <Button
                        type="submit"
                        disabled={sendMessageMutation.isPending || !messageContent}
                        className="min-w-[120px]"
                        data-testid="button-send-message"
                      >
                        {sendMessageMutation.isPending ? (
                          "Sending..."
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Caregiver Selection Panel (for multiple recipients) */}
          <div className="lg:col-span-1">
            {recipientType === "multiple" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Select Recipients</CardTitle>
                  <CardDescription>
                    Choose caregivers to receive this message
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Select/Deselect All */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAllCaregivers}
                        className="flex-1"
                        data-testid="button-select-all"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={deselectAllCaregivers}
                        className="flex-1"
                        data-testid="button-deselect-all"
                      >
                        Clear
                      </Button>
                    </div>

                    {/* Selected Count */}
                    <div className="text-sm text-slate-600 py-2 border-y">
                      {selectedCaregivers.length} of {caregivers.length} selected
                    </div>

                    {/* Caregiver List with Checkboxes */}
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {isLoadingCaregivers ? (
                        <p className="text-sm text-slate-500">Loading caregivers...</p>
                      ) : caregivers.length === 0 ? (
                        <p className="text-sm text-slate-500">No caregivers found</p>
                      ) : (
                        caregivers.map((caregiver) => (
                          <div
                            key={caregiver.id}
                            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 border border-slate-200"
                          >
                            <Checkbox
                              id={`caregiver-${caregiver.id}`}
                              checked={selectedCaregivers.includes(caregiver.id)}
                              onCheckedChange={() => handleCaregiverToggle(caregiver.id)}
                              data-testid={`checkbox-caregiver-${caregiver.id}`}
                            />
                            <label
                              htmlFor={`caregiver-${caregiver.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-slate-400" />
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {caregiver.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {caregiver.phone} • {caregiver.state}
                                  </p>
                                </div>
                              </div>
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Card */}
            {(recipientType === "all" || recipientType === "individual") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                    Messaging Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Keep messages clear and concise</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>SMS messages over 160 characters will be split</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Include deadlines or specific actions when needed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Be respectful of caregivers' time and schedules</span>
                    </li>
                  </ul>

                  <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-700 mb-2">Example Messages:</p>
                    <div className="space-y-2 text-xs text-slate-600">
                      <p className="italic">"Reminder: Weekly check-ins are due by Friday at 5 PM."</p>
                      <p className="italic">"Important update: New patient care protocols are available in your dashboard."</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
