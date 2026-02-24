import { TeacherAppSidebar } from "@/components/teacher-app-sidebar";
import { getUnreadConversationCount } from "@/server/messaging-actions";
import { SidebarProvider } from "@/components/ui/sidebar";

import { UploadProgressProvider } from "@/components/upload-progress-provider";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const unreadCount = await getUnreadConversationCount();

  return (
    <SidebarProvider>
      <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
        <TeacherAppSidebar unreadCount={unreadCount} />
        <div className="flex flex-col overflow-hidden relative">
          <UploadProgressProvider>
            {children}
          </UploadProgressProvider>
        </div>
      </div>
    </SidebarProvider>
  );
}
