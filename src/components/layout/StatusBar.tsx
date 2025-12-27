import "../assets/styles/StatusBar.css";

interface StatusBarProps {
  currentPage?: number;
  totalPages?: number;
  progress?: number;
  currentBook?: string;
}

const StatusBar: React.FC<StatusBarProps> = ({
  currentPage = 0,
  totalPages = 0,
  progress = 0,
  currentBook = "",
}) => {
  return (
    <div className="status-bar">
      <div className="status-item">
        페이지 {currentPage}/{totalPages}
      </div>
      <div className="status-item">진행률: {progress}%</div>
      <div className="status-item">{currentBook && `책: ${currentBook}`}</div>
    </div>
  );
};

export default StatusBar;
