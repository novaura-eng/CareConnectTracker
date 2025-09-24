import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, HeartHandshake, Phone, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import InputMask from "react-input-mask";

const forgotPasswordSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function CaregiverForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);

  // Get state from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const state = urlParams.get("state") || "";

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      phone: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      return await apiRequest("POST", "/api/caregiver/forgot-password", {
        ...data,
        state,
      });
    },
    onSuccess: () => {
      setSuccess(true);
      toast({
        title: "Password Reset Requested",
        description: "If your account exists, you will receive password reset instructions.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Unable to process password reset request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(data);
  };

  const handleBackToLogin = () => {
    setLocation(`/caregiver/login?state=${state}`);
  };

  const handleBackToHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <HeartHandshake className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-3xl font-bold text-slate-900">Silver CareConnect</h1>
          </div>
          <p className="text-lg text-slate-600">
            Forgot Password - {state}
          </p>
        </div>

        {/* Forgot Password Card */}
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Reset Your Password</CardTitle>
              <CardDescription>
                Enter your phone number and we'll send you password reset instructions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="space-y-4 text-center">
                  <div className="flex justify-center">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium text-slate-900">
                      Password Reset Requested
                    </h3>
                    <p className="text-sm text-slate-600">
                      If a caregiver account exists with this phone number and state, 
                      password reset instructions have been sent to your email address.
                    </p>
                    <p className="text-sm text-slate-500">
                      If you don't have an email on file, please contact your administrator.
                    </p>
                  </div>
                  <div className="space-y-3 pt-4">
                    <Button
                      onClick={handleBackToLogin}
                      className="w-full h-12"
                    >
                      Back to Login
                    </Button>
                  </div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Phone Number
                          </FormLabel>
                          <FormControl>
                            <InputMask
                              mask="999-999-9999"
                              maskChar=""
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              inputRef={field.ref}
                            >
                              {(inputProps: any) => (
                                <Input
                                  {...inputProps}
                                  name={field.name}
                                  placeholder="203-555-1234"
                                  className="h-12"
                                  type="tel"
                                  data-testid="input-phone"
                                />
                              )}
                            </InputMask>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!state && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          State not selected. Please go back and select your state.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-3 pt-2">
                      <Button
                        type="submit"
                        disabled={forgotPasswordMutation.isPending || !state}
                        className="w-full h-12 text-base font-medium"
                        data-testid="button-request-reset"
                      >
                        {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Instructions"}
                      </Button>

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleBackToLogin}
                          className="h-12 text-sm"
                        >
                          <ArrowLeft className="mr-1 h-4 w-4" />
                          Back to Login
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleBackToHome}
                          className="h-12 text-sm"
                        >
                          <HeartHandshake className="mr-1 h-4 w-4" />
                          Back to Home
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}