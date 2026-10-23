// teacher/TeacherLayout.jsx
// Root layout for all /teacher/* routes.
// Drop this into your router as the parent element for teacher pages.
import { useCallback, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  FilePen,
  Library,
  ClipboardList,
  BarChart2,
  FolderOpen,
  UserCircle,
  LayoutDashboard,
} from "lucide-react";
import TeacherSidebar from "./components/TeacherSidebar";
import TeacherTopBar from "./components/TeacherTopBar";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { useTeacherLanguage } from "./hooks/useLanguages";

// Maps route → page title + subtitle for the top bar
const PAGE_META = {
  "/teacher/dashboard":    { titleKey: "dashboard",    subtitleKey: "subtitle" },
  "/teacher/classes":      { titleKey: "classes"       },
  "/teacher/exams":        { titleKey: "exams"         },
  "/teacher/question-bank":{ titleKey: "questionBank"  },
  "/teacher/submissions":  { titleKey: "submissions"   },
  "/teacher/results":      { titleKey: "results"       },
  "/teacher/resources":    { titleKey: "resources"     },
  "/teacher/profile":      { titleKey: "profile"       },
};

const TeacherLayout = () => {
  const [collapsed, setCollapsed]     = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const { t }  = useTeacherLanguage();
  const location = useLocation();

  const meta  = PAGE_META[location.pathname] ?? { titleKey: "dashboard" };
  const title = t.sidebar[meta.titleKey] ?? meta.titleKey;
  const sub   = meta.subtitleKey ? t.dashboard[meta.subtitleKey] : undefined;

  return (
    <div className={cn("flex h-screen overflow-hidden")}>
      {/* Sidebar */}
      <TeacherSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />

      {/* Content column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TeacherTopBar
          pageTitle={title}
          pageSubtitle={sub}
          onMenuClick={() => setMobileOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-full p-5 lg:p-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;