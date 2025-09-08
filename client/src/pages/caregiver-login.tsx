import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HeartHandshake, Phone, Lock, ArrowLeft } from "lucide-react";

const loginSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function CaregiverLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Get state from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const state = urlParams.get('state') || '';

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return apiRequest("POST", "/api/caregiver/login", {
        ...data,
        state,
      });
    },
    onSuccess: () => {
      toast({
        title: "Login Successful",
        description: "Welcome back! Redirecting to your dashboard...",
      });
      setLocation("/caregiver/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleBackToStateSelection = () => {
    setLocation("/caregiver");
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
            Caregiver Login - {state}
          </p>
        </div>

        {/* Login Card */}
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Welcome Back</CardTitle>
              <CardDescription>
                Sign in to access your patient care dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                          <Input
                            placeholder="Enter your phone number"
                            className="h-12"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            className="h-12"
                            {...field}
                          />
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
                      disabled={loginMutation.isPending || !state}
                      className="w-full h-12 text-base font-medium"
                    >
                      {loginMutation.isPending ? "Signing In..." : "Sign In"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToStateSelection}
                      className="w-full h-12 text-base"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to State Selection
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Don't have a password yet? Contact your care coordinator to set up your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}