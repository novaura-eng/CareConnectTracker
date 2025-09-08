import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, MessageSquare, BarChart3, Clock, HeartHandshake } from "lucide-react";
import logoPath from "@assets/image_1751386830041.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mb-4 sm:mb-6">
            <img src={logoPath} alt="Silver CareConnect Logo" className="w-10 h-10 sm:w-12 sm:h-12" />
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                Silver CareConnect
              </h1>
              <p className="text-base sm:text-lg text-gray-600 mt-1 sm:mt-2">
                Powered by TrustNet CareFlow
              </p>
            </div>
          </div>
          <p className="text-lg sm:text-xl text-gray-700 max-w-2xl mx-auto px-4">
            Supporting Connecticut home care agencies through automated weekly check-ins 
            and comprehensive caregiver management
          </p>
        </div>

        {/* Login Buttons */}
        <div className="text-center mb-12 sm:mb-16 px-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="text-center">
              <Button 
                size="lg" 
                className="bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 py-3 text-base sm:text-lg w-full sm:w-auto"
                onClick={() => window.location.href = "/caregiver"}
              >
                <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Caregiver Portal
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                For family caregivers
              </p>
            </div>
            <div className="text-center">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 text-base sm:text-lg w-full sm:w-auto"
                onClick={() => window.location.href = "/login"}
              >
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Administrative Portal
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                For care coordination staff
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16 px-4 sm:px-0">
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader className="text-center">
              <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle className="text-xl">Caregiver Management</CardTitle>
              <CardDescription>
                Comprehensive database of family caregivers with contact information and emergency details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Complete caregiver profiles</li>
                <li>• Emergency contact tracking</li>
                <li>• Active status management</li>
                <li>• Patient assignment system</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 shadow-lg">
            <CardHeader className="text-center">
              <MessageSquare className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <CardTitle className="text-xl">Automated Check-ins</CardTitle>
              <CardDescription>
                Weekly health and safety surveys delivered via SMS and email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 6-question health survey</li>
                <li>• SMS & email delivery</li>
                <li>• Mobile-friendly forms</li>
                <li>• Automated reminders</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 shadow-lg">
            <CardHeader className="text-center">
              <BarChart3 className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <CardTitle className="text-xl">Admin Dashboard</CardTitle>
              <CardDescription>
                Real-time monitoring and reporting for care coordination
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Response tracking</li>
                <li>• Health incident alerts</li>
                <li>• Compliance monitoring</li>
                <li>• Manual survey creation</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Process Flow */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-16">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">1. Setup</h3>
              <p className="text-sm text-gray-600">
                Add caregivers and patients to the system
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">2. Schedule</h3>
              <p className="text-sm text-gray-600">
                Weekly check-ins are automatically created
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">3. Notify</h3>
              <p className="text-sm text-gray-600">
                Caregivers receive SMS/email with survey link
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-semibold mb-2">4. Monitor</h3>
              <p className="text-sm text-gray-600">
                Track responses and health incidents
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600">
          <p className="mb-2">
            Designed for Connecticut home care agencies supporting Medicaid participants
          </p>
          <p className="text-sm">
            Ensuring family caregiver well-being through systematic monitoring and support
          </p>
        </div>
      </div>
    </div>
  );
}