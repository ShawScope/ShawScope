import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, User } from 'lucide-react';

interface PatientSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (patient: { id: string; client_name: string; client_email: string; date_of_birth: string | null }) => void;
}

const PatientSearchDialog = ({ open, onOpenChange, onSelect }: PatientSearchDialogProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    const { data } = await supabase
      .from('patients')
      .select('id, client_name, client_email, client_phone, date_of_birth')
      .or(`client_name.ilike.%${query}%,client_email.ilike.%${query}%,client_phone.ilike.%${query}%`)
      .limit(10);
    setResults(data || []);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Select Patient</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search name, email, or phone..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading} size="icon">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {results.map(p => (
              <button
                key={p.id}
                onClick={() => { onSelect(p); onOpenChange(false); }}
                className="w-full text-left p-2 rounded hover:bg-muted flex items-center gap-2"
              >
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.client_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.client_email}</p>
                </div>
              </button>
            ))}
            {results.length === 0 && query.length > 1 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-4">No patients found</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatientSearchDialog;
