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
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import Listings from "./pages/Listings";
import PriceCheck from "./pages/PriceCheck";
import SettingsPage from "./pages/SettingsPage";
import OptimizeListing from "./pages/OptimizeListing";
import TrendRadar from "./pages/TrendRadar";
import ArbitrageScanner from "./pages/ArbitrageScanner";
import CompetitorTracker from "./pages/CompetitorTracker";
import DeadStock from "./pages/DeadStock";
import Analytics from "./pages/Analytics";
import RelistScheduler from "./pages/RelistScheduler";
import PortfolioOptimizer from "./pages/PortfolioOptimizer";
import SeasonalCalendar from "./pages/SeasonalCalendar";
import CharityBriefing from "./pages/CharityBriefing";
import BulkOptimize from "./pages/BulkOptimize";
import ClearanceRadar from "./pages/ClearanceRadar";
import NicheFinder from "./pages/NicheFinder";
import PlatformConnections from "./pages/PlatformConnections";
import CrossListings from "./pages/CrossListings";
import Vintography from "./pages/Vintography";
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
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><OnboardingGuard><Dashboard /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/price-check" element={<ProtectedRoute><OnboardingGuard><PriceCheck /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/listings" element={<ProtectedRoute><OnboardingGuard><Listings /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/optimize" element={<ProtectedRoute><OnboardingGuard><OptimizeListing /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/trends" element={<ProtectedRoute><OnboardingGuard><TrendRadar /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/arbitrage" element={<ProtectedRoute><OnboardingGuard><ArbitrageScanner /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/competitors" element={<ProtectedRoute><OnboardingGuard><CompetitorTracker /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/dead-stock" element={<ProtectedRoute><OnboardingGuard><DeadStock /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><OnboardingGuard><Analytics /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/relist" element={<ProtectedRoute><OnboardingGuard><RelistScheduler /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/portfolio" element={<ProtectedRoute><OnboardingGuard><PortfolioOptimizer /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/seasonal" element={<ProtectedRoute><OnboardingGuard><SeasonalCalendar /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/charity-briefing" element={<ProtectedRoute><OnboardingGuard><CharityBriefing /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/bulk-optimize" element={<ProtectedRoute><OnboardingGuard><BulkOptimize /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/clearance-radar" element={<ProtectedRoute><OnboardingGuard><ClearanceRadar /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/niche-finder" element={<ProtectedRoute><OnboardingGuard><NicheFinder /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/platforms" element={<ProtectedRoute><OnboardingGuard><PlatformConnections /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/cross-listings" element={<ProtectedRoute><OnboardingGuard><CrossListings /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/vintography" element={<ProtectedRoute><OnboardingGuard><Vintography /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><OnboardingGuard><SettingsPage /></OnboardingGuard></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
