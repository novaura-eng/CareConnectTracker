import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCaregiverAuth } from "@/hooks/useCaregiverAuth";
import { 
  HeartHandshake, 
  LogOut, 
  Users, 
  User, 
  ClipboardList, 
  Menu,
  X
} from "lucide-react";

interface CaregiverLayoutProps {
  children: React.ReactNode;
}

export default function CaregiverLayout({ children }: CaregiverLayoutProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { toast } = useToast();
  const { caregiver, isLoading: authLoading, isAuthenticated } = useCaregiverAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/caregiver/logout", {}),
    onSuccess: () => {
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      setLocation("/caregiver");
    },
    onError: () => {
      toast({
        title: "Logout Error",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    setLocation("/caregiver");
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex">
          <div className="w-64 bg-white border-r border-slate-200">
            <Skeleton className="h-16 w-full" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="flex-1 p-8">
            <Skeleton className="h-20 w-full mb-6" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const navigation = [
    {
      name: "Patients",
      href: "/caregiver/patients",
      icon: Users,
      current: location.startsWith("/caregiver/patients")
    },
    {
      name: "Profile",
      href: "/caregiver/profile",
      icon: User,
      current: location.startsWith("/caregiver/profile")
    },
    {
      name: "Check-ins",
      href: "/caregiver/checkins",
      icon: ClipboardList,
      current: location.startsWith("/caregiver/checkins")
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-slate-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <SidebarContent navigation={navigation} caregiver={caregiver} onLogout={handleLogout} />
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
          <div className="bg-white border-r border-slate-200">
            <SidebarContent navigation={navigation} caregiver={caregiver} onLogout={handleLogout} />
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col lg:pl-64">
          {/* Mobile header */}
          <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white border-b border-slate-200 lg:hidden">
            <button
              type="button"
              className="border-r border-slate-200 px-4 text-slate-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex flex-1 justify-between px-4">
              <div className="flex flex-1 items-center">
                <div className="flex items-center">
                  <HeartHandshake className="h-8 w-8 text-primary mr-2" />
                  <h1 className="text-xl font-semibold text-slate-900">Silver CareConnect</h1>
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1">
            <div className="py-6">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

interface SidebarContentProps {
  navigation: Array<{
    name: string;
    href: string;
    icon: any;
    current: boolean;
  }>;
  caregiver: any;
  onLogout: () => void;
}

function SidebarContent({ navigation, caregiver, onLogout }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex flex-shrink-0 items-center px-4 py-4 border-b border-slate-200">
        <HeartHandshake className="h-8 w-8 text-primary mr-3" />
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-slate-900">Silver CareConnect</h1>
          <p className="text-sm text-slate-600">Caregiver Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => (
          <Link key={item.name} href={item.href}>
            <a
              className={`${
                item.current
                  ? 'bg-green-100 text-green-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors`}
            >
              <item.icon
                className={`${
                  item.current ? 'text-green-500' : 'text-slate-400 group-hover:text-slate-500'
                } mr-3 flex-shrink-0 h-6 w-6`}
              />
              {item.name}
            </a>
          </Link>
        ))}
      </nav>

      {/* User info and logout */}
      <div className="flex-shrink-0 border-t border-slate-200 p-4">
        <Card className="p-3 bg-slate-50">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {caregiver?.name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {caregiver?.state}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="w-full mt-3 text-xs"
          >
            <LogOut className="mr-2 h-3 w-3" />
            Logout
          </Button>
        </Card>
      </div>
    </div>
  );
}