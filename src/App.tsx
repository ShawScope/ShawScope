import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import BookingPage from "./pages/BookingPage";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import AboutPage from "./pages/AboutPage";
import EarwaxRemovalPage from "./pages/EarwaxRemovalPage";
import CryotherapyPage from "./pages/CryotherapyPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPage from "./pages/PrivacyPage";
import ConsentFormPage from "./pages/ConsentFormPage";
import EarAdvicePage from "./pages/EarAdvicePage";
import FollowUpPage from "./pages/FollowUpPage";
import FootHealthPage from "./pages/FootHealthPage";
import RejectionResponsePage from "./pages/RejectionResponsePage";
import CancelAppointmentPage from "./pages/CancelAppointmentPage";
import GroupCancelResponsePage from "./pages/GroupCancelResponsePage";
import UnsubscribePage from "./pages/UnsubscribePage";
import ParklyScope from "./pages/ParklyScope";
import VisitReadyPage from "./pages/VisitReadyPage";
import VisitTrackingPage from "./pages/VisitTrackingPage";
import LocationPage from "./pages/LocationPage";
import FAQPage from "./pages/FAQPage";
import FirstVisitPage from "./pages/FirstVisitPage";
import EventsPage from "./pages/EventsPage";
import BlogPage from "./pages/BlogPage";
import ReviewsPage from "./pages/ReviewsPage";
import PollResponsePage from "./pages/PollResponsePage";
import LocationInfoPage from "./pages/LocationInfoPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
