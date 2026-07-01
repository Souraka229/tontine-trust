import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";

import Landing from "./pages/Landing";
import Splash from "./pages/Splash";
import Connexion from "./pages/Connexion";
import Inscription from "./pages/Inscription";
import Home from "./pages/Home";
import Rechercher from "./pages/Rechercher";
import Rejoindre from "./pages/Rejoindre";
import GroupeDetail from "./pages/GroupeDetail";
import CreerGroupe from "./pages/CreerGroupe";
import Cotiser from "./pages/Cotiser";
import Confirmation from "./pages/Confirmation";
import Score from "./pages/Score";
import Historique from "./pages/Historique";
import Notifications from "./pages/Notifications";
import Profil from "./pages/Profil";
import Parametres from "./pages/Parametres";
import Admin from "./pages/Admin";
import Portefeuille from "./pages/Portefeuille";
import TestKkiapay from "./pages/TestKkiapay";
import CryptoLiquidity from "./pages/CryptoLiquidity";
import WhatsAppBot from "./pages/WhatsAppBot";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-[hsl(var(--tc-green))] border-t-transparent animate-spin" /></div>;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/connexion?next=${next}`} replace />;
  }
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-[hsl(var(--tc-green))] border-t-transparent animate-spin" /></div>;
  if (user) {
    const params = new URLSearchParams(location.search);
    const next = params.get("next");
    const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";
    return <Navigate to={dest} replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary title="TontineChain a rencontré un problème">
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route element={<AppLayout />}>
                  <Route path="/" element={<Landing />} />
                  <Route path="/whatsapp" element={<WhatsAppBot />} />
                  <Route path="/crypto" element={<CryptoLiquidity />} />
                  <Route path="/welcome" element={<Splash />} />
                  <Route path="/connexion" element={<GuestRoute><Connexion /></GuestRoute>} />
                  <Route path="/inscription" element={<GuestRoute><Inscription /></GuestRoute>} />
                  <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                  <Route path="/rechercher" element={<Rechercher />} />
                  <Route path="/rejoindre/:id" element={<Rejoindre />} />
                  <Route path="/groupe/:id" element={<ProtectedRoute><GroupeDetail /></ProtectedRoute>} />
                  <Route path="/creer" element={<ProtectedRoute><CreerGroupe /></ProtectedRoute>} />
                  <Route path="/cotiser" element={<ProtectedRoute><Cotiser /></ProtectedRoute>} />
                  <Route path="/confirmation" element={<ProtectedRoute><Confirmation /></ProtectedRoute>} />
                  <Route path="/score" element={<ProtectedRoute><Score /></ProtectedRoute>} />
                  <Route path="/historique" element={<ProtectedRoute><Historique /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/profil" element={<ProtectedRoute><Profil /></ProtectedRoute>} />
                  <Route path="/parametres" element={<ProtectedRoute><Parametres /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                  <Route path="/portefeuille" element={<ProtectedRoute><Portefeuille /></ProtectedRoute>} />
                  <Route path="/test-kkiapay" element={<ProtectedRoute><TestKkiapay /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Route>
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
