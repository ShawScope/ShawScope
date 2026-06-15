import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Search, User, CalendarDays, Repeat, CheckCircle, Circle, Loader2, Package, AlertTriangle } from 'lucide-react';
import KitInventoryPanel from './KitInventoryPanel';
import { format, isPast, isToday, addDays, addWeeks, addMonths } from 'date-fns';

interface Todo {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  due_date: string | null;
  patient_id: string | null;
  patient_name: string | null;
  patient_email: string | null;
  appointment_id: string | null;
  is_recurring: boolean;
  recurrence_interval: string | null;
  recurrence_end_date: string | null;
  next_due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  todo_category: string;
}

interface Patient {
  id: string;
  client_name: string;
  client_email: string;
}

interface TodoTabProps {
  onOpenPatient?: (email: string) => void;
  onOverdueCountChange?: (count: number) => void;
}

const priorityLabels: Record<number, { label: string; color: string }> = {
  3: { label: 'Urgent', color: 'bg-destructive/20 text-destructive border-destructive/30' },
  2: { label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  1: { label: 'Medium', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  0: { label: 'Low', color: 'bg-muted text-muted-foreground border-muted' },
};

const TODO_CATEGORIES = [
  { value: 'admin', label: 'Admin', icon: '📋' },
  { value: 'patient', label: 'Patient', icon: '👤' },
  { value: 'kit', label: 'Kit / Inventory', icon: '📦' },
];

const TodoTab = ({ onOpenPatient, onOverdueCountChange }: TodoTabProps) => {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockItems, setLowStockItems] = useState<{ kit_name: string; available_kits: number; is_washable: boolean }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(1);
  const [dueDate, setDueDate] = useState('');
  const [todoCategory, setTodoCategory] = useState('admin');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState('weekly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('admin_todos' as any)
      .select('*')
      .order('completed', { ascending: true })
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false });
    setTodos((data || []).map((t: any) => ({ ...t, todo_category: t.todo_category || 'admin' })) as Todo[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  // Notify parent of overdue count changes
  const overdueTodos = todos.filter(t => !t.completed && t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const hasWarnings = overdueTodos.length > 0 || lowStockItems.length > 0;
  useEffect(() => {
    onOverdueCountChange?.(overdueTodos.length + lowStockItems.length);
  }, [overdueTodos.length, lowStockItems.length, onOverdueCountChange]);

  const searchPatients = async (q: string) => {
    if (q.length < 2) { setPatientResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from('patients')
      .select('id, client_name, client_email')
      .or(`client_name.ilike.%${q}%,client_email.ilike.%${q}%`)
      .limit(8);
    setPatientResults((data || []) as Patient[]);
    setSearching(false);
  };

  const openNew = () => {
    setEditing(null);
    setTitle(''); setDescription(''); setPriority(1); setDueDate('');
    setTodoCategory('admin');
    setIsRecurring(false); setRecurrenceInterval('weekly'); setRecurrenceEndDate('');
    setSelectedPatient(null); setPatientSearch(''); setPatientResults([]);
    setDialogOpen(true);
  };

  const openEdit = (todo: Todo) => {
    setEditing(todo);
    setTitle(todo.title);
    setDescription(todo.description || '');
    setPriority(todo.priority);
    setDueDate(todo.due_date || '');
    setTodoCategory(todo.todo_category || 'admin');
    setIsRecurring(todo.is_recurring);
    setRecurrenceInterval(todo.recurrence_interval || 'weekly');
    setRecurrenceEndDate(todo.recurrence_end_date || '');
    setSelectedPatient(todo.patient_id ? { id: todo.patient_id, client_name: todo.patient_name || '', client_email: todo.patient_email || '' } : null);
    setPatientSearch(''); setPatientResults([]);
    setDialogOpen(true);
  };

  const saveTodo = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    const payload: any = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
      todo_category: todoCategory,
      patient_id: selectedPatient?.id || null,
      patient_name: selectedPatient?.client_name || null,
      patient_email: selectedPatient?.client_email || null,
      is_recurring: isRecurring,
      recurrence_interval: isRecurring ? recurrenceInterval : null,
      recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate : null,
      next_due_date: isRecurring && dueDate ? dueDate : null,
      created_by: user?.id || null,
    };

    if (editing) {
      const { error } = await supabase.from('admin_todos' as any).update(payload).eq('id', editing.id);
      if (error) { toast.error('Failed to update'); setSaving(false); return; }
      toast.success('Todo updated');
    } else {
      const { error } = await supabase.from('admin_todos' as any).insert(payload);
      if (error) { toast.error('Failed to create'); setSaving(false); return; }
      toast.success('Todo created');
    }
    setSaving(false);
    setDialogOpen(false);
    fetchTodos();
  };

  const toggleComplete = async (todo: Todo) => {
    const nowCompleted = !todo.completed;
    if (todo.is_recurring && nowCompleted && todo.next_due_date) {
      const nextFn = todo.recurrence_interval === 'daily' ? addDays : todo.recurrence_interval === 'monthly' ? addMonths : addWeeks;
      const nextDate = nextFn(new Date(todo.next_due_date), 1);
      const nextDateStr = format(nextDate, 'yyyy-MM-dd');
      if (todo.recurrence_end_date && nextDateStr > todo.recurrence_end_date) {
        await supabase.from('admin_todos' as any).update({ completed: true, completed_at: new Date().toISOString() } as any).eq('id', todo.id);
      } else {
        await supabase.from('admin_todos' as any).update({ completed: false, due_date: nextDateStr, next_due_date: nextDateStr } as any).eq('id', todo.id);
        toast.success(`Recurring: next due ${format(nextDate, 'dd/MM/yyyy')}`);
      }
    } else {
      await supabase.from('admin_todos' as any).update({ completed: nowCompleted, completed_at: nowCompleted ? new Date().toISOString() : null } as any).eq('id', todo.id);
    }
    fetchTodos();
  };

  const deleteTodo = async (id: string) => {
    await supabase.from('admin_todos' as any).delete().eq('id', id);
    toast.success('Todo deleted');
    fetchTodos();
  };

  const filteredTodos = todos.filter(t => {
    if (activeCategory !== 'all' && t.todo_category !== activeCategory) return false;
    return showCompleted ? t.completed : !t.completed;
  });

  const categoryCounts = TODO_CATEGORIES.map(c => ({
    ...c,
    count: todos.filter(t => !t.completed && t.todo_category === c.value).length,
  }));

  const getDueStatus = (dueDate: string | null) => {
    if (!dueDate) return null;
    const d = new Date(dueDate);
    if (isToday(d)) return 'today';
    if (isPast(d)) return 'overdue';
    return 'upcoming';
  };

  return (
    <div className="space-y-6">
      {/* Warnings Banner */}
      {hasWarnings && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
              <span className="font-semibold text-destructive text-sm">
                Action Required
              </span>
            </div>
            <div className="space-y-1.5">
              {overdueTodos.map(todo => (
                <div key={todo.id} className="flex items-center justify-between gap-2 rounded-md border border-destructive/20 bg-background/50 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{todo.title}</span>
                    <span className="text-[11px] text-destructive ml-2">
                      Due {format(new Date(todo.due_date!), 'dd/MM/yyyy')}
                    </span>
                    {todo.patient_name && (
                      <span className="text-[11px] text-muted-foreground ml-2">• {todo.patient_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(todo)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => toggleComplete(todo)}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Done
                    </Button>
                  </div>
                </div>
              ))}
              {lowStockItems.map(item => (
                <div key={item.kit_name} className="flex items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-background/50 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <Package className="h-3.5 w-3.5 inline mr-1.5 text-amber-400" />
                    <span className="text-sm font-medium">{item.kit_name}</span>
                    <span className="text-[11px] text-amber-400 ml-2">
                      {item.available_kits} remaining
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                    {item.is_washable ? 'Needs cleaning' : 'Reorder'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kit Inventory Section */}
      <KitInventoryPanel onLowStockChange={setLowStockItems} />

      <div className="border-t pt-4" />

      <div className="text-center mb-4">
        <h2 className="font-serif text-2xl font-bold text-foreground">Todo List</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage tasks, deadlines, and recurring items</p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant={activeCategory === 'all' ? 'default' : 'outline'} onClick={() => setActiveCategory('all')} className="text-xs h-7">
          All ({todos.filter(t => !t.completed).length})
        </Button>
        {categoryCounts.map(c => (
          <Button key={c.value} size="sm" variant={activeCategory === c.value ? 'default' : 'outline'} onClick={() => setActiveCategory(c.value)} className="text-xs h-7">
            {c.icon} {c.label} ({c.count})
          </Button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button size="sm" variant={!showCompleted ? 'default' : 'outline'} onClick={() => setShowCompleted(false)}>
            Active
          </Button>
          <Button size="sm" variant={showCompleted ? 'default' : 'outline'} onClick={() => setShowCompleted(true)}>
            Completed
          </Button>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> New Todo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filteredTodos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {showCompleted ? 'No completed todos.' : 'No active todos in this category.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTodos.map(todo => {
            const dueStatus = getDueStatus(todo.due_date);
            const catInfo = TODO_CATEGORIES.find(c => c.value === todo.todo_category);
            return (
              <Card key={todo.id} className={`transition-all ${todo.completed ? 'opacity-60' : ''}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleComplete(todo)} className="mt-0.5 shrink-0">
                      {todo.completed
                        ? <CheckCircle className="h-5 w-5 text-emerald-500" />
                        : <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium text-sm ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {todo.title}
                        </span>
                        <Badge variant="outline" className={`text-[10px] ${priorityLabels[todo.priority]?.color || ''}`}>
                          {priorityLabels[todo.priority]?.label || 'Low'}
                        </Badge>
                        {catInfo && (
                          <Badge variant="outline" className="text-[10px] bg-muted/50">
                            {catInfo.icon} {catInfo.label}
                          </Badge>
                        )}
                        {todo.is_recurring && (
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                            <Repeat className="h-2.5 w-2.5 mr-0.5" /> {todo.recurrence_interval}
                          </Badge>
                        )}
                      </div>
                      {todo.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{todo.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {todo.due_date && (
                          <span className={`text-[11px] flex items-center gap-1 ${
                            dueStatus === 'overdue' ? 'text-destructive font-semibold' :
                            dueStatus === 'today' ? 'text-amber-400 font-semibold' : 'text-muted-foreground'
                          }`}>
                            <CalendarDays className="h-3 w-3" />
                            {dueStatus === 'overdue' && 'OVERDUE: '}
                            {dueStatus === 'today' && 'TODAY: '}
                            {format(new Date(todo.due_date), 'dd/MM/yyyy')}
                          </span>
                        )}
                        {todo.patient_name && (
                          <button
                            onClick={() => todo.patient_email && onOpenPatient?.(todo.patient_email)}
                            className="text-[11px] flex items-center gap-1 text-primary hover:underline"
                          >
                            <User className="h-3 w-3" /> {todo.patient_name}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(todo)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteTodo(todo.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editing ? 'Edit Todo' : 'New Todo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Additional details..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={String(priority)} onValueChange={v => setPriority(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">🔴 Urgent</SelectItem>
                    <SelectItem value="2">🟠 High</SelectItem>
                    <SelectItem value="1">🟡 Medium</SelectItem>
                    <SelectItem value="0">⚪ Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={todoCategory} onValueChange={setTodoCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TODO_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>

            {/* Recurring */}
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                <Label className="flex items-center gap-1"><Repeat className="h-3.5 w-3.5" /> Recurring</Label>
              </div>
              {isRecurring && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Repeat Every</Label>
                    <Select value={recurrenceInterval} onValueChange={setRecurrenceInterval}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Day</SelectItem>
                        <SelectItem value="weekly">Week</SelectItem>
                        <SelectItem value="monthly">Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End Date (optional)</Label>
                    <Input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} className="h-8" />
                  </div>
                </div>
              )}
            </div>

            {/* Patient Link */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Link to Patient (optional)</Label>
              {selectedPatient ? (
                <div className="flex items-center justify-between rounded-lg border p-2 bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{selectedPatient.client_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedPatient.client_email}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedPatient(null)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search patient..."
                      value={patientSearch}
                      onChange={e => { setPatientSearch(e.target.value); searchPatients(e.target.value); }}
                    />
                    {searching && <Loader2 className="h-4 w-4 animate-spin mt-3" />}
                  </div>
                  {patientResults.length > 0 && (
                    <div className="border rounded-md max-h-40 overflow-y-auto">
                      {patientResults.map(p => (
                        <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientResults([]); setPatientSearch(''); }}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-0">
                          <p className="text-sm font-medium">{p.client_name}</p>
                          <p className="text-xs text-muted-foreground">{p.client_email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <Button onClick={saveTodo} className="w-full" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? 'Update' : 'Create'} Todo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TodoTab;
