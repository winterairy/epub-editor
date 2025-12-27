import Tab from "./Tab";
import "../assets/styles/TabBar.css";

interface Tab {
  id: string;
  label: string;
  isActive: boolean;
  isClosable: boolean;
}

interface TabBarProps {
  tabs?: Tab[];
  onTabClick?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onNewTab?: () => void;
}

const TabBar: React.FC<TabBarProps> = ({
  tabs = [],
  onTabClick,
  onTabClose,
  onNewTab,
}) => {
  // 라이브러리 탭은 항상 첫 번째로 고정
  const defaultTabs: Tab[] = [
    { id: "library", label: "라이브러리", isActive: true, isClosable: false },
  ];

  const allTabs = [...defaultTabs, ...tabs];

  return (
    <div className="tab-bar">
      <div className="tabs-container">
        {allTabs.map((tab) => (
          <Tab
            key={tab.id}
            id={tab.id}
            label={tab.label}
            isActive={tab.isActive}
            isClosable={tab.isClosable}
            onClick={() => onTabClick?.(tab.id)}
            onClose={() => onTabClose?.(tab.id)}
          />
        ))}
      </div>
      <button className="new-tab-button" onClick={onNewTab}>
        + 새 탭
      </button>
    </div>
  );
};

export default TabBar;
