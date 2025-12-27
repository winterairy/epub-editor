import "../assets/styles/Tab.css";

interface TabProps {
  id: string;
  label: string;
  isActive: boolean;
  isClosable: boolean;
  onClick?: () => void;
  onClose?: () => void;
}

const Tab: React.FC<TabProps> = ({
  // id,
  label,
  isActive,
  isClosable,
  onClick,
  onClose,
}) => {
  return (
    <div className={`tab ${isActive ? "active" : ""}`} onClick={onClick}>
      <span className="tab-label">{label}</span>
      {isClosable && (
        <button
          className="tab-close-button"
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Tab;
