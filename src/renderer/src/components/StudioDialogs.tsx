import { useRef, useState } from "react";
import type { RefObject } from "react";
import { ArrowUpTrayIcon, BookOpenIcon } from "@heroicons/react/24/outline";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ChoiceSelect } from "./ChoiceSelect";

export type DialogKind = "new" | "open" | "import" | "settings" | "help" | null;
export type BookDraft = { title: string; author: string; language: string; template: string };
const titles = { new: "새 책 만들기", open: "최근 프로젝트", import: "Word 원고 가져오기", settings: "책 설정", help: "EPUB Studio 안내" };
const descriptions = {
  new: "템플릿을 골라 새 원고를 시작하세요. 데모 문서는 디스크에 저장하지 않습니다.",
  open: "최근 프로젝트 목록 예시입니다. 실제 경로는 읽지 않습니다.",
  import: "Word 원고를 책의 본문으로 가져오는 화면입니다.",
  settings: "책 제목, 저자와 언어를 설정합니다. OPF 저장은 후속 구현입니다.",
  help: "로컬 전자책 작업실 UI 프로토타입입니다.",
};

export function StudioDialogs({ kind, draft, bookTitle, hasEdits, returnFocus, onChange, onClose, onCreate, onApply, onOpenSample, onImport }: {
  kind: DialogKind;
  draft: BookDraft;
  bookTitle: string;
  hasEdits: boolean;
  returnFocus: RefObject<HTMLElement | null>;
  onChange: (draft: Partial<BookDraft>) => void;
  onClose: () => void;
  onCreate: () => void;
  onApply: () => void;
  onOpenSample: () => void;
  onImport: () => void;
}) {
  const [confirmNew, setConfirmNew] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = () => {
    const target = returnFocus.current;
    if (target?.isConnected) target.focus();
    else document.querySelector<HTMLElement>('[data-slot="menubar-trigger"]')?.focus();
  };
  return (
    <Dialog open={kind !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="studio-dialog" onCloseAutoFocus={(event) => { event.preventDefault(); restoreFocus(); }}>
        <DialogHeader>
          <DialogTitle>{titles[kind ?? "help"]}</DialogTitle>
          <DialogDescription>{descriptions[kind ?? "help"]}</DialogDescription>
        </DialogHeader>
        {(kind === "new" || kind === "settings") && (
          <form className="dialog-form" onSubmit={(event) => {
            event.preventDefault();
            if (kind === "settings") onApply();
            else if (hasEdits) setConfirmNew(true);
            else onCreate();
          }}>
            <div className="form-field">
              <Label htmlFor="book-title">책 제목</Label>
              <Input id="book-title" autoFocus value={draft.title} placeholder="새로운 책" onChange={(event) => onChange({ title: event.target.value })} />
            </div>
            {kind === "new" ? (
              <div className="form-field">
                <Label htmlFor="book-template">기본 템플릿</Label>
                <ChoiceSelect id="book-template" label="기본 템플릿" value={draft.template} onValueChange={(template) => onChange({ template })} options={["빈 책", "소설", "에세이"].map((name) => ({ value: name, label: name }))} />
              </div>
            ) : (
              <>
                <div className="form-field">
                  <Label htmlFor="book-author">저자</Label>
                  <Input id="book-author" value={draft.author} onChange={(event) => onChange({ author: event.target.value })} />
                </div>
                <div className="form-field">
                  <Label htmlFor="book-language">언어</Label>
                  <ChoiceSelect id="book-language" label="언어" value={draft.language} onValueChange={(language) => onChange({ language })} options={[{ value: "ko", label: "한국어" }, { value: "en", label: "영어" }]} />
                </div>
                <p className="muted">표지와 목차의 세부 설정은 후속 구현됩니다.</p>
              </>
            )}
            <div className="dialog-actions">
              <Button type="button" variant="outline" onClick={onClose}>취소</Button>
              <Button type="submit" ref={createButton}>{kind === "new" ? "책 만들기 (데모)" : "적용 (데모)"}</Button>
            </div>
          </form>
        )}
        {kind === "open" && (
          <Button variant="outline" className="recent-card" onClick={onOpenSample}>
            <BookOpenIcon className="size-5" />
            <span><b>{bookTitle}</b><small>샘플 프로젝트 · 현재 세션</small></span>
          </Button>
        )}
        {kind === "import" && (
          <>
            <div className="import-placeholder"><ArrowUpTrayIcon className="size-8" />DOCX 원고를 가져올 공간</div>
            <p>Mammoth로 문단·제목·이미지를 가져오는 기능은 후속 단계에서 구현합니다.</p>
            <Button variant="outline" onClick={onImport}>파일 선택 (예정)</Button>
          </>
        )}
        {kind === "help" && (
          <div className="help-content">
            <p>탐색기 → 편집 → 변경 확인 → 내보내기 흐름을 확인할 수 있습니다.</p>
            <p>Ctrl+B: 사이드바 · Ctrl+J: 하단 패널 · Ctrl+S: 저장 데모</p>
            <p className="muted">프로젝트 저장·DOCX 가져오기·미디어·실제 EPUB/PDF 출력은 아직 제공하지 않습니다. 코드에서 일반 편집으로 전환하면 지원하지 않는 태그가 유실될 수 있습니다.</p>
          </div>
        )}
        <AlertDialog open={confirmNew} onOpenChange={setConfirmNew}>
          <AlertDialogContent onCloseAutoFocus={(event) => { event.preventDefault(); createButton.current?.focus(); }}>
            <AlertDialogHeader>
              <AlertDialogTitle>편집 내용과 기록을 지울까요?</AlertDialogTitle>
              <AlertDialogDescription>현재 데모의 편집 내용과 내보내기 기록을 지우고 새 책을 만듭니다. 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => { setConfirmNew(false); onCreate(); }}>지우고 새 책 만들기</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
