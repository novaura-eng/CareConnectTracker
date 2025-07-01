import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeartHandshake, Users, BarChart3, Settings } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <HeartHandshake className="h-8 w-8 text-healthcare-500" />
            <h1 className="text-3xl font-bold text-slate-900">CareConnect Pro</h1>
          </div>
          <p className="mt-2 text-slate-600">
            Automated weekly check-ins for home care agencies
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Welcome to CareConnect Pro
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Streamline your home care agency operations with automated weekly check-ins,
              comprehensive reporting, and proactive caregiver support.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-healthcare-100 rounded-lg flex items-center justify-center">
                    <HeartHandshake className="h-6 w-6 text-healthcare-600" />
                  </div>
                  <span>Weekly Check-ins</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-4">
                  Automated SMS surveys sent weekly to family caregivers to monitor
                  health status, safety incidents, and care quality.
                </p>
                <Button asChild className="w-full">
                  <Link href="/admin">View Check-ins</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary-600" />
                  </div>
                  <span>Caregiver Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-4">
                  Maintain comprehensive caregiver profiles, contact information,
                  and care assignments in one centralized system.
                </p>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/admin">Manage Caregivers</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-yellow-600" />
                  </div>
                  <span>Compliance Reporting</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-4">
                  Generate detailed reports for state compliance, track response rates,
                  and identify trends in caregiver feedback.
                </p>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/admin">View Reports</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Settings className="h-6 w-6 text-slate-600" />
                  </div>
                  <span>System Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-4">
                  Configure SMS settings, survey schedules, and notification preferences
                  to match your agency's workflow.
                </p>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/admin">Settings</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-healthcare-600 mb-2">95%</div>
                  <div className="text-sm text-slate-600">Average Response Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-600 mb-2">24/7</div>
                  <div className="text-sm text-slate-600">Automated Monitoring</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">CT</div>
                  <div className="text-sm text-slate-600">State Compliant</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
