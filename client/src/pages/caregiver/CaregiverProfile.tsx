import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Mail, Phone, UserCheck, Lock, Save, AlertCircle, CheckCircle } from "lucide-react";
import CaregiverLayout from "@/components/caregiver/CaregiverLayout";

interface CaregiverProfile {
  id: number;
  name: string;
  phone: string;
  email?: string;
  emergencyContact?: string;
  state: string;
}

export default function CaregiverProfile() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const { data: caregiver, isLoading } = useQuery<CaregiverProfile>({
    queryKey: ["/api/caregiver/me"],
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    emergencyContact: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Update form data when caregiver data loads
  React.useEffect(() => {
    if (caregiver) {
      setFormData({
        name: caregiver.name || "",
        email: caregiver.email || "",
        emergencyContact: caregiver.emergencyContact || "",
      });
    }
  }, [caregiver]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/caregiver/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregiver/me"] });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/caregiver/password", data);
      return response.json();
    },
    onSuccess: () => {
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = () => {
    const errors: Record<string, string> = {};
    if (!passwordData.currentPassword) errors.currentPassword = "Current password is required";
    if (!passwordData.newPassword) errors.newPassword = "New password is required";
    if (passwordData.newPassword.length < 6) errors.newPassword = "Password must be at least 6 characters";
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = () => {
    if (!validateForm()) return;
    updateProfileMutation.mutate(formData);
  };

  const handleChangePassword = () => {
    if (!validatePasswordForm()) return;
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handleCancelEdit = () => {
    if (caregiver) {
      setFormData({
        name: caregiver.name || "",
        email: caregiver.email || "",
        emergencyContact: caregiver.emergencyContact || "",
      });
    }
    setIsEditing(false);
    setFormErrors({});
  };

  const handleCancelPassword = () => {
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowPasswordForm(false);
    setFormErrors({});
  };

  if (isLoading) {
    return (
      <CaregiverLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </CaregiverLayout>
    );
  }

  return (
    <CaregiverLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
          <p className="text-slate-600 mt-1">
            Manage your personal information and account settings.
          </p>
        </div>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Update your contact information and emergency details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phone (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                <Input
                  id="phone"
                  value={caregiver?.phone || ""}
                  disabled
                  className="bg-slate-50"
                />
              </div>
              <p className="text-xs text-slate-500">
                Contact your care coordinator to change your phone number.
              </p>
            </div>

            {/* State (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-slate-400" />
                <Input
                  id="state"
                  value={caregiver?.state || ""}
                  disabled
                  className="bg-slate-50"
                />
              </div>
            </div>

            {/* Editable fields */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
                className={formErrors.name ? "border-red-500" : isEditing ? "" : "bg-slate-50"}
              />
              {formErrors.name && (
                <p className="text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address (Optional)</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  className={formErrors.email ? "border-red-500" : isEditing ? "" : "bg-slate-50"}
                  placeholder="your.email@example.com"
                />
              </div>
              {formErrors.email && (
                <p className="text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Emergency Contact (Optional)</Label>
              <Input
                id="emergencyContact"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                disabled={!isEditing}
                className={isEditing ? "" : "bg-slate-50"}
                placeholder="Name and phone number"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-4">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Password & Security
            </CardTitle>
            <CardDescription>
              Change your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showPasswordForm ? (
              <Button onClick={() => setShowPasswordForm(true)}>
                <Lock className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className={formErrors.currentPassword ? "border-red-500" : ""}
                  />
                  {formErrors.currentPassword && (
                    <p className="text-sm text-red-600">{formErrors.currentPassword}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className={formErrors.newPassword ? "border-red-500" : ""}
                  />
                  {formErrors.newPassword && (
                    <p className="text-sm text-red-600">{formErrors.newPassword}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className={formErrors.confirmPassword ? "border-red-500" : ""}
                  />
                  {formErrors.confirmPassword && (
                    <p className="text-sm text-red-600">{formErrors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                  </Button>
                  <Button variant="outline" onClick={handleCancelPassword}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            For your security, never share your login credentials with anyone. If you suspect unauthorized access to your account, change your password immediately and contact your care coordinator.
          </AlertDescription>
        </Alert>
      </div>
    </CaregiverLayout>
  );
}