import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Ear, Search, Loader2, User, Stethoscope, ChevronRight, X, FileDown, Plus, Trash2, ExternalLink, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import HearingScreeningDialog from '@/components/admin/HearingScreening/HearingScreeningDialog';

interface Patient {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  date_of_birth: string | null;
}

interface HearingScreeningTabProps {
  preSelectedPatient?: Patient | null;
  onClearPreSelected?: () => void;
}

interface QuickTile {
  id: string;
  name: string;
  url: string;
  icon: string;
  sort_order: number;
}

const HearingScreeningTab = ({ preSelectedPatient, onClearPreSelected }: HearingScreeningTabProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(preSelectedPatient || null);
  const [shawscopeOpen, setShawscopeOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Quick access tiles
  const [tiles, setTiles] = useState<QuickTile[]>([]);
  const [showAddTile, setShowAddTile] = useState(false);
  const [newTileName, setNewTileName] = useState('');
  const [newTileUrl, setNewTileUrl] = useState('');

  useEffect(() => {
    if (preSelectedPatient && preSelectedPatient.id !== selectedPatient?.id) {
      setSelectedPatient(preSelectedPatient);
    }
  }, [preSelectedPatient]);

  // Load quick tiles
  useEffect(() => {
    const loadTiles = async () => {
      const { data } = await supabase.from('hearing_quick_tiles' as any)
        .select('*').order('sort_order');
      if (data) setTiles(data as any);
    };
    loadTiles();
  }, []);

  const addTile = async () => {
    if (!newTileName.trim() || !newTileUrl.trim()) return;
    const { data, error } = await supabase.from('hearing_quick_tiles' as any).insert({
      name: newTileName.trim(),
      url: newTileUrl.trim(),
      sort_order: tiles.length,
    } as any).select().single();
    if (error) { toast.error('Failed to add tile'); return; }
    setTiles(prev => [...prev, data as any]);
    setNewTileName(''); setNewTileUrl(''); setShowAddTile(false);
    toast.success('Tile added');
  };

  const removeTile = async (id: string) => {
    await supabase.from('hearing_quick_tiles' as any).delete().eq('id', id);
    setTiles(prev => prev.filter(t => t.id !== id));
  };

  const downloadScreeningPdf = async (storagePath: string) => {
    const { data, error } = await supabase.storage.from('shawscope').createSignedUrl(storagePath, 60);
    if (error || !data?.signedUrl) { toast.error('Failed to generate download link'); return; }
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = storagePath.split('/').pop() || 'hearing-screening.pdf';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    const { data } = await supabase.from('patients')
      .select('id, client_name, client_email, client_phone, date_of_birth')
      .or(`client_name.ilike.%${searchQuery}%,client_email.ilike.%${searchQuery}%,client_phone.ilike.%${searchQuery}%`)
      .limit(10);
    setSearchResults((data || []) as Patient[]);
    setSearching(false);
  };

  const selectPatient = async (p: Patient) => {
    setSelectedPatient(p);
    setSearchResults([]);
    setSearchQuery('');
    const { data } = await supabase.from('hearing_screenings')
      .select('id, created_at, screening_method, left_classification, right_classification, overall_recommendation, pdf_storage_path')
      .eq('patient_id', p.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setHistory(data || []);
    setHistoryLoaded(true);
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setHistory([]);
    setHistoryLoaded(false);
    onClearPreSelected?.();
  };

  const patientAge = selectedPatient?.date_of_birth
    ? Math.floor((Date.now() - new Date(selectedPatient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="space-y-4">
      {/* Quick Access Tiles */}
      {(tiles.length > 0 || showAddTile) && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" /> Quick Access
              </CardTitle>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddTile(!showAddTile)}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {tiles.map(tile => (
                <div key={tile.id} className="relative group">
                  <a href={tile.url} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center gap-1 rounded-lg border bg-muted/30 hover:bg-muted/60 p-3 text-center transition-colors min-h-[60px]">
                    <ExternalLink className="h-4 w-4 text-primary" />
                    <span className="text-[11px] font-medium leading-tight">{tile.name}</span>
                  </a>
                  <button onClick={() => removeTile(tile.id)}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
            {showAddTile && (
              <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <Input placeholder="Tile name" value={newTileName} onChange={e => setNewTileName(e.target.value)} className="h-8 text-sm" />
                <Input placeholder="https://..." value={newTileUrl} onChange={e => setNewTileUrl(e.target.value)} className="h-8 text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={addTile}>Add</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddTile(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add tile button when no tiles */}
      {tiles.length === 0 && !showAddTile && (
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowAddTile(true)}>
          <Plus className="h-3 w-3 mr-1" /> Add Quick Access Tile
        </Button>
      )}

      {!selectedPatient ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Ear className="h-5 w-5 text-primary" />
              Hearing Screening
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label className="text-sm font-medium">Select Patient</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Search name, email or phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <Button size="icon" onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-1 max-h-60 overflow-y-auto border rounded-md p-1">
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => selectPatient(p)}
                    className="w-full text-left p-2.5 rounded hover:bg-muted flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.client_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.client_email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchResults.length === 0 && searchQuery.length > 1 && !searching && (
              <p className="text-sm text-muted-foreground text-center py-3">No patients found</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Patient Header */}
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedPatient.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedPatient.client_email}
                      {patientAge !== null && <span className="ml-2">• {patientAge} yrs</span>}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={clearPatient}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Start ShawScope Screening */}
          {!shawscopeOpen && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  ShawScope Digital Screening
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Clinician-controlled screening with Sennheiser HD 300 Pro (wired). Full manual frequency, level, and ear control.
                </p>
                <Button className="w-full" size="lg" onClick={() => setShawscopeOpen(true)}>
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Start ShawScope Screening
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Screening History */}
          {historyLoaded && history.length > 0 && !shawscopeOpen && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Screening History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {history.map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted/80">
                      <div className="flex items-center gap-3">
                        <Stethoscope className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(h.created_at), 'dd/MM/yyyy HH:mm')}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            L: {h.left_classification || '—'} / R: {h.right_classification || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {h.pdf_storage_path && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadScreeningPdf(h.pdf_storage_path)} title="Download PDF">
                            <FileDown className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Badge variant="outline" className="text-[10px]">ShawScope</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ShawScope Dialog */}
      <HearingScreeningDialog
        open={shawscopeOpen}
        onOpenChange={(open) => {
          setShawscopeOpen(open);
          if (!open && selectedPatient) {
            selectPatient(selectedPatient);
          }
        }}
        patientId={selectedPatient?.id}
        patientName={selectedPatient?.client_name}
        patientDob={selectedPatient?.date_of_birth}
        patientEmail={selectedPatient?.client_email}
        serviceContext="standalone"
      />
    </div>
  );
};

export default HearingScreeningTab;
