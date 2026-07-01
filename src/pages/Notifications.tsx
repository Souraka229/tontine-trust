import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  color: string;
  navigate_to: string;
  created_at: string;
}

const dotColors: Record<string, string> = {
  green: "bg-[hsl(var(--tc-green))]",
  amber: "bg-[hsl(var(--tc-amber))]",
  red: "bg-[hsl(var(--tc-red))]",
  blue: "bg-[hsl(var(--tc-blue))]",
  purple: "bg-[hsl(var(--tc-purple))]",
  orange: "bg-[hsl(var(--tc-amber))]",
};

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setNotifications((data as Notification[]) || []));
  }, [user]);

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      try {
        await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      } catch {
        // silent
      }
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      );
    }
    if (n.navigate_to) navigate(n.navigate_to);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const formatTime = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="animate-fade-in">
      <TopBar
        title="Notifications"
        backTo="/home"
        backLabel="Accueil"
        rightElement={
          unreadCount > 0 ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-[hsla(0,84%,60%,0.12)] text-[hsl(var(--tc-red))]">
              {unreadCount}
            </span>
          ) : undefined
        }
      />
      <div className="pb-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-3xl mb-2">🔔</p>
            <p className="text-sm">Aucune notification</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border transition-colors hover:bg-accent/50 ${
                !n.is_read ? "bg-accent/30" : ""
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                  dotColors[n.color] || dotColors.blue
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold mb-0.5">{n.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{n.message}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatTime(n.created_at)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
