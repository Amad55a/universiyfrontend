import React, { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Sidebar from "@/admin/components/Sidebar/Sidebar";
import AdminHeader from "@/admin/components/Header/AdminHeader";
import { cn } from "@/lib/utils";

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-black dark:text-white transition-colors">
      <div className="flex min-h-screen">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onCloseMobile={closeMobile}
        />

        <div
          className={cn(
            "flex flex-1 flex-col min-w-0 min-h-screen",
            "transition-[margin] duration-250"
          )}
        >
          <AdminHeader
            mobileOpen={mobileOpen}
            onMenuClick={() => setMobileOpen((open) => !open)}
          />

          <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <Outlet />
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
