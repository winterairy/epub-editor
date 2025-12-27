import AppLayout from "./components/layout/AppLayout";
import "./App.css";

function App() {
  return (
    <AppLayout>
      <div className="app-placeholder">
        <h1>EPUB Reader</h1>
        <p>라이브러리 또는 EPUB 파일을 열어서 시작하세요.</p>
      </div>
    </AppLayout>
  );
}

export default App;
