import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function ChoiceSelect({ id, label, value, onValueChange, options }: {
  id?: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} aria-label={label} className="choice-select">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
