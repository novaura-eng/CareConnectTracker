import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import InputMask from "react-input-mask";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { HeartHandshake, Phone, Lock, ArrowLeft, CheckCircle, UserPlus, Home } from "lucide-react";

const loginSchema = z.object({
  phone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, "Enter a valid phone number"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;


export default function CaregiverLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Get state from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const state = urlParams.get('state') || '';
  const setupSuccess = urlParams.get('setup') === 'success';

  // Show success message if coming from setup
  useEffect(() => {
    if (setupSuccess) {
      toast({
        title: "Account Created Successfully!",
        description: "Your password has been set. You can now log in with your credentials.",
      });
    }
  }, [setupSuccess, toast]);

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
      // CRITICAL: Clear cached data before new caregiver session to prevent data leakage
      queryClient.clear();
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
            Caregiver Login - {state}
          </p>
        </div>

        {/* Login Card */}
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Welcome Back</CardTitle>
              <CardDescription>
                Enter your phone number and password to access your patient care dashboard
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
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Enter your password"
                            className="h-12"
                            data-testid="input-password"
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

                  {setupSuccess && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Account created successfully! You can now log in.
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

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setLocation(`/caregiver/forgot-password?state=${state}`)}
                        className="text-sm text-primary hover:text-primary/80 underline"
                        data-testid="link-forgot-password"
                      >
                        Forgot your password?
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBackToStateSelection}
                        className="h-12 text-sm"
                      >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to State
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBackToHome}
                        className="h-12 text-sm"
                      >
                        <Home className="mr-1 h-4 w-4" />
                        Back to Home
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Setup Link */}
          <div className="mt-6 text-center space-y-3">
            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600 mb-3">First time here?</p>
              <Link 
                href={`/caregiver/setup${state ? `?state=${encodeURIComponent(state)}` : ''}`}
                className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium text-sm"
              >
                <UserPlus className="h-4 w-4" />
                Set up your account
              </Link>
            </div>
            
            <div className="pt-2">
              <p className="text-xs text-slate-500">
                Need help? Contact your care coordinator for assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}