import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Key, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import logoPath from "@assets/image_1751386830041.png";

export default function CaregiverSetup() {
  const [, navigate] = useLocation();
  const [isChecking, setIsChecking] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [caregiverName, setCaregiverName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  
  // Get state from URL params if available
  const urlParams = new URLSearchParams(window.location.search);
  const stateFromUrl = urlParams.get('state') || '';
  
  // Form state
  const [formData, setFormData] = useState({
    phone: "",
    state: stateFromUrl, // Pre-fill state from URL
    password: "",
    confirmPassword: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Function to format phone number with hyphens
  const formatPhoneNumber = (value: string, previousValue: string = '') => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limitedPhoneNumber = phoneNumber.substring(0, 10);
    
    // If the new value has fewer digits than before, don't auto-format immediately
    // This allows proper deletion/backspacing
    const previousDigits = previousValue.replace(/\D/g, '');
    const isDeleting = limitedPhoneNumber.length < previousDigits.length;
    
    // Also check if the current input is shorter than the previous (including hyphens)
    // This helps detect when user is trying to delete hyphens specifically
    const isShorterInput = value.length < previousValue.length;
    
    // Apply formatting: XXX-XXX-XXXX, but be more careful with deletion
    if (limitedPhoneNumber.length >= 6 && !isDeleting && !isShorterInput) {
      return `${limitedPhoneNumber.substring(0, 3)}-${limitedPhoneNumber.substring(3, 6)}-${limitedPhoneNumber.substring(6)}`;
    } else if (limitedPhoneNumber.length > 6 && !isShorterInput) {
      // When deleting, still format if we have more than 6 digits and not actively deleting
      return `${limitedPhoneNumber.substring(0, 3)}-${limitedPhoneNumber.substring(3, 6)}-${limitedPhoneNumber.substring(6)}`;
    } else if (limitedPhoneNumber.length >= 3 && !isDeleting && !isShorterInput) {
      return `${limitedPhoneNumber.substring(0, 3)}-${limitedPhoneNumber.substring(3)}`;
    } else if (limitedPhoneNumber.length > 3 && !isShorterInput) {
      // When deleting, be more permissive - only format if not actively deleting
      return `${limitedPhoneNumber.substring(0, 3)}-${limitedPhoneNumber.substring(3)}`;
    }
    
    return limitedPhoneNumber;
  };

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    const normalizedPhone = formData.phone.replace(/\D/g, "");
    if (!formData.phone.trim()) {
      errors.phone = "Please enter your phone number";
    } else if (normalizedPhone.length !== 10) {
      errors.phone = "Please enter a valid 10-digit phone number";
    }
    
    if (!formData.state) {
      errors.state = "Please select your state";
    }
    
    if (eligible && eligibilityChecked) {
      if (!formData.password) {
        errors.password = "Password is required";
      } else if (formData.password.length < 6) {
        errors.password = "Password must be at least 6 characters";
      }
      
      if (!formData.confirmPassword) {
        errors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Passwords don't match";
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkEligibility = async () => {
    setIsChecking(true);
    setError("");
    setMessage("");
    
    try {
      // Extract digits from the already formatted phone number
      const digits = formData.phone.replace(/\D/g, "");
      
      if (!digits || digits.length !== 10) {
        setError("Please enter a valid 10-digit phone number");
        setIsChecking(false);
        return;
      }

      if (!formData.state) {
        setError("Please select your state");
        setIsChecking(false);
        return;
      }

      // Phone number is already formatted from the input
      const formattedPhone = formData.phone;

      const responseObj = await apiRequest("POST", "/api/caregiver/check-eligibility", { 
        phone: formattedPhone, 
        state: formData.state 
      });
      
      const response = await responseObj.json();

      if (response.eligible) {
        setEligible(true);
        setCaregiverName(response.caregiverName);
        setMessage(response.message);
        setEligibilityChecked(true);
      } else {
        // Handle ineligible responses explicitly
        setEligible(false);
        setEligibilityChecked(true);
        setError(response.message || "We couldn't verify your information. Please contact your care coordinator.");
      }
    } catch (err: any) {
      setError(err.message || "Unable to verify your information. Please check your phone number and state.");
      setEligible(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!eligible) {
      await checkEligibility();
      return;
    }

    setIsSettingUp(true);
    setError("");

    try {
      // Phone number is already formatted from the input
      const formattedPhone = formData.phone;
      
      const setupResponse = await apiRequest("POST", "/api/caregiver/setup-password", {
        phone: formattedPhone,
        state: formData.state,
        password: formData.password,
      });
      
      await setupResponse.json(); // Parse the response

      // Success - redirect to login with success message
      navigate(`/caregiver/login?state=${encodeURIComponent(formData.state)}&setup=success`);
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
                : stateFromUrl 
                  ? `Enter your phone number to verify your account in ${stateFromUrl}`
                  : "Enter your information to verify your account"
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="203-555-1234"
                  disabled={eligible && eligibilityChecked}
                  value={formData.phone}
                  onChange={(e) => {
                    const formattedValue = formatPhoneNumber(e.target.value, formData.phone);
                    setFormData({ ...formData, phone: formattedValue });
                  }}
                  className={formErrors.phone ? "border-red-500" : ""}
                />
                {formErrors.phone && (
                  <p className="text-sm text-red-600">{formErrors.phone}</p>
                )}
              </div>

              {/* State */}
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <select
                  id="state"
                  className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${formErrors.state ? "border-red-500" : ""}`}
                  disabled={(eligible && eligibilityChecked) || !!stateFromUrl} // Also disable if state came from URL
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                >
                  <option value="">Select your state</option>
                  {states.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {formErrors.state && (
                  <p className="text-sm text-red-600">{formErrors.state}</p>
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
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={formErrors.password ? "border-red-500" : ""}
                    />
                    {formErrors.password && (
                      <p className="text-sm text-red-600">{formErrors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className={formErrors.confirmPassword ? "border-red-500" : ""}
                    />
                    {formErrors.confirmPassword && (
                      <p className="text-sm text-red-600">{formErrors.confirmPassword}</p>
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
              <Link 
                href={`/caregiver/login${stateFromUrl ? `?state=${encodeURIComponent(stateFromUrl)}` : ''}`} 
                className="text-sm text-green-600 hover:text-green-800 flex items-center justify-center gap-1"
              >
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