import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Building2 } from "lucide-react";
import logoPath from "@assets/image_1751386830041.png";

export default function Login() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-2xl border-2 border-blue-200">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logoPath} alt="Silver CareConnect Logo" className="w-16 h-16" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Silver CareConnect
          </CardTitle>
          <p className="text-gray-600">
            Staff Portal Access
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <Building2 className="w-10 h-10 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Administrative Access
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                This portal is restricted to authorized care coordination staff only. 
                Access requires proper authentication credentials.
              </p>
            </div>
          </div>

          <Button 
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base font-medium"
            size="lg"
          >
            <Shield className="w-5 h-5 mr-2" />
            Continue to Secure Login
          </Button>

          <div className="border-t pt-4">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <Lock className="w-4 h-4" />
              <span>Enterprise-grade security</span>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>For technical support, contact your system administrator</p>
            <p className="font-medium">Secure Healthcare Management Platform</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}