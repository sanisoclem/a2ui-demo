export type CategoryPicker = (category: unknown) => void;

export function categoryPicker(
  setSelection: (value: string) => void,
  action: (() => Promise<void>) | undefined,
): CategoryPicker | undefined {
  if (!action) return undefined;
  return (category) => {
    setSelection(String(category));
    void action();
  };
}
