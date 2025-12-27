import "../assets/styles/Sidebar.css";

interface SidebarProps {
  isLibraryActive?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isLibraryActive = true }) => {
  return (
    <aside className="sidebar">
      {isLibraryActive ? (
        <div className="sidebar-content">
          <h3>필터 및 정렬</h3>
          <p>라이브러리 필터 옵션이 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="sidebar-content">
          <h3>목차</h3>
          <p>EPUB 목차가 여기에 표시됩니다.</p>
          <h3>북마크</h3>
          <p>북마크 목록이 여기에 표시됩니다.</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
