import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Minus, Sparkles, Package, AlertTriangle, Loader2, Trash2, Pencil, ShoppingCart, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Kit {
  id: string;
  kit_name: string;
  service_type: string;
  service_types: string[];
  total_kits: number;
  available_kits: number;
  low_stock_threshold: number;
  is_washable: boolean;
  unit_cost: number;
  updated_at: string;
}

interface UsageLog {
  id: string;
  kit_id: string;
  event_type: string;
  quantity: number;
  notes: string | null;
  created_at: string;
}

interface Service {
  id: string;
  name: string;
}

const KitInventoryPanel = ({ onLowStockChange }: { onLowStockChange?: (items: { kit_name: string; available_kits: number; is_washable: boolean }[]) => void }) => {
  const [kits, setKits] = useState<Kit[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Kit | null>(null);
  const [logDialogKit, setLogDialogKit] = useState<Kit | null>(null);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [restockDialogKit, setRestockDialogKit] = useState<Kit | null>(null);
  const [restockQty, setRestockQty] = useState(1);

  // Form
  const [kitName, setKitName] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [totalKits, setTotalKits] = useState(10);
  const [availableKits, setAvailableKits] = useState(10);
  const [threshold, setThreshold] = useState(2);
  const [isWashable, setIsWashable] = useState(true);
  const [unitCost, setUnitCost] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchKits = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('kit_inventory').select('*').order('service_type').order('kit_name');
    setKits((data || []).map((k: any) => ({
      ...k,
      service_types: k.service_types || [k.service_type],
      is_washable: k.is_washable ?? true,
      unit_cost: k.unit_cost ?? 0,
    })) as Kit[]);
    setLoading(false);
  }, []);

  const fetchServices = useCallback(async () => {
    const { data } = await supabase.from('services').select('id, name').eq('is_active', true).order('sort_order');
    setServices((data || []) as Service[]);
  }, []);

  useEffect(() => { fetchKits(); fetchServices(); }, [fetchKits, fetchServices]);

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(serviceId) ? prev.filter(s => s !== serviceId) : [...prev, serviceId]
    );
  };

  const openNew = () => {
    setEditing(null);
    setKitName(''); setSelectedServiceIds([]); setTotalKits(10); setAvailableKits(10); setThreshold(2); setIsWashable(true); setUnitCost(0);
    setDialogOpen(true);
  };

  const openEdit = (kit: Kit) => {
    setEditing(kit);
    setKitName(kit.kit_name);
    setSelectedServiceIds(kit.service_types || [kit.service_type]);
    setTotalKits(kit.total_kits); setAvailableKits(kit.available_kits); setThreshold(kit.low_stock_threshold);
    setIsWashable(kit.is_washable);
    setUnitCost(kit.unit_cost);
    setDialogOpen(true);
  };

  const saveKit = async () => {
    if (!kitName.trim()) { toast.error('Kit name is required'); return; }
    if (selectedServiceIds.length === 0) { toast.error('Select at least one service'); return; }
    setSaving(true);
    const payload: any = {
      kit_name: kitName.trim(),
      service_type: selectedServiceIds[0],
      service_types: selectedServiceIds,
      total_kits: totalKits,
      available_kits: availableKits,
      low_stock_threshold: threshold,
      is_washable: isWashable,
      unit_cost: unitCost,
    };
    if (editing) {
      await supabase.from('kit_inventory').update(payload).eq('id', editing.id);
      toast.success('Kit updated');
    } else {
      await supabase.from('kit_inventory').insert(payload);
      toast.success('Kit added');
    }
    setSaving(false);
    setDialogOpen(false);
    fetchKits();
  };

  const deleteKit = async (id: string) => {
    await supabase.from('kit_inventory').delete().eq('id', id);
    toast.success('Kit removed');
    fetchKits();
  };

  const sendLowStockAlert = async (kit: Kit, newCount: number) => {
    try {
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'low_stock_alert',
          kit_name: kit.kit_name,
          available: newCount,
          threshold: kit.low_stock_threshold,
          is_washable: kit.is_washable,
        },
      });
    } catch (e) {
      console.error('Failed to send low stock alert:', e);
    }
  };

  const recordUsage = async (kit: Kit) => {
    if (kit.available_kits <= 0) { toast.error('No stock available'); return; }
    const newCount = kit.available_kits - 1;
    await supabase.from('kit_inventory').update({ available_kits: newCount }).eq('id', kit.id);
    await supabase.from('kit_usage_log').insert({ kit_id: kit.id, event_type: 'used', quantity: 1 });
    if (newCount <= kit.low_stock_threshold) {
      toast.warning(`⚠️ ${kit.kit_name} is low — ${newCount} remaining. ${kit.is_washable ? 'Time to clean!' : 'Time to reorder!'}`);
      sendLowStockAlert(kit, newCount);
    } else {
      toast.success(`Used 1 ${kit.kit_name} — ${newCount} remaining`);
    }
    fetchKits();
  };

  const recordCleaning = async (kit: Kit) => {
    const restored = kit.total_kits;
    await supabase.from('kit_inventory').update({ available_kits: restored }).eq('id', kit.id);
    await supabase.from('kit_usage_log').insert({
      kit_id: kit.id, event_type: 'cleaned', quantity: restored - kit.available_kits,
      notes: `Cleaning session — restocked to ${restored}`,
    });
    toast.success(`${kit.kit_name} cleaned & restocked to ${restored}`);
    fetchKits();
  };

  const recordRestock = async (kit: Kit, qty: number) => {
    const newCount = Math.min(kit.available_kits + qty, kit.total_kits);
    await supabase.from('kit_inventory').update({ available_kits: newCount }).eq('id', kit.id);
    await supabase.from('kit_usage_log').insert({
      kit_id: kit.id, event_type: 'restocked', quantity: qty,
      notes: `Restocked ${qty} — now ${newCount}`,
    });
    toast.success(`${kit.kit_name} restocked +${qty} — now ${newCount}`);
    setRestockDialogKit(null);
    fetchKits();
  };

  const viewLog = async (kit: Kit) => {
    setLogDialogKit(kit);
    setLogsLoading(true);
    const { data } = await supabase.from('kit_usage_log')
      .select('*')
      .eq('kit_id', kit.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setLogs((data || []) as UsageLog[]);
    setLogsLoading(false);
  };

  const getServiceLabels = (kit: Kit) => {
    const types = kit.service_types?.length ? kit.service_types : [kit.service_type];
    return types.map(st => {
      const svc = services.find(s => s.id === st);
      return svc?.name || st;
    });
  };

  const lowStockKits = kits.filter(k => k.available_kits <= k.low_stock_threshold);
  const washableKits = kits.filter(k => k.is_washable);
  const consumableKits = kits.filter(k => !k.is_washable);

  useEffect(() => {
    onLowStockChange?.(lowStockKits.map(k => ({ kit_name: k.kit_name, available_kits: k.available_kits, is_washable: k.is_washable })));
  }, [lowStockKits.length, kits]);

  return (
    <div className="space-y-4">
      {lowStockKits.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 px-4 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {lowStockKits.some(k => k.is_washable) ? 'Cleaning / Restock Required' : 'Restock Required'}
              </p>
              <p className="text-xs text-muted-foreground">
                {lowStockKits.map(k => `${k.kit_name} (${k.available_kits} left${k.is_washable ? '' : ' — consumable'})`).join(', ')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Package className="h-4 w-4" /> Kit Inventory
        </h3>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Kit
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : kits.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No kits tracked yet. Add your clinical kits or consumables above.</p>
      ) : (
        <div className="space-y-3">
          {washableKits.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Washable Kits
              </p>
              {washableKits.map(kit => (
                <CompactKitTile key={kit.id} kit={kit} getServiceLabels={getServiceLabels} onUse={recordUsage} onClean={recordCleaning} onViewLog={viewLog} onEdit={openEdit} onDelete={deleteKit} />
              ))}
            </div>
          )}
          {consumableKits.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" /> Consumables
              </p>
              {consumableKits.map(kit => (
                <CompactKitTile key={kit.id} kit={kit} getServiceLabels={getServiceLabels} onUse={recordUsage} onRestock={(k) => { setRestockDialogKit(k); setRestockQty(1); }} onViewLog={viewLog} onEdit={openEdit} onDelete={deleteKit} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Kit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif">{editing ? 'Edit Kit' : 'Add Kit'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kit / Item Name *</Label>
              <Input value={kitName} onChange={e => setKitName(e.target.value)} placeholder="e.g. Ear Suction Tips, Disposable Gloves" />
            </div>

            <div className="flex items-center justify-between">
              <Label>Washable / Reusable?</Label>
              <Switch checked={isWashable} onCheckedChange={setIsWashable} />
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              {isWashable ? 'This item can be cleaned and restocked in bulk.' : 'This is a consumable — track stock and reorder when low.'}
            </p>

            <div className="space-y-2">
              <Label>Used for Services *</Label>
              <div className="space-y-2 rounded-md border p-3">
                {services.map(svc => (
                  <label key={svc.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={selectedServiceIds.includes(svc.id)}
                      onCheckedChange={() => toggleService(svc.id)}
                    />
                    {svc.name}
                  </label>
                ))}
                {services.length === 0 && <p className="text-xs text-muted-foreground">No active services found.</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{isWashable ? 'Total Kits' : 'Total Stock'}</Label>
                <Input type="number" min={1} value={totalKits} onChange={e => setTotalKits(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Available</Label>
                <Input type="number" min={0} value={availableKits} onChange={e => setAvailableKits(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Low Alert At</Label>
                <Input type="number" min={0} value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit Cost (£)</Label>
                <Input type="number" min={0} step={0.01} value={unitCost} onChange={e => setUnitCost(Number(e.target.value))} placeholder="0.00" />
              </div>
            </div>
            <Button onClick={saveKit} className="w-full" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? 'Update' : 'Add'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={!!restockDialogKit} onOpenChange={() => setRestockDialogKit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-serif">Restock {restockDialogKit?.kit_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quantity to add</Label>
              <Input type="number" min={1} value={restockQty} onChange={e => setRestockQty(Number(e.target.value))} />
              {restockDialogKit && (
                <p className="text-xs text-muted-foreground">Current: {restockDialogKit.available_kits} / {restockDialogKit.total_kits}</p>
              )}
            </div>
            <Button className="w-full" onClick={() => restockDialogKit && recordRestock(restockDialogKit, restockQty)}>
              <Plus className="h-4 w-4 mr-1" /> Restock +{restockQty}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Usage Log Dialog */}
      <Dialog open={!!logDialogKit} onOpenChange={() => setLogDialogKit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif">{logDialogKit?.kit_name} — Usage Log</DialogTitle></DialogHeader>
          {logsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No usage recorded yet.</p>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto space-y-1">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${log.event_type === 'cleaned' ? 'bg-primary/10 text-primary' : log.event_type === 'restocked' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted'}`}>
                      {log.event_type === 'cleaned' ? '✨ Cleaned' : log.event_type === 'restocked' ? '📦 Restocked' : '📦 Used'}
                    </Badge>
                    <span className="text-muted-foreground">×{log.quantity}</span>
                    {log.notes && <span className="text-muted-foreground truncate max-w-[150px]">{log.notes}</span>}
                  </div>
                  <span className="text-muted-foreground">{format(new Date(log.created_at), 'dd/MM HH:mm')}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Compact tile with expandable detail
const CompactKitTile = ({ kit, getServiceLabels, onUse, onClean, onRestock, onViewLog, onEdit, onDelete }: {
  kit: Kit;
  getServiceLabels: (kit: Kit) => string[];
  onUse: (kit: Kit) => void;
  onClean?: (kit: Kit) => void;
  onRestock?: (kit: Kit) => void;
  onViewLog: (kit: Kit) => void;
  onEdit: (kit: Kit) => void;
  onDelete: (id: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const pct = kit.total_kits > 0 ? (kit.available_kits / kit.total_kits) * 100 : 0;
  const isLow = kit.available_kits <= kit.low_stock_threshold;
  const labels = getServiceLabels(kit);
  const Icon = kit.is_washable ? Sparkles : ShoppingCart;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={cn('border-border', isLow && 'border-destructive/30')}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left">
            <CardContent className="py-2 px-3 flex items-center gap-2">
              <Icon className={cn('h-3.5 w-3.5 shrink-0', isLow ? 'text-destructive' : 'text-muted-foreground')} />
              <span className="text-xs font-medium text-foreground truncate flex-1">{kit.kit_name}</span>
              <span className={cn('text-xs font-mono font-semibold tabular-nums', isLow ? 'text-destructive' : 'text-foreground')}>
                {kit.available_kits}/{kit.total_kits}
              </span>
              {kit.unit_cost > 0 && (
                <span className="text-[10px] text-muted-foreground font-mono">£{kit.unit_cost.toFixed(2)}</span>
              )}
              {open ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
            </CardContent>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', isLow ? 'bg-destructive' : 'bg-emerald-500')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {/* Service badges */}
            <div className="flex flex-wrap gap-1">
              {labels.map((label, i) => (
                <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 h-4">{label}</Badge>
              ))}
              {!kit.is_washable && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-500 border-amber-500/30">Consumable</Badge>
              )}
            </div>
            {kit.unit_cost > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Used {kit.total_kits - kit.available_kits} × £{kit.unit_cost.toFixed(2)} = <span className="font-semibold text-foreground">£{((kit.total_kits - kit.available_kits) * kit.unit_cost).toFixed(2)}</span> spent
              </p>
            )}
            {/* Actions */}
            <div className="flex items-center gap-1 flex-wrap pt-1">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); onUse(kit); }}>
                <Minus className="h-3 w-3 mr-0.5" /> Use
              </Button>
              {kit.is_washable && onClean ? (
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); onClean(kit); }}>
                  <Sparkles className="h-3 w-3 mr-0.5" /> Clean
                </Button>
              ) : !kit.is_washable && onRestock ? (
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); onRestock(kit); }}>
                  <Plus className="h-3 w-3 mr-0.5" /> Restock
                </Button>
              ) : null}
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onViewLog(kit); }}>
                <Package className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(kit); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onDelete(kit.id); }}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default KitInventoryPanel;
