import { Outlet, useLocation } from "react-router-dom";
import TabBar from "./TabBar";

const noTabRoutes = ["/", "/welcome", "/connexion", "/inscription", "/splash", "/crypto"];
const fullWidthRoutes = ["/", "/crypto", "/whatsapp", "/connexion", "/inscription"];

export default function AppLayout() {
  const location = useLocation();
  const showTabs = !noTabRoutes.includes(location.pathname);
  const isFullWidth = fullWidthRoutes.includes(location.pathname);

  return (
    <div className={`flex flex-col min-h-screen ${isFullWidth ? "w-full" : "max-w-md mx-auto"} bg-background ${isFullWidth ? "" : "h-screen overflow-hidden"}`}>
      <div className={`flex-1 ${isFullWidth ? "" : "overflow-y-auto"}`}>
        <Outlet />
      </div>
      {showTabs && <TabBar />}
    </div>
  );
}