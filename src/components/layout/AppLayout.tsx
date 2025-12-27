import Toolbar from "./Toolbar";
import TabBar from "./TabBar";
import Sidebar from "./Sidebar";
import StatusBar from "./StatusBar";
import "../assets/styles/AppLayout.css";

interface AppLayoutProps {
  children?: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="app-layout">
      <Toolbar />
      <TabBar />
      <div className="app-content">
        <Sidebar />
        <main className="main-content">{children}</main>
      </div>
      <StatusBar />
    </div>
  );
};

export default AppLayout;
