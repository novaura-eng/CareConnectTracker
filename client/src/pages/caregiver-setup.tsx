import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Key, CheckCircle, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import logoPath from "@assets/image_1751386830041.png";

const setupSchema = z.object({
  phone: z.string().min(10, "Please enter a valid phone number"),
  state: z.string().min(2, "Please select your state"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SetupFormData = z.infer<typeof setupSchema>;

export default function CaregiverSetup() {
  const [, navigate] = useLocation();
  const [isChecking, setIsChecking] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [caregiverName, setCaregiverName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  
  const form = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      phone: "",
      state: "",
      password: "",
      confirmPassword: "",
    },
  });

  const checkEligibility = async () => {
    setIsChecking(true);
    setError("");
    setMessage("");
    
    try {
      const { phone, state } = form.getValues();
      if (!phone || !state) {
        setError("Please enter your phone number and select your state");
        setIsChecking(false);
        return;
      }

      const response = await apiRequest("/api/caregiver/check-eligibility", {
        method: "POST",
        body: JSON.stringify({ phone, state }),
      });

      if (response.eligible) {
        setEligible(true);
        setCaregiverName(response.caregiverName);
        setMessage(response.message);
        setEligibilityChecked(true);
      }
    } catch (err: any) {
      setError(err.message || "Unable to verify your information. Please check your phone number and state.");
      setEligible(false);
    } finally {
      setIsChecking(false);
    }
  };

  const onSubmit = async (data: SetupFormData) => {
    if (!eligible) {
      await checkEligibility();
      return;
    }

    setIsSettingUp(true);
    setError("");

    try {
      await apiRequest("/api/caregiver/setup-password", {
        method: "POST",
        body: JSON.stringify({
          phone: data.phone,
          state: data.state,
          password: data.password,
        }),
      });

      // Success - redirect to login with success message
      navigate(`/caregiver/login?state=${encodeURIComponent(data.state)}&setup=success`);
    } catch (err: any) {
      setError(err.message || "Failed to set up your account. Please try again.");
    } finally {
      setIsSettingUp(false);
    }
  };

  const states = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", 
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", 
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", 
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", 
    "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", 
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", 
    "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center">
            <img src={logoPath} alt="Silver CareConnect" className="w-12 h-12" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">First Time Setup</h1>
            <p className="text-gray-600 mt-2">Set up your caregiver account</p>
          </div>
        </div>

        {/* Setup Form */}
        <Card className="border-2 border-green-200 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center flex items-center justify-center gap-2">
              <Key className="w-5 h-5 text-green-600" />
              Account Setup
            </CardTitle>
            <CardDescription className="text-center">
              {eligible && eligibilityChecked 
                ? `Welcome ${caregiverName}! Please create your password.`
                : "Enter your information to verify your account"
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  disabled={eligible && eligibilityChecked}
                  {...form.register("phone")}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-red-600">{form.formState.errors.phone.message}</p>
                )}
              </div>

              {/* State */}
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <select
                  id="state"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={eligible && eligibilityChecked}
                  {...form.register("state")}
                >
                  <option value="">Select your state</option>
                  {states.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {form.formState.errors.state && (
                  <p className="text-sm text-red-600">{form.formState.errors.state.message}</p>
                )}
              </div>

              {/* Password Fields - Only show if eligible */}
              {eligible && eligibilityChecked && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      {...form.register("password")}
                    />
                    {form.formState.errors.password && (
                      <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      {...form.register("confirmPassword")}
                    />
                    {form.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-600">{form.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </>
              )}

              {/* Messages */}
              {message && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{message}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isChecking || isSettingUp}
              >
                {isChecking ? (
                  "Checking..."
                ) : isSettingUp ? (
                  "Setting up..."
                ) : eligible && eligibilityChecked ? (
                  "Create Account"
                ) : (
                  "Verify Information"
                )}
              </Button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link href="/caregiver/login" className="text-sm text-green-600 hover:text-green-800 flex items-center justify-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center text-sm text-gray-600">
          <p>Need help? Your care coordinator can assist with account setup.</p>
        </div>
      </div>
    </div>
  );
}