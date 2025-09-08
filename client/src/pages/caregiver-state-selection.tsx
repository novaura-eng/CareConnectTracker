import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, ArrowRight, HeartHandshake } from "lucide-react";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

export default function CaregiverStateSelection() {
  const [selectedState, setSelectedState] = useState<string>("");
  const [, setLocation] = useLocation();

  const handleContinue = () => {
    if (selectedState) {
      setLocation(`/caregiver/login?state=${encodeURIComponent(selectedState)}`);
    }
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
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Welcome to your caregiver portal. Please select your state to continue to your account.
          </p>
        </div>

        {/* State Selection Card */}
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="text-center pb-4">
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <MapPin className="h-5 w-5 text-primary" />
                Select Your State
              </CardTitle>
              <CardDescription>
                Choose the state where you provide care services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="state-select" className="text-sm font-medium text-slate-700">
                  State
                </label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger id="state-select" className="h-12">
                    <SelectValue placeholder="Choose your state..." />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleContinue}
                disabled={!selectedState}
                className="w-full h-12 text-base font-medium"
              >
                Continue to Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Need help? Contact your care coordinator for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}