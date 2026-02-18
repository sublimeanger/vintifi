import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import Landing from "./pages/Landing";
import Features from "./pages/marketing/Features";
import Pricing from "./pages/marketing/Pricing";
import HowItWorks from "./pages/marketing/HowItWorks";
import About from "./pages/marketing/About";
import Privacy from "./pages/marketing/Privacy";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import Listings from "./pages/Listings";
import PriceCheck from "./pages/PriceCheck";
import SettingsPage from "./pages/SettingsPage";
import OptimizeListing from "./pages/OptimizeListing";
import Vintography from "./pages/Vintography";
import ItemDetail from "./pages/ItemDetail";
import TrendRadar from "./pages/TrendRadar";
import SellWizard from "./pages/SellWizard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><OnboardingGuard><Dashboard /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/price-check" element={<ProtectedRoute><OnboardingGuard><PriceCheck /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/listings" element={<ProtectedRoute><OnboardingGuard><Listings /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/items/:id" element={<ProtectedRoute><OnboardingGuard><ItemDetail /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/optimize" element={<ProtectedRoute><OnboardingGuard><OptimizeListing /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/vintography" element={<ProtectedRoute><OnboardingGuard><Vintography /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><OnboardingGuard><SettingsPage /></OnboardingGuard></ProtectedRoute>} />
            {/* Redirects for removed routes */}
            <Route path="/sell" element={<ProtectedRoute><OnboardingGuard><SellWizard /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/trends" element={<ProtectedRoute><OnboardingGuard><TrendRadar /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/arbitrage" element={<Navigate to="/dashboard" replace />} />
            <Route path="/competitors" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dead-stock" element={<Navigate to="/dashboard" replace />} />
            <Route path="/analytics" element={<Navigate to="/dashboard" replace />} />
            <Route path="/charity-briefing" element={<Navigate to="/dashboard" replace />} />
            <Route path="/bulk-optimize" element={<Navigate to="/dashboard" replace />} />
            <Route path="/clearance-radar" element={<Navigate to="/dashboard" replace />} />
            <Route path="/platforms" element={<Navigate to="/dashboard" replace />} />
            <Route path="/relist" element={<Navigate to="/dashboard" replace />} />
            <Route path="/cross-listings" element={<Navigate to="/dashboard" replace />} />
            <Route path="/portfolio" element={<Navigate to="/dashboard" replace />} />
            <Route path="/seasonal" element={<Navigate to="/dashboard" replace />} />
            <Route path="/niche-finder" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
