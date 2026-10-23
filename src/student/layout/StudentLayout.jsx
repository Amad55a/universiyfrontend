import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import StudentFooter from "@/student/components/StudentFooter";
import PageTransition from "@/shared/components/PageTransition";
import { pageBg } from "@/shared/constants/surfaces";
import DashboardHeader from "@/student/components/DashboardComponents/DashboardHeader";
import UniversityVerificationBanner from "@/student/components/DashboardComponents/UniversityVerificationBanner";
import Sidebar, { MobileSidebarDrawer } from "@/student/components/Sidebar";

/**
 * Student app shell — sidebar + topbar on every student route,
 * EXCEPT the book reader, which is a fully immersive, full-screen
 * experience with no shell at all (no sidebar, no header, no footer).
 * BookReader.jsx owns its own back button (which just calls
 * navigate(-1) — "back" = "exit the reader"), its own floating
 * controls, and already renders itself as position:fixed/inset:0,
 * so the shell would just be wasted DOM sitting underneath it.
 *
 * IMPORTANT: the sidebar's rendered width lives in Sidebar.jsx
 * (w-[76px] collapsed / w-[248px] expanded). The wrapper below and the
 * content's left margin must always match those two numbers exactly —
 * a mismatch here is what was causing the blank strip of empty space.
 */
const StudentLayout = () => {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isELibraryPage = location.pathname.startsWith("/e-library");
  // The reader itself — /e-library/reader/:id — gets zero shell.
  const isImmersiveReader = location.pathname.startsWith("/e-library/reader");

  // Full-screen bypass: just the page, nothing else mounted around it.
  if (isImmersiveReader) {
    return (
      <div className="min-h-screen">
        <Outlet />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${pageBg}`}>
      {/* Desktop sidebar. `hidden lg:block` here (not just inside Sidebar)
          is what stops this from reserving width on mobile/tablet where
          nothing is actually visible there. */}
      <div
        className={`hidden lg:block fixed top-0 left-0 h-screen transition-all duration-300 z-[999] ${
          sidebarCollapsed ? "w-[76px]" : "w-[248px]"
        }`}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((p) => !p)}
        />
      </div>

      {/* Mobile slide-in drawer — same nav, only mounted when open */}
      <MobileSidebarDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main Content — the ml-[…] only ever applies at lg+, matching the
          sidebar wrapper above 1:1. Below lg it's 0, so there's no gap. */}
      <div
        className={`flex flex-col min-h-screen w-full transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[248px]"
        }`}
      >
        {/* Top Header — pass the mobile menu trigger through */}
        <DashboardHeader onOpenMobileNav={() => setMobileNavOpen(true)} />

        {/* Optional Banner */}
        {!isELibraryPage && <UniversityVerificationBanner />}

        {/* Page Content (Outlet) */}
        <main className="flex-1 min-h-0 overflow-y-auto pb-8 w-full">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>

        {/* Footer */}
        <StudentFooter />
      </div>

      {/* Mobile-only floating menu button — the sidebar (and its toggle)
          is hidden below lg, so mobile needs its own way in. */}
      <button 
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open menu"
        className="lg:hidden fixed bottom-5 left-5 z-40 w-12 h-12 rounded-2xl bg-[#2C2DE0] text-white
          shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA]
          active:translate-y-1 active:shadow-none transition-all duration-150
          flex items-center justify-center"
      >
        <Menu size={20} />
      </button>
    </div>
  );
};

export default StudentLayout;