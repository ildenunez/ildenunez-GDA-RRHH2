import React, { useState, useEffect, useMemo } from 'react';
import { User, RequestStatus, LeaveRequest, RequestType } from '../types';
import { store } from '../services/store';
import { 
  Sun, 
  Clock, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Briefcase,
  Umbrella,
  ArrowLeft,
  History,
  Edit2,
  Trash2,
} from 'lucide-react';
import { EnRevisionWidget, MuroAnunciosWidget, EstadoEquipoWidget, EstadoEquipoProximaSemanaWidget } from './DashboardWidgets';

interface DashboardProps {
  user: User;
  onNewRequest: (type: 'absence' | 'overtime') => void;
  onEditRequest: (req: LeaveRequest) => void;
  onViewRequest: (req: LeaveRequest) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user: initialUser, onNewRequest, onEditRequest, onViewRequest }) => {
  const [detailView, setDetailView] = useState<'none' | 'days' | 'hours'>('none');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => { setRefresh(prev => prev + 1); });
    return unsubscribe;
  }, []);

  const currentUser = store.users.find(u => u.id === initialUser.id) || initialUser;
  const requests = store.getMyRequests();
  const news = store.config.news;
  const teamUsers = store.users;

  const [currentDate, setCurrentDate] = useState(new Date());

  const scheduleData = useMemo(() => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      // First day of current month
      const firstDayOfMonth = new Date(year, month, 1);
      // Last day of current month
      const lastDayOfMonth = new Date(year, month + 1, 0);
      
      const startDay = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
      const daysInMonth = lastDayOfMonth.getDate();
      
      // Adjust to start on Monday (0 -> 6, 1 -> 0, 2 -> 1...)
      const paddingDays = startDay === 0 ? 6 : startDay - 1;
      
      const days = [];
      const today = new Date();
      
      // Padding from prev month
      const prevMonthLastDay = new Date(year, month, 0).getDate();
      for (let i = paddingDays - 1; i >= 0; i--) {
          days.push({
              dayNumber: prevMonthLastDay - i,
              isCurrentMonth: false,
              dateStr: ''
          });
      }
      
      for (let i = 1; i <= daysInMonth; i++) {
          const d = new Date(year, month, i);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const assignment = store.config.shiftAssignments.find(a => a.userId === currentUser.id && a.date === dateStr);
          const shift = assignment ? store.config.shiftTypes.find(s => s.id === assignment.shiftTypeId) : null;
          const holiday = store.config.holidays.find(h => h.date === dateStr);
          const activeRequest = store.requests.find(r => { 
                const s = r.startDate.split('T')[0]; 
                const e = (r.endDate || r.startDate).split('T')[0]; 
                return r.userId === currentUser.id && dateStr >= s && dateStr <= e && !store.isOvertimeRequest(r.typeId) && r.status === RequestStatus.APPROVED;
          });

          days.push({
              dateStr,
              dayNumber: i,
              isCurrentMonth: true,
              isToday: d.toDateString() === today.toDateString(),
              shift,
              holiday,
              activeRequest,
              dayLabel: d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()
          });
      }
      
      // Padding for next month to complete 42 cells (6 rows)
      const remaining = 42 - days.length;
      for (let i = 1; i <= remaining; i++) {
          days.push({
              dayNumber: i,
              isCurrentMonth: false,
              dateStr: ''
          });
      }
      
      return days;
  }, [currentUser.id, refresh, currentDate]);

  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const stats = [
    { id: 'days', label: 'VACACIONES', value: (currentUser.daysAvailable ?? 0).toFixed(1), unit: 'días', icon: Umbrella, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'hours', label: 'HORAS EXTRA', value: (currentUser.overtimeHours ?? 0).toFixed(1), unit: 'h', icon: Briefcase, color: 'text-brand-600', bg: 'bg-indigo-50' },
  ];

  if (detailView !== 'none') {
    const isOvertimeView = detailView === 'hours';
    const title = isOvertimeView ? 'Horas Extra' : 'Ausencias';
    const filteredRequests = requests.filter(r => isOvertimeView ? store.isOvertimeRequest(r.typeId) : !store.isOvertimeRequest(r.typeId));
    return (
        <div className="space-y-6 animate-fade-in xl:space-y-4">
            <div className="flex items-center gap-4">
                <button onClick={() => setDetailView('none')} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><ArrowLeft /></button>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
            </div>
            <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-card border border-slate-100">
                <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Saldo Actual</p>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter">{isOvertimeView ? `${(currentUser.overtimeHours ?? 0).toFixed(1)}h` : `${(currentUser.daysAvailable ?? 0).toFixed(1)}d`}</p>
                </div>
                <button onClick={() => onNewRequest(isOvertimeView ? 'overtime' : 'absence')} className="bg-[#6366F1] text-white px-6 py-3.5 rounded-2xl hover:bg-brand-600 shadow-xl shadow-brand/20 font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-2"><Plus size={18} /> Nueva Solicitud</button>
            </div>
            <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                    <History size={18} className="text-slate-400"/>
                    <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest">Historial Reciente</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#F8FAFC] text-slate-400">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Tipo</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Fecha</th>
                                {isOvertimeView && <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Horas</th>}
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Estado</th>
                                <th className="px-8 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredRequests.map(req => (
                                <tr key={req.id} onClick={() => onViewRequest(req)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                                    <td className="px-8 py-5 font-bold text-slate-700">{req.label || store.getTypeLabel(req.typeId)}</td>
                                    <td className="px-8 py-5 text-slate-500 font-medium">{(req.typeId as string).includes('ajuste') ? 'Manual' : new Date(req.startDate).toLocaleDateString()}</td>
                                    {isOvertimeView && <td className={`px-8 py-5 font-black ${(req.hours||0) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{(req.hours||0) > 0 ? '+' : ''}{req.hours}h</td>}
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${req.status === RequestStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : req.status === RequestStatus.REJECTED ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                                        {req.status === RequestStatus.PENDING && (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => onEditRequest(req)} className="text-brand-500 hover:bg-brand-50 p-2 rounded-xl transition-colors"><Edit2 size={16}/></button>
                                                <button onClick={() => { if(confirm('¿Eliminar?')) store.deleteRequest(req.id, true); }} className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors"><Trash2 size={16}/></button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fade-in">
      {/* Left Content Area */}
      <div className="lg:col-span-8 space-y-10">
        <div className="flex justify-between items-center mb-2">
           <div className="space-y-1">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Hola, {currentUser.name.split(' ')[0]}</h2>
              <p className="text-sm font-medium text-slate-400">Bienvenido de nuevo. Aquí tienes un resumen de tu actividad para hoy.</p>
           </div>
           <button onClick={() => onNewRequest('absence')} className="bg-[#6366F1] text-white px-8 py-4 rounded-3xl shadow-2xl shadow-brand/20 font-black text-[12px] uppercase tracking-widest flex items-center gap-3 hover:bg-brand-600 transition-all hover:scale-105 active:scale-95">
             <Plus size={20} strokeWidth={3} /> Nueva Solicitud
           </button>
        </div>

        {/* HORARIO Card */}
        <div className="bg-white p-5 rounded-3xl shadow-card border border-slate-100 overflow-hidden">
           <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl"><Clock size={14}/></div>
                <div>
                   <h3 className="text-[10px] font-black text-slate-800 tracking-widest uppercase italic">Mi Horario</h3>
                   <p className="text-[9px] font-bold text-slate-400 leading-tight">{monthName}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => changeMonth(-1)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-all"><ChevronLeft size={16}/></button>
                <button onClick={() => changeMonth(1)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-all"><ChevronRight size={16}/></button>
              </div>
           </div>

           <div className="grid grid-cols-7 gap-1">
             {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                <div key={day} className="text-center text-[8px] font-black text-slate-900 uppercase py-1">{day}</div>
             ))}
             {scheduleData.map((d, idx) => {
                const shiftColor = d.shift?.color || '#F8FAFC';
                const hasShift = !!d.shift && d.isCurrentMonth && !d.holiday && !d.activeRequest;
                
                return (
                  <div key={idx} className={`flex flex-col items-center justify-center p-0.5`}>
                    <div 
                      title={d.shift?.name || d.holiday?.name || d.activeRequest?.label}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex flex-col items-center justify-center relative transition-all border-2 ${!d.isCurrentMonth ? 'opacity-20 border-transparent' : d.isToday ? 'border-brand-500 shadow-lg shadow-brand/10' : 'border-transparent hover:border-slate-200'}`}
                      style={{ 
                        backgroundColor: hasShift ? `${shiftColor}20` : (d.isToday ? 'white' : undefined),
                        borderColor: hasShift ? shiftColor : (d.isToday ? undefined : 'transparent')
                      }}
                    >
                      <span className={`text-[11px] font-black ${d.isToday ? 'text-brand-600' : 'text-slate-700'}`} style={hasShift ? { color: shiftColor } : {}}>{d.dayNumber}</span>
                      {d.isCurrentMonth && (
                        <div className="absolute bottom-0.5 flex gap-0.5">
                          {d.holiday && <div className="w-1 h-1 rounded-full bg-rose-500 shadow-sm" />}
                          {d.activeRequest && <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-sm" />}
                        </div>
                      )}
                    </div>
                  </div>
                );
             })}
           </div>

           {/* Leyenda de Horarios/Turnos */}
           <div className="mt-4 pt-4 border-t border-slate-50 flex flex-wrap gap-2">
              {(() => {
                const assignedShiftIds = new Set(scheduleData.map(d => d.shift?.id).filter(Boolean));
                return store.config.shiftTypes
                  .filter(s => assignedShiftIds.has(s.id))
                  .map(s => (
                    <div key={s.id} className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      <div className="w-2 h-2 rounded-sm shadow-sm" style={{ backgroundColor: s.color }} />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">{s.name}</span>
                    </div>
                  ));
              })()}
              {scheduleData.some(d => d.holiday) && (
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    <div className="w-2 h-2 rounded-sm bg-rose-500 shadow-sm" />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Festivo</span>
                </div>
              )}
              {scheduleData.some(d => d.activeRequest) && (
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    <div className="w-2 h-2 rounded-sm bg-emerald-500 shadow-sm" />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Ausencia</span>
                </div>
              )}
           </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
           {stats.map(stat => (
              <div key={stat.id} onClick={() => setDetailView(stat.id as any)} className="bg-white p-8 rounded-[2.5rem] shadow-card border border-slate-100 flex items-center gap-6 cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all group">
                <div className={`w-16 h-16 rounded-3xl ${stat.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <stat.icon className={`w-7 h-7 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter">
                    {stat.value} <span className="text-sm text-slate-400 font-bold tracking-tight">{stat.unit}</span>
                  </p>
                </div>
              </div>
           ))}
        </div>
      </div>

      {/* Right Sidebar Widgets */}
      <div className="lg:col-span-4 space-y-8">
        <EnRevisionWidget count={requests.filter(r => r.status === RequestStatus.PENDING).length} />
        <MuroAnunciosWidget news={news} />
        <EstadoEquipoWidget users={teamUsers} />
        <EstadoEquipoProximaSemanaWidget users={teamUsers} />
      </div>
    </div>
  );
};

export default Dashboard;