import { Users } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-text-muted" />
      </div>
      <h2 className="text-lg font-semibold mb-2">Head-to-Head Athletics</h2>
      <p className="text-text-secondary max-w-md">
        Search for two athletes above to compare their career head-to-head record in finals.
      </p>
      <p className="text-text-muted text-sm mt-3">
        Try: Cole Hocker vs Cooper Teare
      </p>
    </div>
  );
}
