import "../assets/styles/Toolbar.css";

const Toolbar: React.FC = () => {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-button">파일 열기</button>
        <button className="toolbar-button">설정</button>
        <button className="toolbar-button">검색</button>
      </div>
      <div className="toolbar-right">
        <button className="toolbar-button">최소화</button>
        <button className="toolbar-button">닫기</button>
      </div>
    </div>
  );
};

export default Toolbar;
