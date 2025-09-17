import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Survey from "@/pages/survey";
import Admin from "@/pages/admin";
import Caregivers from "@/pages/caregivers";
import Patients from "@/pages/patients";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import CaregiverStateSelection from "@/pages/caregiver-state-selection";
import CaregiverLogin from "@/pages/caregiver-login";
import CaregiverSetup from "@/pages/caregiver-setup";
import CaregiverDashboard from "@/pages/caregiver-dashboard";
import CaregiverPatient from "@/pages/caregiver-patient";
import CaregiverSurvey from "@/pages/caregiver-survey";
import CaregiverPatients from "@/pages/caregiver/CaregiverPatients";
import CaregiverProfile from "@/pages/caregiver/CaregiverProfile";
import CaregiverSurveyDashboard from "@/pages/caregiver/CaregiverSurveyDashboard";
import CaregiverDynamicSurvey from "@/pages/caregiver/CaregiverDynamicSurvey";
import AdminSurveyBuilder from "@/pages/admin/AdminSurveyBuilder";
import Sidebar from "@/components/layout/sidebar";

function UnauthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/survey/:checkInId" component={Survey} />
      <Route path="/caregiver" component={CaregiverStateSelection} />
      <Route path="/caregiver/login" component={CaregiverLogin} />
      <Route path="/caregiver/setup" component={CaregiverSetup} />
      <Route path="/caregiver/dashboard" component={CaregiverSurveyDashboard} />
      <Route path="/caregiver/patients" component={CaregiverPatients} />
      <Route path="/caregiver/profile" component={CaregiverProfile} />
      <Route path="/caregiver/checkins" component={CaregiverSurveyDashboard} />
      <Route path="/caregiver/survey/:assignmentId" component={CaregiverDynamicSurvey} />
      <Route path="/caregiver/patient/:patientId" component={CaregiverPatient} />
      <Route path="/caregiver/survey/:patientId" component={CaregiverSurvey} />
      <Route component={Landing} />
    </Switch>
  );
}

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/survey/:checkInId" component={Survey} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/surveys/builder" component={AdminSurveyBuilder} />
      <Route path="/admin/surveys/builder/:surveyId" component={AdminSurveyBuilder} />
      <Route path="/caregivers" component={Caregivers} />
      <Route path="/patients" component={Patients} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider>
          <AuthWrapper />
          <Toaster />
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AuthWrapper() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen">
        <UnauthenticatedRouter />
      </div>
    );
  }

  return <AuthenticatedLayout />;
}

function AuthenticatedLayout() {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-50">
      <Sidebar />
      <main className={`flex-1 overflow-auto transition-all duration-300 ease-in-out ${
        isCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        <AuthenticatedRouter />
      </main>
    </div>
  );
}

export default App;
