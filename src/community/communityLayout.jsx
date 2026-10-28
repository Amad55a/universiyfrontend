// src/components/community/CommunityLayout.jsx
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import CommunitySidebar, { CHARTER_FONT_STACK } from "./CommunitySidebar";
import TrendingSidebar from "./TrendingSidebar";
import CommunityHeader from "./communityHeader";
import WritePostModal from "./WritePostModel";

const CommunityLayout = () => {
  const [writeOpen, setWriteOpen] = React.useState(false);
  const [newPost, setNewPost] = React.useState(null);
  const location = useLocation();

  const handleCreated = (post) => {
    setNewPost(post); // Feed.jsx reads this via useOutletContext and prepends it
  };

  const isMeetingRoom = /^\/community\/meetings\/room(?:\/|$)/i.test(location.pathname);
  const isChatPage = /^\/community\/chat\/?$/i.test(location.pathname);
  const isCollaborationPage =
    isChatPage || /^\/community\/(?:meetings|groups)(?:\/|$)/i.test(location.pathname);

  if (isMeetingRoom) {
    return (
      <div className="w-full min-h-screen bg-white dark:bg-black">
        <Outlet context={{ newPost }} />
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-dvh w-full min-w-0 bg-white dark:bg-black gap-0 ${isCollaborationPage ? "" : "lg:gap-10"}`}
      style={{ fontFamily: CHARTER_FONT_STACK }}
    >
      {/* Left sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-gray-100 dark:border-gray-900 h-screen sticky top-0 overflow-y-auto">
        <CommunitySidebar />
      </aside>

      {/* Center column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <CommunityHeader onWritePost={() => setWriteOpen(true)} notificationCount={0} />
        <main className={`flex-1 w-full min-w-0 ${isChatPage ? "flex min-h-0" : ""}`}>
          <div className={`w-full min-w-0 mx-auto ${isChatPage ? "flex min-h-0 px-0 py-0" : "px-3 sm:px-6 lg:px-10 py-5 sm:py-8 lg:py-10"}`}>
            <Outlet context={{ onOpenWrite: () => setWriteOpen(true), newPost }} />
          </div>
        </main>
      </div>

      {/* Right rail */}
      {!isCollaborationPage && (
        <aside className="hidden lg:block w-64 shrink-0 border-l border-gray-100 dark:border-gray-900 h-screen sticky top-0 overflow-y-auto">
          <TrendingSidebar />
        </aside>
      )}

      <WritePostModal
        open={writeOpen}
        onClose={() => setWriteOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
};

export default CommunityLayout;