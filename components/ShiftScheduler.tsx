import React, { useState, useMemo, useEffect } from 'react';
import { User, RequestStatus, RequestType } from '../types';
import { store } from '../services/store';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Filter,
  Loader2,
  Calendar,
  RefreshCcw,
  Save,
  Eraser,
  AlertCircle
} from 'lucide-react';

interface ShiftSchedulerProps {
  users: User[];
}

const ShiftScheduler: React.FC<ShiftSchedulerProps> = ({ users: allUsers }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShiftId, setSelectedShiftId] = useState<string | 'eraser'>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savingMonth, setSavingMonth] = useState<string | null>(null);
  const [stagedChanges, setStagedChanges] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    return store.subscribe(() => setTick(t => t + 1));
  }, []);

  const monthsData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return [0, 1, 2].map(offset => {
      const first = new Date(year, month + offset, 1);
      const mIdx = first.getMonth();
      const mYear = first.getFullYear();
      const daysInM = new Date(mYear, mIdx + 1, 0).getDate();
      const days = [];
      for (let d = 1; d <= daysInM; d++) {
        const dObj = new Date(mYear, mIdx, d);
        days.push({
          dateStr: `${mYear}-${String(mIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          day: d,
          isWeekend: [0, 6].includes(dObj.getDay()),
          weekday: dObj.toLocaleDateString('es-ES', { weekday: 'short' }).charAt(0).toUpperCase()
        });
      }
      return {
        monthName: first.toLocaleString('es-ES', { month: 'long', year: 'numeric' }),
        monthKey: `${mYear}-${String(mIdx + 1).padStart(2, '0')}`,
        days
      };
    });
  }, [currentDate]);

  const filteredUsers = useMemo(() => {
    let list = [...allUsers];
    if (selectedDept) list = list.filter(u => u.departmentId === selectedDept);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers, selectedDept]);

  const getEffectiveShiftId = (userId: string, dateStr: string): string => {
    const key = `${userId}|${dateStr}`;
    if (key in stagedChanges) return stagedChanges[key];
    return store.config.shiftAssignments.find(a => a.userId === userId && a.date === dateStr)?.shiftTypeId || '';
  };

  const getOverlayForDate = (userId: string, dateStr: string) => {
    // Buscar todas las solicitudes que coincidan con el usuario y la fecha, omitiendo ajustes
    const userReqs = store.requests.filter(r => {
        if (String(r.userId).trim() !== String(userId).trim()) return false;
        
        const status = (r.status || '').toUpperCase();
        if (status !== 'APROBADO' && status !== 'PENDIENTE') return false;
        
        if (r.typeId === RequestType.ADJUSTMENT_DAYS || r.typeId === RequestType.ADJUSTMENT_OVERTIME) return false;
        
        // Normalizar fechas para comparación (YYYY-MM-DD)
        const start = (r.startDate || '').split('T')[0].trim();
        const end = (r.endDate || r.startDate || '').split('T')[0].trim();
        
        return dateStr >= start && dateStr <= end;
    });

    if (userReqs.length === 0) return null;

    // Priorizar: 1. Aprobadas, 2. Pendientes
    const req = userReqs.find(r => (r.status || '').toUpperCase() === 'APROBADO') || userReqs[0];

    if ((req.status || '').toUpperCase() === 'PENDIENTE') return 'PTE';

    const typeObj = store.config.leaveTypes.find(t => t.id === req.typeId);
    const lbl = (req.label || (typeObj ? typeObj.label : '')).toLowerCase();
    
    if (lbl.includes('vac') || lbl.includes('inviern') || lbl.includes('veran')) return 'VAC';
    if (lbl.includes('asunto') || lbl.includes('libre')) return 'DL';
    if (lbl.includes('baja') || lbl.includes('médic') || lbl.includes('medic') || lbl.includes('enferm')) return 'BAJA';
    if (lbl.includes('consu') || lbl.includes('canj')) return 'CdH';
    
    if (req.typeId === RequestType.VACATION) return 'VAC';
    if (req.typeId === RequestType.SICKNESS) return 'BAJA';
    if (req.typeId === RequestType.PERSONAL) return 'DL';
    if (req.typeId === RequestType.OVERTIME_SPEND_DAYS) return 'CdH';

    return lbl.trim() ? lbl.trim().substring(0, 3).toUpperCase() : '*';
  };

  const handleCellClick = (userId: string, dateStr: string) => {
    if (!selectedShiftId || savingMonth) return;
    const typeId = selectedShiftId === 'eraser' ? '' : selectedShiftId;
    const key = `${userId}|${dateStr}`;
    if (getEffectiveShiftId(userId, dateStr) === typeId) return;
    setStagedChanges(prev => ({ ...prev, [key]: typeId }));
  };

  const handleMouseDown = (userId: string, dateStr: string) => {
    if (!selectedShiftId || savingMonth) return;
    setIsDragging(true);
    handleCellClick(userId, dateStr);
  };

  const handleMouseEnter = (userId: string, dateStr: string) => {
    if (isDragging) {
      handleCellClick(userId, dateStr);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleSaveMonth = async (monthKey: string, days: { dateStr: string }[]) => {
    const dayStrings = days.map(d => d.dateStr);
    const monthChanges = Object.entries(stagedChanges)
      .filter(([key]) => dayStrings.includes(key.split('|')[1]))
      .map(([key, shiftId]) => ({
        userId: key.split('|')[0],
        date: key.split('|')[1],
        shiftTypeId: shiftId as string
      }));

    if (monthChanges.length === 0) return;

    setSavingMonth(monthKey);
    try {
      await store.assignShiftsBatch(monthChanges);
      setStagedChanges(prev => {
        const next = { ...prev };
        monthChanges.forEach(c => delete next[`${c.userId}|${c.date}`]);
        return next;
      });
    } catch (err: any) {
      console.error("ShiftScheduler Save Error:", err);
      alert(`Error al sincronizar: ${err.message || JSON.stringify(err)}`);
    } finally {
      setSavingMonth(null);
    }
  };

  return (
    <div className="flex flex-col h-[800px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
      <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 z-50">
        <div className="flex items-center gap-4">
          <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600"><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600"><ChevronRight size={20} /></button>
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
            Planificación Plantilla
            <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full text-[9px] font-black">{store.requests.length} REQS</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <select className="pl-4 pr-10 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
            <option value="">Filtrar Departamento</option>
            {store.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button onClick={async () => { setIsRefreshing(true); await store.refresh(); setIsRefreshing(false); }} className="p-2 text-slate-500 hover:text-blue-600 bg-white border border-slate-200 rounded-xl">
            {isRefreshing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
          </button>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <button onClick={() => setSelectedShiftId('eraser')} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedShiftId === 'eraser' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-400'}`}><Eraser size={14} /> Borrador</button>
          <div className="w-px h-6 bg-slate-100 mx-1"></div>
          {store.config.shiftTypes.map(s => (
            <button key={s.id} onClick={() => setSelectedShiftId(s.id)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedShiftId === s.id ? 'ring-2 ring-offset-2' : 'hover:opacity-80'}`} style={{ backgroundColor: selectedShiftId === s.id ? s.color : 'white', color: selectedShiftId === s.id ? 'white' : s.color, borderColor: s.color }}>{s.name}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-12 bg-slate-100/50">
        {monthsData.map(m => {
          const hasChanges = Object.keys(stagedChanges).some(key => m.days.map(d => d.dateStr).includes(key.split('|')[1]));
          return (
            <div key={m.monthKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
              {savingMonth === m.monthKey && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                  <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                  <p className="text-xs font-black uppercase text-blue-600 tracking-widest">Sincronizando mes...</p>
                </div>
              )}
              <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Calendar size={14} className="text-blue-400" /> {m.monthName}</h3>
                {hasChanges && (
                  <button onClick={() => handleSaveMonth(m.monthKey, m.days)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 shadow-lg animate-pulse">
                    <Save size={12} /> Guardar Mes
                  </button>
                )}
              </div>
              <div className="overflow-x-auto no-scrollbar">
                <div className="inline-block min-w-full">
                  <div className="grid" style={{ gridTemplateColumns: `180px repeat(${m.days.length}, 36px)` }}>
                    <div className="sticky left-0 z-30 bg-slate-50 border-b border-r border-slate-200 p-2 h-12 flex items-center text-[10px] font-black text-slate-500 uppercase">Empleado</div>
                    {m.days.map(d => {
                      const isHoliday = store.config.holidays.some(h => h.date === d.dateStr);
                      return (
                        <div key={d.dateStr} className={`border-b border-r border-slate-200 flex flex-col items-center justify-center h-12 ${isHoliday ? 'bg-red-50 text-red-600' : d.isWeekend ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-500'}`}>
                          <span className="text-[11px] font-black">{d.day}</span>
                          <span className="text-[8px] font-bold uppercase opacity-50">{d.weekday}</span>
                        </div>
                      );
                    })}
                    {filteredUsers.map(user => (
                      <React.Fragment key={user.id}>
                        <div className="sticky left-0 z-20 bg-white border-b border-r border-slate-200 px-4 flex items-center gap-3 h-10 shadow-sm">
                          <img src={user.avatar} className="w-6 h-6 rounded-full border border-slate-100 object-cover" />
                          <span className="text-[11px] font-black text-slate-800 truncate uppercase tracking-tighter">{user.name}</span>
                        </div>
                        {m.days.map(d => {
                          const shiftId = getEffectiveShiftId(user.id, d.dateStr);
                          const shift = store.config.shiftTypes.find(s => s.id === shiftId);
                          const isStaged = `${user.id}|${d.dateStr}` in stagedChanges;
                          const overlayTxt = getOverlayForDate(user.id, d.dateStr);
                          const isHoliday = store.config.holidays.some(h => h.date === d.dateStr);
                          
                          return (
                            <div 
                              key={d.dateStr} 
                              onMouseDown={() => handleMouseDown(user.id, d.dateStr)}
                              onMouseEnter={() => handleMouseEnter(user.id, d.dateStr)}
                              className={`border-b border-r border-slate-100 h-10 flex items-center justify-center cursor-pointer hover:bg-black/5 relative select-none ${isStaged ? 'ring-2 ring-inset ring-blue-500 z-10' : ''} ${!shift && !overlayTxt && isHoliday ? 'bg-red-50/50' : ''}`} 
                              style={{ backgroundColor: shift?.color || undefined }}
                            >
                              {isStaged && <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-bl-full border-b border-l border-white shadow-sm z-20"></div>}
                              {overlayTxt && (
                                <div className="absolute inset-x-0 inset-y-1 mx-1 flex items-center justify-center bg-black/60 rounded-md shadow-sm backdrop-blur-[1px] pointer-events-none">
                                  <span className="text-[9px] font-black text-white tracking-widest">{overlayTxt}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-white border-t border-slate-200 p-4 flex justify-center gap-6 text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">
        <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
          <AlertCircle size={12} /> Marca los turnos y pulsa "Guardar Mes" para confirmar en la base de datos
        </div>
      </div>
    </div>
  );
};

export default ShiftScheduler;