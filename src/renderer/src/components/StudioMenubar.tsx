import type { Command } from "../../../shared/commands";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarShortcut, MenubarTrigger } from "./ui/menubar";

const groups: Record<string, [string, Command][]> = {
  파일: [["새 책…", "new"], ["열기…", "open"], ["DOCX 가져오기…", "import"], ["저장 (데모)", "save"], ["EPUB/PDF 내보내기…", "export"]],
  편집: [["책 전체 검색", "search"]],
  보기: [["사이드바 표시/숨기기", "sidebar"], ["하단 패널 표시/숨기기", "panel"], ["미리보기 표시/숨기기", "preview"]],
  책: [["메타데이터·표지·목차", "settings"], ["템플릿·스타일", "templates"]],
  도구: [["책 검증 (데모)", "validate"], ["변경 내용 확인", "changes"]],
  도움말: [["사용 안내", "help"]],
};
const shortcuts: Partial<Record<Command, string>> = { save: "Ctrl+S", sidebar: "Ctrl+B", panel: "Ctrl+J" };

export function StudioMenubar({ onCommand }: { onCommand: (command: Command) => void }) {
  return (
    <Menubar className="studio-menubar" aria-label="브라우저용 메뉴">
      {Object.entries(groups).map(([label, items]) => (
        <MenubarMenu key={label}>
          <MenubarTrigger>{label}</MenubarTrigger>
          <MenubarContent>
            {items.map(([text, command]) => (
              <MenubarItem key={command} onSelect={() => onCommand(command)}>
                {text}
                {shortcuts[command] && <MenubarShortcut>{shortcuts[command]}</MenubarShortcut>}
              </MenubarItem>
            ))}
          </MenubarContent>
        </MenubarMenu>
      ))}
    </Menubar>
  );
}
