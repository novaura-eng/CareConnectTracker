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
import { HeartHandshake, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters long"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function CaregiverResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get token from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token") || "";

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      return await apiRequest("/api/caregiver/reset-password", "POST", {
        token,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      toast({
        title: "Password Reset Successful",
        description: "Your password has been reset successfully. You can now log in.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Unable to reset password. Please try again.";
      setError(errorMessage);
      toast({
        title: "Password Reset Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    setError(null);
    resetPasswordMutation.mutate(data);
  };

  const handleGoToLogin = () => {
    setLocation("/caregiver");
  };

  const handleBackToHome = () => {
    setLocation("/");
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <HeartHandshake className="h-12 w-12 text-primary mr-3" />
              <h1 className="text-3xl font-bold text-slate-900">Silver CareConnect</h1>
            </div>
          </div>
          <div className="max-w-md mx-auto">
            <Card className="shadow-lg border-0 bg-white">
              <CardContent className="text-center p-8">
                <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  Invalid Reset Link
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  This password reset link is invalid or missing. Please request a new password reset.
                </p>
                <div className="space-y-3">
                  <Button onClick={handleGoToLogin} className="w-full">
                    Go to Login
                  </Button>
                  <Button onClick={handleBackToHome} variant="outline" className="w-full">
                    Back to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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
            Reset Your Password
          </p>
        </div>

        {/* Reset Password Card */}
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Set New Password</CardTitle>
              <CardDescription>
                Enter your new password below
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
                      Password Reset Successful
                    </h3>
                    <p className="text-sm text-slate-600">
                      Your password has been reset successfully. You can now log in with your new password.
                    </p>
                  </div>
                  <div className="space-y-3 pt-4">
                    <Button
                      onClick={handleGoToLogin}
                      className="w-full h-12"
                    >
                      Go to Login
                    </Button>
                  </div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            New Password
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Enter your new password"
                              className="h-12"
                              data-testid="input-new-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Confirm New Password
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Confirm your new password"
                              className="h-12"
                              data-testid="input-confirm-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {error && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {error}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-3 pt-2">
                      <Button
                        type="submit"
                        disabled={resetPasswordMutation.isPending}
                        className="w-full h-12 text-base font-medium"
                        data-testid="button-reset-password"
                      >
                        {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                      </Button>

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGoToLogin}
                          className="h-12 text-sm"
                        >
                          Go to Login
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleBackToHome}
                          className="h-12 text-sm"
                        >
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