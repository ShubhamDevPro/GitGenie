import { useState } from "react";

export const useSidebar = () => {
     const [isSidebarOpen, setIsSidebarOpen] = useState(false);

     const openSidebar = () => setIsSidebarOpen(true);
     const closeSidebar = () => setIsSidebarOpen(false);
     const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

     return {
          isSidebarOpen,
          openSidebar,
          closeSidebar,
          toggleSidebar,
     };
};
