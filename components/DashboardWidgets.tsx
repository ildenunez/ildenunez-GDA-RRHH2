import React from 'react';
import { User, RequestStatus, NewsPost, Role } from '../types';
import { store } from '../services/store';
import { Megaphone, Users, Clock, ChevronRight, CalendarClock } from 'lucide-react';

export const EnRevisionWidget: React.FC<{ count: number }> = ({ count }) => (
  <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-card flex items-center justify-between border-l-4 border-l-brand-600">
    <div className="flex flex-col">
      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Mis Solicitudes pendientes</h3>
      <p className="text-[10px] text-slate-400 font-medium leading-tight max-w-[120px]">Solicitudes pendientes de aprobación</p>
    </div>
    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
      <span className="text-sm font-black text-slate-800">{count}</span>
    </div>
  </div>
);

export const MuroAnunciosWidget: React.FC<{ news: NewsPost[] }> = ({ news }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card">
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 tracking-widest uppercase">
        <Megaphone size={14} className="text-orange-500" />
        Muro de Anuncios
      </h3>
      <button className="text-[10px] font-black text-brand-600 hover:text-brand-700">Ver todo</button>
    </div>
    <div className="space-y-4">
      {news.slice(0, 2).map(post => (
        <div key={post.id} className="group cursor-pointer">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${post.title.includes('HORARIO') ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              {post.title.includes('HORARIO') ? 'IMPORTANTE' : 'SOCIAL'}
            </span>
            <span className="text-[8px] text-slate-400 font-bold uppercase">{new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
          <h4 className="text-[11px] font-black text-slate-800 group-hover:text-brand-600 transition-colors uppercase truncate">{post.title}</h4>
          <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">{post.content}</p>
        </div>
      ))}
    </div>
  </div>
);

export const EstadoEquipoWidget: React.FC<{ users: User[] }> = ({ users }) => {
  const me = store.currentUser;
  const todayStr = new Date().toISOString().split('T')[0];
  
  const teammatesOnAbsence = React.useMemo(() => {
    if (!me) return [];
    
    // Admin sees everyone, others see their department
    const isAdmin = me.role === Role.ADMIN;
    const targets = users.filter(u => u.id !== me.id && (isAdmin || u.departmentId === me.departmentId));
    
    return targets.map(u => {
      const todayRequest = store.requests.find(r => {
        const start = r.startDate.split('T')[0];
        const end = (r.endDate || r.startDate).split('T')[0];
        return r.userId === u.id && 
               r.status === RequestStatus.APPROVED && 
               todayStr >= start && todayStr <= end &&
               !store.isOvertimeRequest(r.typeId);
      });
      
      if (!todayRequest) return null;
      
      return {
        ...u,
        absenceLabel: store.getTypeLabel(todayRequest.typeId).toUpperCase()
      };
    }).filter(Boolean).slice(0, 5) as any[];
  }, [users, me, store.requests]);

  if (teammatesOnAbsence.length === 0) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Users size={14} className="text-brand-600" />
          <h3 className="text-xs font-black text-slate-800 tracking-widest uppercase">Estado Equipo</h3>
        </div>
        <p className="text-[10px] text-slate-400 font-medium italic text-center py-4">Todo el equipo está activo hoy.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card">
      <div className="flex items-center gap-2 mb-6">
        <Users size={14} className="text-brand-600" />
        <h3 className="text-xs font-black text-slate-800 tracking-widest uppercase">Estado Equipo</h3>
      </div>
      <div className="space-y-4">
        {teammatesOnAbsence.map(u => (
          <div key={u.id} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-slate-100" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-rose-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-700">{u.name}</span>
                {me?.role === Role.ADMIN && (
                   <span className="text-[8px] text-slate-400 font-bold uppercase">{store.departments.find(d => d.id === u.departmentId)?.name}</span>
                )}
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[8px] font-black uppercase tracking-tighter">
              {u.absenceLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const EstadoEquipoProximaSemanaWidget: React.FC<{ users: User[] }> = ({ users }) => {
  const me = store.currentUser;
  const today = new Date();
  const nextWeekStart = new Date(today);
  nextWeekStart.setDate(today.getDate() + 1);
  const nextWeekEnd = new Date(today);
  nextWeekEnd.setDate(today.getDate() + 8);
  
  const teammatesOnAbsence = React.useMemo(() => {
    if (!me) return [];
    
    // Admin sees everyone, others see their department
    const isAdmin = me.role === Role.ADMIN;
    const targets = users.filter(u => u.id !== me.id && (isAdmin || u.departmentId === me.departmentId));
    
    const results = [];
    for (const u of targets) {
      const upcomingRequest = store.requests.find(r => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate || r.startDate);
        return r.userId === u.id && 
               r.status === RequestStatus.APPROVED && 
               !store.isOvertimeRequest(r.typeId) &&
               ((start >= nextWeekStart && start <= nextWeekEnd) || 
                (end >= nextWeekStart && end <= nextWeekEnd) ||
                (start <= nextWeekStart && end >= nextWeekEnd));
      });
      
      if (upcomingRequest) {
        results.push({
          ...u,
          absenceLabel: store.getTypeLabel(upcomingRequest.typeId).toUpperCase(),
          startDate: new Date(upcomingRequest.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          endDate: new Date(upcomingRequest.endDate || upcomingRequest.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
        });
      }
    }
    return results.slice(0, 5);
  }, [users, me, store.requests]);

  if (teammatesOnAbsence.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card">
      <div className="flex items-center gap-2 mb-6">
        <CalendarClock size={14} className="text-brand-600" />
        <h3 className="text-xs font-black text-slate-800 tracking-widest uppercase">Próxima Semana</h3>
      </div>
      <div className="space-y-4">
        {teammatesOnAbsence.map(u => (
          <div key={u.id} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-slate-100" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-700">{u.name}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter leading-tight">
                  {me?.role === Role.ADMIN ? store.departments.find(d => d.id === u.departmentId)?.name : `Del ${u.startDate} al ${u.endDate}`}
                </span>
                {me?.role === Role.ADMIN && <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Del {u.startDate} al {u.endDate}</span>}
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-500 text-[8px] font-black uppercase tracking-tighter border border-slate-100">
              {u.absenceLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
