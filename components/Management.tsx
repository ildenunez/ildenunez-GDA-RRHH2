import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Plus, Search, Palmtree, TrendingUp, ChevronRight, Filter, RotateCcw, CalendarDays, Timer, AlertTriangle, CheckCircle, Clock, Info, UserCheck, Trash2, LayoutGrid, Calendar, Printer, ChevronLeft, Star, X, Phone, Megaphone, HardHat, FileText, ShieldCheck
} from 'lucide-react';
import { store } from '../services/store';
import { User, Role, LeaveRequest, RequestStatus, RequestType, ShiftType } from '../types';
import UserDetailModal from './UserDetailModal';
import ShiftScheduler from './ShiftScheduler';

import { AdminStats, DepartmentManager, HRConfigManager, CommunicationsManager, AbsenceQueryManager, MaintenanceManager, EPIManager } from './AdminSubsections';

export const AdminSettings = ({ onViewRequest }: { onViewRequest: (req: LeaveRequest) => void }) => {
    const [activeTab, setActiveTab] = useState('users');
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        const unsubscribe = store.subscribe(() => setRefresh(prev => prev + 1));
        return unsubscribe;
    }, []);

    const stats = useMemo(() => {
        const total = store.users.length;
        const today = new Date().toISOString().split('T')[0];
        const absentToday = store.requests.filter((r: LeaveRequest) => 
            r.status === RequestStatus.APPROVED && 
            !store.isOvertimeRequest(r.typeId) &&
            r.startDate <= today && (r.endDate || r.startDate) >= today
        ).length;
        const perc = total > 0 ? ((absentToday / total) * 100).toFixed(1) : "0";
        return { total, absentToday, perc };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.requests, store.users, refresh]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-xl hover:border-indigo-100 transition-all duration-500">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform"><Users size={28}/></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Plantilla</p><p className="text-4xl font-black text-slate-900 tracking-tighter">{stats.total}</p></div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-xl hover:border-orange-100 transition-all duration-500">
                    <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform"><Palmtree size={28}/></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Ausencias Hoy</p><p className="text-4xl font-black text-slate-900 tracking-tighter">{stats.absentToday}</p></div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-xl hover:border-violet-100 transition-all duration-500">
                    <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform"><TrendingUp size={28}/></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">% Ausentismo</p><p className="text-4xl font-black text-slate-900 tracking-tighter">{stats.perc}%</p></div>
                </div>
            </div>

            <div className="flex gap-4 border-b border-slate-200 overflow-x-auto no-scrollbar scroll-smooth">
                {[{ id: 'users', label: 'Usuarios' }, { id: 'depts', label: 'Departamentos' }, { id: 'hr', label: 'RRHH' }, { id: 'epis', label: 'EPIs' }, { id: 'comms', label: 'Comunicaciones' }, { id: 'queries', label: 'Consultas' }, { id: 'stats', label: 'Estadísticas' }, { id: 'maintenance', label: 'Mantenimiento' }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-2 py-4 text-[13px] font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{tab.label}</button>
                ))}
            </div>

            <div className="pt-2">
                {activeTab === 'users' && <UserManagement currentUser={store.currentUser!} onViewRequest={onViewRequest} />}
                {activeTab === 'depts' && <DepartmentManager />}
                {activeTab === 'hr' && <HRConfigManager />}
                {activeTab === 'epis' && <EPIManager />}
                {activeTab === 'comms' && <CommunicationsManager />}
                {activeTab === 'queries' && <AbsenceQueryManager />}
                {activeTab === 'stats' && <AdminStats />}
                {activeTab === 'maintenance' && <MaintenanceManager />}
            </div>
        </div>
    );
};

export const UserManagement = ({ currentUser, onViewRequest }: { currentUser: User, onViewRequest: (req: LeaveRequest) => void }) => {
    const [view, setView] = useState<'list' | 'scheduler'>('list');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [search, setSearch] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        const unsubscribe = store.subscribe(() => setRefresh(prev => prev + 1));
        return unsubscribe;
    }, []);

    const filteredUsers = useMemo(() => {
        let list = store.users;
        if (currentUser.role === Role.SUPERVISOR) {
            const myDeptIds = store.departments.filter(d => (d.supervisorIds || []).includes(currentUser.id)).map(d => d.id);
            list = list.filter((u: User) => myDeptIds.includes(u.departmentId));
        }
        if (selectedDept) list = list.filter((u: User) => u.departmentId === selectedDept);
        if (search) list = list.filter((u: User) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
        return list.sort((a,b) => a.name.localeCompare(b.name));
    }, [search, selectedDept, currentUser, store.users, refresh]);

    const handleDeleteUser = async (e: React.MouseEvent, userToDelete: User) => {
        e.stopPropagation();
        if (userToDelete.id === currentUser.id) {
            alert("No puedes eliminar tu propia cuenta.");
            return;
        }
        if (confirm(`¿Estás seguro de que deseas eliminar permanentemente a ${userToDelete.name}? Se borrarán también todos sus registros asociados.`)) {
            try {
                await store.deleteUser(userToDelete.id);
            } catch (error) {
                alert("Error al eliminar el usuario. Es posible que tenga dependencias en la base de datos.");
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-6">
                <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit">
                    <button onClick={() => setView('list')} className={`px-8 py-2.5 rounded-[1rem] text-[11px] font-black uppercase tracking-widest transition-all ${view === 'list' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Listado</button>
                    <button onClick={() => setView('scheduler')} className={`px-8 py-2.5 rounded-[1rem] text-[11px] font-black uppercase tracking-widest transition-all ${view === 'scheduler' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Planificación</button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative group min-w-[200px]">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                            <Filter size={16}/>
                        </div>
                        <select className="w-full pl-11 pr-10 py-3.5 border border-slate-200 rounded-2xl bg-white text-sm outline-none font-bold text-slate-600 appearance-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                            <option value="">Todos los Dptos.</option>
                            {store.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-indigo-300 transition-colors">
                           <ChevronRight size={14} className="rotate-90"/>
                        </div>
                    </div>
                    <button onClick={() => setSelectedUser({ id: 'new', name: '', email: '', role: Role.WORKER, departmentId: '', daysAvailable: 22, overtimeHours: 0 } as any)} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/20 active:scale-[0.98] transition-all">
                        <Plus size={18}/> Nuevo Empleado
                    </button>
                </div>
            </div>

            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-300" size={22}/>
                <input type="text" placeholder="Buscar empleado por nombre o email..." className="w-full pl-16 pr-6 py-5 border border-slate-200 rounded-[2rem] bg-white text-slate-700 placeholder:text-slate-400 focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-base font-medium shadow-sm hover:shadow-md duration-300" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {view === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredUsers.map((u: User) => (
                        <div key={u.id} onClick={() => setSelectedUser(u)} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col">
                             <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity">
                               <Users size={60}/>
                            </div>
                            <div className="flex flex-col items-center text-center mb-5">
                                <div className="relative mb-3 group-hover:scale-105 transition-transform duration-300">
                                  <img src={u.avatar} className="w-16 h-16 rounded-2xl border-2 border-white shadow-lg object-cover bg-slate-100 ring-1 ring-slate-100" />
                                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center shadow-lg">
                                    <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-slate-800 text-sm tracking-tight mb-0.5 group-hover:text-indigo-600 transition-colors uppercase">{u.name}</h4>
                                    <p className="text-[9px] text-slate-400 font-bold truncate uppercase tracking-[0.05em]">{u.email}</p>
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <span className="px-2.5 py-0.5 bg-slate-50 text-slate-500 text-[8px] font-black rounded-full border border-slate-100 uppercase tracking-widest">{store.departments.find(d => d.id === u.departmentId)?.name || 'Sin Dpto.'}</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                <div className="bg-indigo-50/30 p-3 rounded-xl text-center border border-indigo-100/30 group-hover:bg-indigo-50 transition-colors duration-300">
                                    <p className="text-[8px] font-black text-indigo-400 uppercase mb-1 tracking-widest">Vacas</p>
                                    <div className="flex items-end justify-center gap-0.5">
                                      <p className="text-lg font-black text-indigo-600 tracking-tighter">{(u.daysAvailable ?? 0).toFixed(1)}</p>
                                      <span className="text-[9px] font-black text-indigo-300 mb-0.5">D</span>
                                    </div>
                                </div>
                                <div className="bg-orange-50/30 p-3 rounded-xl text-center border border-orange-100/30 group-hover:bg-orange-50 transition-colors duration-300">
                                    <p className="text-[8px] font-black text-orange-400 uppercase mb-1 tracking-widest">Horas</p>
                                    <div className="flex items-end justify-center gap-0.5">
                                        <p className="text-lg font-black text-indigo-600 tracking-tighter">{(u.overtimeHours ?? 0).toFixed(1)}</p>
                                      <span className="text-[9px] font-black text-orange-300 mb-0.5">H</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={(e) => handleDeleteUser(e, u)}
                                className="absolute top-3 right-3 p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                title="Eliminar"
                            >
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <ShiftScheduler users={filteredUsers} />
            )}

            {selectedUser && <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} onViewRequest={onViewRequest} />}
        </div>
    );
};

export const Approvals = ({ user, onViewRequest }: { user: User, onViewRequest: (req: LeaveRequest) => void }) => {
    const [selectedDeptId, setSelectedDeptId] = useState<string>('');
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        const unsubscribe = store.subscribe(() => setRefresh(prev => prev + 1));
        return unsubscribe;
    }, []);

    const allowedDepts = useMemo(() => {
        if (user.role === Role.ADMIN) return store.departments;
        if (user.role === Role.SUPERVISOR) return store.departments.filter(d => (d.supervisorIds || []).includes(user.id));
        return [];
    }, [user]);

    const filteredPending = useMemo(() => {
        let list = store.getPendingApprovalsForUser(user.id);
        if (selectedDeptId) {
            list = list.filter(r => {
                const u = store.users.find(usr => usr.id === r.userId);
                return u && u.departmentId === selectedDeptId;
            });
        }
        return list.sort((a,b) => a.startDate.localeCompare(b.startDate));
    }, [user.id, selectedDeptId, refresh]);

    const absenceRequests = filteredPending.filter((r: LeaveRequest) => !store.isOvertimeRequest(r.typeId));
    const overtimeRequests = filteredPending.filter((r: LeaveRequest) => store.isOvertimeRequest(r.typeId));

    const conflictsSummary = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const conflictList: { dateRange: string, users: string[], deptName: string }[] = [];
        const deptsToCheck = selectedDeptId 
            ? store.departments.filter(d => d.id === selectedDeptId)
            : allowedDepts;

        deptsToCheck.forEach(dept => {
            const deptUsers = store.users.filter(u => u.departmentId === dept.id).map(u => u.id);
            const deptReqs = store.requests.filter(r => 
                (r.status === RequestStatus.APPROVED || r.status === RequestStatus.PENDING) && 
                (!store.isOvertimeRequest(r.typeId) || r.typeId === RequestType.OVERTIME_SPEND_DAYS || r.typeId === RequestType.OVERTIME_TO_DAYS) &&
                deptUsers.includes(r.userId) &&
                (r.endDate || r.startDate) >= today
            );

            for (let i = 0; i < deptReqs.length; i++) {
                for (let j = i + 1; j < deptReqs.length; j++) {
                    const r1 = deptReqs[i];
                    const r2 = deptReqs[j];
                    const s1 = r1.startDate.split('T')[0];
                    const e1 = (r1.endDate || r1.startDate).split('T')[0];
                    const s2 = r2.startDate.split('T')[0];
                    const e2 = (r2.endDate || r2.startDate).split('T')[0];

                    if (s1 <= e2 && e1 >= s2) {
                        const u1 = store.users.find(u => u.id === r1.userId)?.name || '?';
                        const u2 = store.users.find(u => u.id === r2.userId)?.name || '?';
                        
                        // Check if either is an overtime record that adds balance
                        const isR1Adding = store.isOvertimeRequest(r1.typeId) && (r1.hours || 0) > 0;
                        const isR2Adding = store.isOvertimeRequest(r2.typeId) && (r2.hours || 0) > 0;
                        
                        if (!isR1Adding && !isR2Adding) {
                            const overlapStart = s1 > s2 ? s1 : s2;
                            const overlapEnd = e1 < e2 ? e1 : e2;
                            conflictList.push({
                                dateRange: overlapStart === overlapEnd 
                                    ? new Date(overlapStart).toLocaleDateString()
                                    : `${new Date(overlapStart).toLocaleDateString()} - ${new Date(overlapEnd).toLocaleDateString()}`,
                                users: [u1, u2],
                                deptName: dept.name
                            });
                        }
                    }
                }
            }
        });
        return conflictList;
    }, [store.requests, store.users, allowedDepts, selectedDeptId, refresh]);

    const handleAction = async (id: string, status: RequestStatus) => {
        const isRejection = status === RequestStatus.REJECTED;
        const promptMsg = isRejection ? 'Motivo del rechazo (obligatorio):' : 'Comentario / Observaciones (opcional):';
        const comment = window.prompt(promptMsg);
        if (isRejection && !comment) return;
        await store.updateRequestStatus(id, status, store.currentUser?.id || user.id, comment || '');
    };

    const Table = ({ requests, title, icon: Icon, color }: { requests: LeaveRequest[], title: string, icon: any, color: string }) => (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-100/50">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl bg-white shadow-sm ${color}`}>
                        <Icon size={24}/>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
                </div>
                <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">{requests.length} Pendientes</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">
                        <tr>
                            <th className="px-8 py-5 border-b border-slate-100">Empleado / Dpto</th>
                            <th className="px-8 py-5 border-b border-slate-100">Detalles de Solicitud</th>
                            <th className="px-8 py-5 border-b border-slate-100">Estado de Conflictos</th>
                            <th className="px-8 py-5 border-b border-slate-100 text-right">Gestión</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {requests.length === 0 ? (
                            <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic font-medium bg-slate-50/20">No hay solicitudes pendientes en esta categoría.</td></tr>
                        ) : requests.map((req: LeaveRequest) => {
                            const u = store.users.find(usr => usr.id === req.userId);
                            const conflicts = store.getRequestConflicts(req);
                            const calculateDays = (startStr: string, endStr?: string) => {
                                const start = new Date(startStr);
                                const end = new Date(endStr || startStr);
                                return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                            };
                            return (
                                <tr key={req.id} onClick={() => onViewRequest(req)} className="hover:bg-indigo-50/30 cursor-pointer transition-all duration-300 group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                              <img src={u?.avatar} className="w-12 h-12 rounded-2xl border-2 border-white shadow-md object-cover group-hover:scale-105 transition-transform" />
                                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                            </div>
                                            <div>
                                              <div className="font-black text-slate-900 uppercase text-sm tracking-tight group-hover:text-indigo-600 transition-colors">{u?.name}</div>
                                              <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">{store.departments.find(d => d.id === u?.departmentId)?.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                          <div className="font-black text-slate-800 flex items-center gap-2 text-xs uppercase tracking-tighter">
                                              {store.getTypeLabel(req.typeId)}
                                              <span className="text-slate-300">•</span>
                                              {req.typeId === RequestType.WORKED_HOLIDAY ? (
                                                  <div className="flex gap-1.5"><span className="px-2 py-0.5 rounded-lg font-black text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">+1 Día</span><span className="px-2 py-0.5 rounded-lg font-black text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">+4 Horas</span></div>
                                              ) : req.typeId === RequestType.OVERTIME_TO_DAYS ? (
                                                  <div className="flex gap-1.5"><span className="px-2 py-0.5 rounded-lg font-black text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">+{(Math.abs(req.hours || 0) / 8).toFixed(1)} Días</span><span className="px-2 py-0.5 rounded-lg font-black text-[9px] bg-rose-50 text-rose-600 border border-rose-100 uppercase">-{Math.abs(req.hours || 0)} Horas</span></div>
                                              ) : store.isOvertimeRequest(req.typeId) ? (
                                                  <span className={`px-2 py-0.5 rounded-lg font-black text-[9px] border uppercase ${req.hours && req.hours > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{req.hours && req.hours > 0 ? '+' : ''}{req.hours} Horas</span>
                                              ) : (
                                                  <span className="px-2 py-0.5 rounded-lg font-black text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase">-{calculateDays(req.startDate, req.endDate)} Días</span>
                                              )}
                                          </div>
                                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                                            <Calendar size={12} className="text-slate-400"/>
                                            {new Date(req.startDate).toLocaleDateString()}{req.endDate ? ` — ${new Date(req.endDate).toLocaleDateString()}` : ''}
                                          </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {conflicts.length > 0 ? (
                                            <div className="flex items-center gap-2 bg-rose-50 text-rose-600 font-black text-[9px] uppercase px-3 py-1.5 rounded-full border border-rose-100 w-fit animate-pulse">
                                               <AlertTriangle size={14}/> {conflicts.length} Coincidencias detectadas
                                            </div>
                                        ) : (
                                          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 font-black text-[9px] uppercase px-3 py-1.5 rounded-full border border-emerald-100 w-fit">
                                             <CheckCircle size={14}/> Sin conflictos
                                          </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-end gap-3">
                                            <button onClick={() => handleAction(req.id, RequestStatus.APPROVED)} className="bg-indigo-600 text-white font-black px-6 py-2.5 rounded-2xl hover:bg-indigo-700 text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all">Aprobar</button>
                                            <button onClick={() => handleAction(req.id, RequestStatus.REJECTED)} className="bg-white border border-slate-200 text-slate-400 font-black px-6 py-2.5 rounded-2xl hover:border-rose-500 hover:text-rose-500 text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all">Rechazar</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="space-y-12 animate-fade-in pb-20">
             <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 ring-1 ring-slate-100/50">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner"><CheckCircle size={28}/></div>
                      Gestión de Aprobaciones
                   </h3>
                   <p className="text-slate-400 text-sm font-medium mt-2 ml-16">Revisa y gestiona las solicitudes de ausencia y horas extras de tu equipo.</p>
                </div>
                <div className="relative min-w-[280px]">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors">
                        <Filter size={18}/>
                    </div>
                    <select className="w-full pl-12 pr-10 py-4 border border-slate-200 rounded-2xl bg-white text-sm outline-none font-black text-slate-600 appearance-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-sm" value={selectedDeptId} onChange={e => setSelectedDeptId(e.target.value)}>
                        <option value="">Todos los Departamentos</option>
                        {allowedDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                       <ChevronRight size={16} className="rotate-90"/>
                    </div>
                </div>
            </div>
            
            <div className="space-y-16">
              <Table title="Ausencias y Vacaciones" requests={absenceRequests} icon={CalendarDays} color="text-indigo-600" />
              <Table title="Gestión de Horas" requests={overtimeRequests} icon={Timer} color="text-violet-600" />
            </div>
        </div>
    );
};

interface PrintMonthProps { date: Date; requests: LeaveRequest[]; deptId: string; }
const PrintMonth: React.FC<PrintMonthProps> = ({ date, requests, deptId }) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInM = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInM }, (_, i) => {
        const d = new Date(year, month, i + 1);
        return {
            dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
            day: i + 1,
            weekday: d.toLocaleDateString('es-ES', { weekday: 'short' }).charAt(0).toUpperCase(),
            isWeekend: [0, 6].includes(d.getDay())
        };
    });

    const groupedUsers = useMemo(() => {
        let list = store.users;
        if (deptId) list = list.filter(u => u.departmentId === deptId);
        
        const depts = store.departments.filter(d => list.some(u => u.departmentId === d.id))
                        .sort((a,b) => a.name.localeCompare(b.name));
        
        return depts.map(d => ({
            dept: d,
            users: list.filter(u => u.departmentId === d.id).sort((a,b) => a.name.localeCompare(b.name))
        }));
    }, [store.users, store.departments, deptId]);

    return (
        <div className="print:break-after-page mb-8">
            <h4 className="text-xl font-black uppercase text-slate-800 border-b-2 border-slate-900 mb-4 pb-1">{date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h4>
            <div className="inline-block min-w-full">
                <div className="grid" style={{ gridTemplateColumns: `150px repeat(${daysInM}, 25px)` }}>
                    <div className="bg-slate-100 border-b-2 border-r border-slate-200 p-1 text-[8px] font-black uppercase flex items-center">Empleado</div>
                    {days.map(d => {
                        const holiday = store.config.holidays.find(h => h.date === d.dateStr);
                        return (
                            <div key={d.day} className={`border-b-2 border-r border-slate-200 flex flex-col items-center justify-center p-0.5 ${holiday ? 'bg-red-50 text-red-600' : d.isWeekend ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-500'}`}>
                                <span className="text-[8px] font-black leading-none">{d.day}</span>
                                <span className="text-[6px] font-bold leading-none">{d.weekday}</span>
                            </div>
                        );
                    })}

                    {groupedUsers.map(deptGroup => (
                        <React.Fragment key={deptGroup.dept.id}>
                            <div className="bg-slate-50 border-b border-r border-slate-200 p-1 h-5 flex items-center" style={{ gridColumn: '1 / -1' }}>
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{deptGroup.dept.name}</span>
                            </div>
                            {deptGroup.users.map(user => (
                                <React.Fragment key={user.id}>
                                    <div className="border-b border-r border-slate-200 p-1 flex items-center h-6">
                                        <span className="text-[8px] font-black text-slate-800 truncate uppercase">{user.name}</span>
                                    </div>
                                    {days.map(d => {
                                        const absence = requests.find(r => {
                                            const s = r.startDate.split('T')[0];
                                            const e = (r.endDate || r.startDate).split('T')[0];
                                            return r.userId === user.id && d.dateStr >= s && d.dateStr <= e;
                                        });
                                        const holiday = store.config.holidays.find(h => h.date === d.dateStr);
                                        
                                        let bgColor = 'transparent';
                                        let cellContent = null;
                                        if (holiday) {
                                            bgColor = '#fee2e2';
                                        } else if (absence) {
                                            const typeId = String(absence.typeId);
                                            const isBaja = typeId === RequestType.SICKNESS || typeId.includes('baja');
                                            const isDL = typeId === RequestType.OVERTIME_SPEND_DAYS;

                                            if (isBaja) {
                                                bgColor = '#ef4444';
                                                cellContent = 'B';
                                            } else if (isDL) {
                                                bgColor = '#3b82f6';
                                                cellContent = 'DL';
                                            } else {
                                                bgColor = '#dcfce7';
                                                cellContent = 'VAC';
                                            }
                                        } else if (d.isWeekend) {
                                            bgColor = '#f8fafc';
                                        }

                                        return (
                                            <div key={d.day} className="border-b border-r border-slate-100 flex items-center justify-center h-6" style={{ backgroundColor: bgColor }}>
                                                <span className={`text-[7px] font-black ${cellContent === 'B' || cellContent === 'DL' ? 'text-white' : 'text-green-700'}`}>
                                                    {cellContent}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>
            <div className="mt-3 flex gap-4 text-[7px] font-bold text-slate-400 uppercase print:flex hidden">
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-[#ef4444] rounded-sm"></div> Baja (B)</span>
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-[#dcfce7] border border-green-200 rounded-sm"></div> Vacaciones (VAC)</span>
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-[#3b82f6] rounded-sm"></div> Canje (DL)</span>
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-[#fee2e2] rounded-sm"></div> Festivo</span>
            </div>
        </div>
    );
};

export const UpcomingAbsences = ({ user, onViewRequest }: { user: User, onViewRequest: (req: LeaveRequest) => void }) => {
    const today = new Date().toISOString().split('T')[0];
    const [selectedDeptId, setSelectedDeptId] = useState<string>('');
    const [view, setView] = useState<'list' | 'calendar'>('list');
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printMonths, setPrintMonths] = useState(3);
    const [currentCalDate, setCurrentCalDate] = useState(new Date());

    const allowedDepts = useMemo(() => {
        if (user.role === Role.ADMIN) return store.departments;
        if (user.role === Role.SUPERVISOR) return store.departments.filter(d => (d.supervisorIds || []).includes(user.id));
        return [];
    }, [user]);

    const upcoming = useMemo(() => {
        const currentYear = currentCalDate.getFullYear();
        const yearStart = `${currentYear}-01-01`;
        const yearEnd = `${currentYear}-12-31`;

        let list = store.requests.filter((r: LeaveRequest) => 
            (r.status === RequestStatus.APPROVED || r.status === RequestStatus.PENDING) && 
            (!store.isOvertimeRequest(r.typeId) || r.typeId === RequestType.OVERTIME_SPEND_DAYS) && 
            (r.startDate <= yearEnd && (r.endDate || r.startDate) >= yearStart)
        );
        if (user.role === Role.SUPERVISOR) {
            const myDeptIds = allowedDepts.map(d => d.id);
            list = list.filter((r: LeaveRequest) => {
                const u = store.users.find(usr => usr.id === r.userId);
                return u && myDeptIds.includes(u.departmentId);
            });
        }
        if (selectedDeptId) {
            list = list.filter((r: LeaveRequest) => {
                const u = store.users.find(usr => usr.id === r.userId);
                return u && u.departmentId === selectedDeptId;
            });
        }
        return list.sort((a,b) => (a.startDate || '').localeCompare(b.startDate || ''));
    }, [store.requests, user, selectedDeptId, allowedDepts, currentCalDate.getFullYear()]);

    const usersByDept = useMemo(() => {
        let list = store.users;
        if (user.role === Role.SUPERVISOR) {
            const myDeptIds = allowedDepts.map(d => d.id);
            list = list.filter(u => myDeptIds.includes(u.departmentId));
        }
        if (selectedDeptId) {
            list = list.filter(u => u.departmentId === selectedDeptId);
        }
        
        const activeDepts = store.departments.filter(d => list.some(u => u.departmentId === d.id))
                        .sort((a,b) => a.name.localeCompare(b.name));
        
        return activeDepts.map(d => ({
            dept: d,
            users: list.filter(u => u.departmentId === d.id).sort((a,b) => a.name.localeCompare(b.name))
        }));
    }, [store.users, store.departments, user, selectedDeptId, allowedDepts]);

    const conflicts = useMemo(() => {
        const conflictList: { date: string, deptName: string, users: User[] }[] = [];
        const year = currentCalDate.getFullYear();
        
        // We only check for the current visible year or a reasonable range
        store.departments.forEach(dept => {
            const deptUsers = store.users.filter(u => u.departmentId === dept.id);
            if (deptUsers.length < 2) return;

            // Check each day of the year (or just upcoming months for performance)
            // For now, let's check next 3 months from today or current visible year
            const startStr = `${year}-01-01`;
            const endStr = `${year}-12-31`;

            // Simple brute force check for each day (could be optimized)
            // But let's only check days where there ARE requests
            const reqs = upcoming.filter(r => {
                const u = store.users.find(usr => usr.id === r.userId);
                const typeId = String(r.typeId);
                const isBaja = typeId === RequestType.SICKNESS || (r.label || '').toLowerCase().includes('baja');
                // Exclude overtime requests that ADD balance (hours > 0)
                const isAddingBalance = store.isOvertimeRequest(typeId) && (r.hours || 0) > 0;
                return u && u.departmentId === dept.id && !isBaja && !isAddingBalance;
            });

            const daysWithAbsence: Record<string, User[]> = {};
            reqs.forEach(r => {
                const u = store.users.find(usr => usr.id === r.userId);
                if (!u) return;
                let curr = new Date(r.startDate.split('T')[0]);
                const end = new Date((r.endDate || r.startDate).split('T')[0]);
                while (curr <= end) {
                    const dStr = curr.toISOString().split('T')[0];
                    if (dStr >= startStr && dStr <= endStr) {
                        if (!daysWithAbsence[dStr]) daysWithAbsence[dStr] = [];
                        if (!daysWithAbsence[dStr].find(existing => existing.id === u.id)) {
                            daysWithAbsence[dStr].push(u);
                        }
                    }
                    curr.setDate(curr.getDate() + 1);
                }
            });

        Object.entries(daysWithAbsence).forEach(([date, users]) => {
                if (users.length > 1 && date >= today) {
                    conflictList.push({ date, deptName: dept.name, users });
                }
            });
        });

        return conflictList.sort((a, b) => a.date.localeCompare(b.date));
    }, [upcoming, currentCalDate, store.users, store.departments, today]);

    const monthsData = useMemo(() => {
        const year = currentCalDate.getFullYear();
        return Array.from({ length: 12 }).map((_, monthIdx) => {
            const first = new Date(year, monthIdx, 1);
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
    }, [currentCalDate]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden print:hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50 gap-4">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CheckCircle size={20} className="text-blue-600"/> Próximas Ausencias</h3>
                        <div className="flex p-1 bg-slate-200/50 rounded-xl">
                            <button onClick={() => setView('list')} className={`p-2 rounded-lg ${view === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><LayoutGrid size={18}/></button>
                            <button onClick={() => setView('calendar')} className={`p-2 rounded-lg ${view === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><Calendar size={18}/></button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <select className="pl-4 pr-10 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-600 appearance-none outline-none" value={selectedDeptId} onChange={e => setSelectedDeptId(e.target.value)}>
                            <option value="">Todos los Dptos.</option>
                            {allowedDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <button onClick={() => setShowPrintModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-black transition-all shadow-lg"><Printer size={16}/> Imprimir</button>
                    </div>
                </div>

                {view === 'list' ? (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcoming.filter(r => (r.endDate || r.startDate) >= today).length === 0 ? <div className="col-span-full py-12 text-center text-slate-400 italic">No hay ausencias programadas.</div> : upcoming.filter(r => (r.endDate || r.startDate) >= today).map((req: LeaveRequest) => {
                            const u = store.users.find(usr => usr.id === req.userId);
                            const typeId = String(req.typeId);
                            const isCurrentBaja = typeId === RequestType.SICKNESS || (req.label || '').toLowerCase().includes('baja');
                            
                            // Calculate specific conflicts for this card
                            const start = new Date(req.startDate.split('T')[0]);
                            const end = new Date((req.endDate || req.startDate).split('T')[0]);
                            const myDeptConflicts: Record<string, { date: string, users: User[] }> = {};
                            
                            // If it's a BAJA, it doesn't generate conflicts
                            if (!isCurrentBaja) {
                                conflicts.forEach(c => {
                                    const cDate = new Date(c.date);
                                    if (cDate >= start && cDate <= end && c.users.some(usr => usr.id === req.userId)) {
                                        const others = c.users.filter(usr => usr.id !== req.userId);
                                        if (others.length > 0) {
                                            others.forEach(o => {
                                                if (!myDeptConflicts[o.id]) myDeptConflicts[o.id] = { date: '', users: [o] };
                                                const dStr = new Date(c.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                                                if (!myDeptConflicts[o.id].date.includes(dStr)) {
                                                    myDeptConflicts[o.id].date += (myDeptConflicts[o.id].date ? ', ' : '') + dStr;
                                                }
                                            });
                                        }
                                    }
                                });
                            }

                            const conflictList = Object.values(myDeptConflicts);
                            const isPending = req.status === RequestStatus.PENDING;

                            return (
                                <div key={req.id} onClick={() => onViewRequest(req)} className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white group relative overflow-hidden flex flex-col justify-between h-full shadow-sm hover:shadow-xl ${conflictList.length > 0 ? 'border-red-200 bg-red-50/10' : isPending ? 'border-dashed border-slate-300 bg-slate-50/30' : 'border-slate-100'}`}>
                                    {isPending && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                                            <div className="text-2xl font-black uppercase tracking-[1em] rotate-[-15deg]">PENDIENTE</div>
                                        </div>
                                    )}
                                    <div className={`absolute top-0 left-0 w-1 h-full ${conflictList.length > 0 ? 'bg-red-500' : isPending ? 'bg-slate-300' : 'bg-blue-600'}`}></div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="relative">
                                            <img src={u?.avatar} className={`w-10 h-10 rounded-xl border-2 border-white shadow-md object-cover ${isPending ? 'grayscale-[0.5]' : ''}`} />
                                            {conflictList.length > 0 && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full flex items-center justify-center text-white border-2 border-white"><AlertTriangle size={7}/></div>}
                                            {isPending && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-800 rounded-full flex items-center justify-center text-white border-2 border-white"><Clock size={9}/></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-slate-800 text-sm truncate tracking-tight flex items-center gap-2">
                                                {u?.name}
                                                {isPending && <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[6px] font-black rounded-md uppercase tracking-widest">PENDIENTE</span>}
                                            </div>
                                            <div className="text-[8px] text-slate-400 uppercase font-black tracking-widest">{store.departments.find(d => d.id === u?.departmentId)?.name}</div>
                                        </div>
                                    </div>

                                    {conflictList.length > 0 && (
                                        <div className="mb-4 p-3 bg-red-100/50 rounded-2xl border border-red-200">
                                            <div className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <AlertTriangle size={12}/> Conflicto Detectado
                                            </div>
                                            <div className="space-y-2">
                                                {conflictList.map(c => (
                                                    <div key={c.users[0].id} className="flex items-center gap-2">
                                                        <img src={c.users[0].avatar} className="w-5 h-5 rounded-full object-cover border border-white" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] font-bold text-slate-700 truncate">{c.users[0].name.split(' ')[0]}</div>
                                                            <div className="text-[9px] text-red-500 font-medium">Coincide: {c.date}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100">
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${conflictList.length > 0 ? 'text-red-600' : 'text-blue-600'}`}>{store.getTypeLabel(req.typeId)}</span>
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{new Date(req.startDate).toLocaleDateString()}</div>
                                            {req.endDate && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">- {new Date(req.endDate).toLocaleDateString()}</div>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col h-[700px] relative overflow-hidden">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between z-40">
                            <div className="flex items-center gap-4">
                                <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                                    <button onClick={() => setCurrentCalDate(new Date(currentCalDate.getFullYear() - 1, 0, 1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600"><ChevronLeft size={20}/></button>
                                    <button onClick={() => setCurrentCalDate(new Date(currentCalDate.getFullYear() + 1, 0, 1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600"><ChevronRight size={20}/></button>
                                </div>
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Año {currentCalDate.getFullYear()}</h4>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-12 bg-slate-100/50">
                            {monthsData.map(m => (
                                <div key={m.monthKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="bg-slate-900 text-white px-6 py-3">
                                        <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                            <Calendar size={14} className="text-blue-400"/> {m.monthName}
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto no-scrollbar">
                                        <div className="inline-block min-w-full">
                                            <div className="grid" style={{ gridTemplateColumns: `180px repeat(${m.days.length}, 36px)` }}>
                                                <div className="sticky left-0 z-30 bg-slate-50 border-b border-r border-slate-200 p-2 h-12 flex items-center text-[10px] font-black text-slate-500 uppercase">Empleado</div>
                                                {m.days.map(d => {
                                                    const holiday = store.config.holidays.find(h => h.date === d.dateStr);
                                                    return (
                                                        <div key={d.dateStr} className={`border-b border-r border-slate-200 flex flex-col items-center justify-center h-12 ${holiday ? 'bg-red-50 text-red-600' : d.isWeekend ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-500'}`}>
                                                            <span className="text-[11px] font-black">{d.day}</span>
                                                            <span className="text-[8px] font-bold uppercase opacity-50">{d.weekday}</span>
                                                        </div>
                                                    );
                                                })}

                                                {usersByDept.map(deptGroup => (
                                                    <React.Fragment key={deptGroup.dept.id}>
                                                        {/* Fila Cabecera Dpto */}
                                                        <div className="bg-slate-100/80 px-4 py-1.5 flex items-center border-b border-r border-slate-200" style={{ gridColumn: '1 / -1' }}>
                                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em]">{deptGroup.dept.name}</span>
                                                        </div>
                                                        {deptGroup.users.map(userItem => (
                                                            <React.Fragment key={userItem.id}>
                                                                <div className="sticky left-0 z-20 bg-white border-b border-r border-slate-200 px-4 flex items-center gap-3 h-10 shadow-sm">
                                                                    <img src={userItem.avatar} className="w-6 h-6 rounded-full border border-slate-100 object-cover" />
                                                                    <span className="text-[11px] font-black text-slate-800 truncate uppercase tracking-tighter">{userItem.name}</span>
                                                                </div>
                                                                {m.days.map(d => {
                                                                    const absence = upcoming.find(r => {
                                                                        const s = r.startDate.split('T')[0];
                                                                        const e = (r.endDate || r.startDate).split('T')[0];
                                                                        return r.userId === userItem.id && d.dateStr >= s && d.dateStr <= e;
                                                                    });
                                                                    const holiday = store.config.holidays.find(h => h.date === d.dateStr);
                                                                    const dayConflict = conflicts.find(c => c.date === d.dateStr && c.users.some(u => u.id === userItem.id));
                                                                    
                                                                    let bgColor = 'transparent';
                                                                    let cellContent = null;
                                                                    
                                                                    if (holiday) {
                                                                        bgColor = '#fee2e2';
                                                                    } else if (absence) {
                                                                        const typeId = String(absence.typeId);
                                                                        const isBaja = typeId === RequestType.SICKNESS || typeId.includes('baja');
                                                                        const isDL = typeId === RequestType.OVERTIME_SPEND_DAYS;
                                                                        const isPending = absence.status === RequestStatus.PENDING;

                                                                        if (isBaja) {
                                                                            bgColor = isPending ? '#fecaca' : '#ef4444';
                                                                            cellContent = <span className="text-[8px] font-black text-white">B</span>;
                                                                        } else if (isDL) {
                                                                            bgColor = isPending ? '#bfdbfe' : '#3b82f6';
                                                                            cellContent = <span className="text-[8px] font-black text-white">DL</span>;
                                                                        } else {
                                                                            bgColor = isPending ? '#f3f4f6' : '#dcfce7';
                                                                            cellContent = <span className={`text-[8px] font-black ${isPending ? 'text-slate-400' : 'text-green-700'}`}>VAC</span>;
                                                                        }
                                                                    } else if (d.isWeekend) {
                                                                        bgColor = '#f8fafc';
                                                                    }

                                                                    return (
                                                                        <div 
                                                                            key={d.dateStr} 
                                                                            className={`border-b border-r border-slate-100 h-10 flex items-center justify-center transition-all relative ${absence ? 'cursor-pointer hover:opacity-80' : ''}`}
                                                                            style={{ backgroundColor: bgColor }}
                                                                            onClick={() => absence && onViewRequest(absence)}
                                                                        >
                                                                            {absence && (
                                                                                <div className={`absolute inset-0.5 flex items-center justify-center overflow-hidden ${absence.status === RequestStatus.PENDING ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                                                                    <img src={userItem.avatar} className={`w-7 h-7 rounded-full border border-white shadow-sm object-cover ring-1 ${dayConflict ? 'ring-red-500 ring-2 ring-offset-1 animate-pulse' : 'ring-black/5'}`} title={`${userItem.name}: ${store.getTypeLabel(absence.typeId)}${dayConflict ? ' (CONFLICTO EN DEPTO)' : ''}${absence.status === RequestStatus.PENDING ? ' (PENDIENTE)' : ''}`} />
                                                                                    {dayConflict && <div className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 shadow-lg border border-white"><AlertTriangle size={8}/></div>}
                                                                                    {absence.status === RequestStatus.PENDING && (
                                                                                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white/40 pointer-events-none">
                                                                                            <span className="text-[6px] font-black text-slate-600 uppercase tracking-tighter rotate-[-45deg] border border-slate-400 px-0.5 bg-white scale-75 whitespace-nowrap">PENDIENTE</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {cellContent && (
                                                                                        <div className="absolute -bottom-0.5 -right-0.5 px-1 bg-black/70 rounded-tl-md rounded-br-sm border-t border-l border-white/20">
                                                                                           {cellContent}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            {!absence && holiday && (
                                                                                <div className="text-[8px] font-black text-red-300 opacity-50 uppercase rotate-12">{(holiday as any).name?.substring(0, 3)}</div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </React.Fragment>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white border-t border-slate-200 p-3 flex justify-center gap-6 text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> Baja Médica (B)</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded-sm"></div> Vacaciones (VAC)</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> Canje Días (DL)</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-50 rounded-sm border border-red-100"></div> Festivo</div>
                        </div>
                    </div>
                )}
            </div>

            {showPrintModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4 backdrop-blur-sm print-hidden print:hidden">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8">
                        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Reporte de Ausencias</h3><button onClick={() => setShowPrintModal(false)}><X size={24}/></button></div>
                        <div className="space-y-6">
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rango de Meses</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 3, 12].map(m => (
                                    <button 
                                        key={m} 
                                        onClick={() => setPrintMonths(m)} 
                                        className={`py-3 rounded-xl text-sm font-bold border transition-all ${printMonths === m ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                                    >
                                        {m === 1 ? '1 Mes' : m === 3 ? '3 Meses' : 'Anual'}
                                    </button>
                                ))}
                            </div></div>
                            <button onClick={() => { window.print(); setShowPrintModal(false); }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"><Printer size={20}/> Generar Informe</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="hidden print:block bg-white p-4">
                <div className="flex items-center justify-between mb-6 border-b-2 border-slate-900 pb-4">
                    <div className="flex items-center gap-4">
                        <img src="https://termosycalentadoresgranada.com/wp-content/uploads/2025/08/https___cdn.evbuc_.com_images_677236879_73808960223_1_original.png" alt="GdA" className="w-16 h-16 object-contain" />
                        <div><h1 className="text-2xl font-black uppercase tracking-tighter">Planificación de Ausencias</h1><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Portal RRHH GdA - {new Date().toLocaleDateString()}</p></div>
                    </div>
                </div>
                {Array.from({ length: printMonths }).map((_, i) => { 
                    const startYear = currentCalDate.getFullYear();
                    const startMonth = printMonths === 12 ? 0 : currentCalDate.getMonth();
                    const d = new Date(startYear, startMonth + i, 1); 
                    return <PrintMonth key={i} date={d} requests={upcoming} deptId={selectedDeptId} />; 
                })}
            </div>
        </div>
    );
};