export interface Tag {
  id: string;
  name: string;
  type: 'full' | 'limited' | 'combined';
}

interface TagSelectorProps {
  availableTags: Tag[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  courseId?: string;
}

export function TagSelector({ availableTags, selectedTags, onChange }: TagSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2 text-slate-700">Course-Specific Tags</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {availableTags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedTags.includes(tag.name)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selectedTags, tag.name]);
                  } else {
                    onChange(selectedTags.filter((t) => t !== tag.name));
                  }
                }}
                className="rounded border-slate-300 text-teal-primary focus:ring-teal-primary"
              />
              <span className="text-sm text-slate-600 group-hover:text-deep-teal">{tag.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
