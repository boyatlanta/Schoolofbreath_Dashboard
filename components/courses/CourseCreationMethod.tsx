export type CreationMethod = 'fromScratch' | 'fromSystemeio';

interface MethodSelectorProps {
  onSelect: (method: CreationMethod) => void;
}

export function MethodSelector({ onSelect }: MethodSelectorProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-deep-teal">Choose Creation Method</h2>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelect('fromScratch')}
          className="p-6 border border-slate-200 rounded-xl hover:bg-teal-primary/5 hover:border-teal-primary/30 transition-colors text-left"
        >
          <h3 className="font-medium text-deep-teal mb-2">Create from Scratch</h3>
          <p className="text-sm text-slate-500">Start with an empty course structure</p>
        </button>
      </div>
    </div>
  );
}
