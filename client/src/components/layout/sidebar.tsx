import { HeartHandshake, ClipboardCheck, Users, User, BarChart3, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/contexts/SidebarContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import logoPath from "@assets/image_1751386830041.png";

const navigation = [
  { name: "Weekly Check-ins", href: "/admin", icon: ClipboardCheck },
  { name: "Caregivers", href: "/caregivers", icon: Users },
  { name: "Patients", href: "/patients", icon: User },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isCollapsed, setIsCollapsed } = useSidebar();

  return (
    <>
      {/* Mobile navigation header */}
      <nav className="bg-white shadow-sm border-b border-slate-200 lg:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <img src={logoPath} alt="Silver CareConnect Logo" className="h-6 w-6" />
              <span className="text-base sm:text-lg font-semibold text-slate-900 truncate">Silver CareConnect</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-200 shadow-lg">
            <div className="px-2 py-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "text-primary-600 bg-primary-50"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-primary-600" : "")} />
                    {item.name}
                  </Link>
                );
              })}
              <div className="pt-2 mt-2 border-t border-slate-200">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-600 hover:text-slate-900"
                  onClick={() => window.location.href = "/api/logout"}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0 lg:fixed lg:inset-y-0">
        <div className={cn(
          "flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
        )}>
          <div className="flex items-center h-16 px-3 border-b border-slate-200 relative">
            {!isCollapsed && (
              <>
                <img src={logoPath} alt="Silver CareConnect Logo" className="h-8 w-8 mr-3" />
                <span className="text-xl font-bold text-slate-900 truncate">Silver CareConnect</span>
              </>
            )}
            {isCollapsed && (
              <img src={logoPath} alt="Silver CareConnect Logo" className="h-8 w-8 mx-auto" />
            )}
            
            {/* Toggle button positioned in top right */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-slate-100",
                isCollapsed ? "right-2" : "right-2"
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <nav className="flex-1 px-2 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors relative group",
                    isActive
                      ? "text-primary-600 bg-primary-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                    isCollapsed ? "justify-center" : ""
                  )}
                  title={isCollapsed ? item.name : ""}
                >
                  <Icon className={cn(
                    "h-5 w-5", 
                    isActive ? "text-primary-600" : "",
                    isCollapsed ? "mx-auto" : "mr-3"
                  )} />
                  {!isCollapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                  
                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
          
          <div className="p-2 border-t border-slate-200">
            {!isCollapsed ? (
              <div className="px-2">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">AD</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">Administrator</p>
                    <p className="text-xs text-slate-500">Silver CareConnect</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50"
                  onClick={() => window.location.href = "/api/logout"}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center group relative">
                  <span className="text-sm font-medium text-white">AD</span>
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    Administrator
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 group relative"
                  onClick={() => window.location.href = "/api/logout"}
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    Logout
                  </div>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
