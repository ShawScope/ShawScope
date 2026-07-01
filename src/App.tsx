import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { HelmetProvider } from "react-helmet-async";
import ProtectedRoute from "./components/ProtectedRoute";

// Every page is loaded on demand (route-based code splitting) instead of
// all being bundled together up front. Previously every visitor downloaded
// the entire admin dashboard's code just to view the homepage; now each
// page's code only loads when that page is actually visited.
const Index = lazy(() => import("./pages/Index"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const EarwaxRemovalPage = lazy(() => import("./pages/EarwaxRemovalPage"));
const CryotherapyPage = lazy(() => import("./pages/CryotherapyPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const ConsentFormPage = lazy(() => import("./pages/ConsentFormPage"));
const EarAdvicePage = lazy(() => import("./pages/EarAdvicePage"));
const FollowUpPage = lazy(() => import("./pages/FollowUpPage"));
const FootHealthPage = lazy(() => import("./pages/FootHealthPage"));
const RejectionResponsePage = lazy(() => import("./pages/RejectionResponsePage"));
const CancelAppointmentPage = lazy(() => import("./pages/CancelAppointmentPage"));
const GroupCancelResponsePage = lazy(() => import("./pages/GroupCancelResponsePage"));
const UnsubscribePage = lazy(() => import("./pages/UnsubscribePage"));
const ParklyScope = lazy(() => import("./pages/ParklyScope"));
const VisitReadyPage = lazy(() => import("./pages/VisitReadyPage"));
const VisitTrackingPage = lazy(() => import("./pages/VisitTrackingPage"));
const LocationPage = lazy(() => import("./pages/LocationPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const FirstVisitPage = lazy(() => import("./pages/FirstVisitPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));
const PollResponsePage = lazy(() => import("./pages/PollResponsePage"));
const LocationInfoPage = lazy(() => import("./pages/LocationInfoPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const PageLoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/earwax-removal" element={<EarwaxRemovalPage />} />
            <Route path="/cryotherapy" element={<CryotherapyPage />} />
            <Route path="/foot-health" element={<FootHealthPage />} />
            <Route path="/ear-advice" element={<EarAdvicePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/consent/:token" element={<ConsentFormPage />} />
            <Route path="/followup/:token" element={<FollowUpPage />} />
            <Route path="/rejection-response/:token" element={<RejectionResponsePage />} />
            <Route path="/cancel-appointment/:token" element={<CancelAppointmentPage />} />
            <Route path="/group-cancel-response/:token" element={<GroupCancelResponsePage />} />
            <Route path="/unsubscribe" element={<UnsubscribePage />} />
            <Route path="/visit-ready/:token" element={<VisitReadyPage />} />
            <Route path="/visit-tracking/:token" element={<VisitTrackingPage />} />
            <Route path="/parklyscope" element={<ParklyScope />} />
            <Route path="/locations" element={<Navigate to="/" replace />} />
            <Route path="/locations/:town" element={<LocationPage />} />
            <Route path="/faqs" element={<FAQPage />} />
            <Route path="/first-visit" element={<FirstVisitPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/poll/:pollId" element={<PollResponsePage />} />
            <Route path="/location-info/:token" element={<LocationInfoPage />} />
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
