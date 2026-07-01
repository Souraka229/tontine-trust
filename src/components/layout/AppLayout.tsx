import { Outlet, useLocation } from "react-router-dom";
import TabBar from "./TabBar";
import DesktopNav from "./DesktopNav";
import PublicNav from "./PublicNav";
import WhatsAppFab from "@/components/WhatsAppFab";
import { useAuth } from "@/hooks/useAuth";
import { isPublicPath } from "@/config/access";
import { fullWidthRoutes, noNavRoutes } from "@/config/navConfig";

export default function AppLayout() {
  const location = useLocation();
  const path = location.pathname;
  const { user } = useAuth();
  const isGuestPublic = !user && isPublicPath(path);
  const showAppNav = user && !noNavRoutes.includes(path) && !path.startsWith("/rejoindre");
  const showPublicNav = isGuestPublic && path !== "/";
  const isFullWidth = fullWidthRoutes.includes(path) || isGuestPublic;

  if (isFullWidth && !showPublicNav) {
    return (
      <div className="flex flex-col min-h-screen w-full bg-background">
        <Outlet />
      </div>
    );
  }

  if (showPublicNav) {
    return (
      <div className="flex flex-col min-h-screen w-full bg-background">
        <PublicNav />
        <main className="flex-1 w-full mx-auto max-w-5xl px-4 md:px-8 py-4">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {showAppNav && <DesktopNav />}

      <div className="flex flex-1 flex-col min-h-screen min-w-0 w-full">
        <main className="flex-1 w-full max-w-none lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 overflow-y-auto min-h-0">
          <Outlet />
        </main>
        {showAppNav && (
          <div className="md:hidden shrink-0 w-full sticky bottom-0 z-50">
            <TabBar />
          </div>
        )}
        {showAppNav && <WhatsAppFab />}
      </div>
    </div>
  );
}
