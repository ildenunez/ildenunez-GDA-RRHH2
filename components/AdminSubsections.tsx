import React, { useState, useEffect, useMemo } from 'react';
import { store } from '../services/store';
import { 
    BarChart2, Activity, Target, Palmtree, Users, Settings, Plus, Trash2, Database, Download, Upload, Info, ShieldCheck, Mail, Megaphone, Server, Layout, Edit2, RotateCcw, Send, Lock, Loader2, Search, Save, X, UserCheck, ShieldAlert, Briefcase, Calendar, Clock, HardHat, Check, Minus, AlertCircle, Printer, AlertTriangle, Archive, ShoppingCart, List, History, RefreshCcw, Timer, ChevronRight, ChevronDown, ChevronUp, Bell
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Role, RequestStatus, RequestType, EmailTemplate, Department, Holiday, ShiftType, LeaveTypeConfig, PPEType } from '../types';
import { supabase } from '../services/supabase';

// Estadísticas Inteligentes
export const AdminStats = () => {
    const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
    const [expandedDept, setExpandedDept] = useState<string | null>(null);
    
    const statsData = useMemo(() => {
        const approved = store.requests.filter(r => r.status.toUpperCase() === RequestStatus.APPROVED);
        const bajaTypeIds = store.config.leaveTypes.filter(t => t.label.toLowerCase().includes('baja')).map(t => t.id);
        
        const calculateDaysInRange = (reqStartStr: string, reqEndStr: string | undefined) => {
            const rS = new Date(reqStartStr);
            rS.setHours(0,0,0,0);
            const rE = new Date(reqEndStr || reqStartStr);
            rE.setHours(0,0,0,0);

            let fS: Date, fE: Date;
            if (selectedMonth === 'all') {
                fS = new Date(selectedYear, 0, 1);
                fE = new Date(selectedYear, 11, 31);
            } else {
                fS = new Date(selectedYear, selectedMonth as number, 1);
                fE = new Date(selectedYear, (selectedMonth as number) + 1, 0);
            }
            fS.setHours(0,0,0,0);
            fE.setHours(0,0,0,0);

            const start = rS > fS ? rS : fS;
            const end = rE < fE ? rE : fE;

            if (start > end) return 0;
            return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        };

        const inPeriod = approved.filter(r => calculateDaysInRange(r.startDate, r.endDate) > 0);
        const totalEmployees = store.users.length;
        
        const totalAbsenceDays = inPeriod.reduce((sum, r) => {
            if (store.isOvertimeRequest(r.typeId)) return sum;
            return sum + calculateDaysInRange(r.startDate, r.endDate);
        }, 0);

        const approvedBajas = inPeriod.filter(r => bajaTypeIds.includes(r.typeId));
        const totalBajaDays = approvedBajas.reduce((sum, r) => sum + calculateDaysInRange(r.startDate, r.endDate), 0);
        const avgBajaDuration = approvedBajas.length > 0 ? (totalBajaDays / approvedBajas.length).toFixed(1) : "0";

        // Efficiency Calculation
        const today = new Date().toISOString().split('T')[0];
        const absentTodayCount = store.requests.filter(r => {
            const status = (r.status || '').toUpperCase();
            return status === RequestStatus.APPROVED && 
                   !store.isOvertimeRequest(r.typeId) &&
                   r.startDate <= today && (r.endDate || r.startDate) >= today;
        }).length;
        const efficiencyPerc = totalEmployees > 0 ? (((totalEmployees - absentTodayCount) / totalEmployees) * 100).toFixed(0) : "100";

        const depts = store.departments.map(d => {
            const deptUsers = store.users.filter(u => u.departmentId === d.id);
            const userCount = deptUsers.length;
            const deptReqs = inPeriod.filter(r => deptUsers.some(u => u.id === r.userId));
            
            const bajaDays = deptReqs.filter(r => bajaTypeIds.includes(r.typeId))
                                     .reduce((sum, r) => sum + calculateDaysInRange(r.startDate, r.endDate), 0);
            
            const absenceDays = deptReqs.filter(r => !store.isOvertimeRequest(r.typeId))
                                        .reduce((sum, r) => sum + calculateDaysInRange(r.startDate, r.endDate), 0);

            const userDetails = deptUsers.map(u => ({
                id: u.id,
                name: u.name,
                absences: deptReqs.filter(r => r.userId === u.id && !store.isOvertimeRequest(r.typeId))
                                  .reduce((sum, r) => sum + calculateDaysInRange(r.startDate, r.endDate), 0),
                bajas: deptReqs.filter(r => r.userId === u.id && bajaTypeIds.includes(r.typeId))
                               .reduce((sum, r) => sum + calculateDaysInRange(r.startDate, r.endDate), 0)
            })).sort((a,b) => (b.absences + b.bajas) - (a.absences + a.bajas));
            
            return {
                id: d.id,
                name: d.name,
                users: userCount,
                bajas: bajaDays,
                absences: absenceDays,
                employees: userDetails
            };
        }).filter(d => d.users > 0 || d.absences > 0);

        return { totalEmployees, totalAbsences: totalAbsenceDays, totalBajas: totalBajaDays, avgBajaDuration, efficiencyPerc, depts };
    }, [store.requests, store.users, store.config.leaveTypes, store.departments, selectedYear, selectedMonth]);

    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {/* Filters Header */}
            <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 p-2 text-indigo-600 rounded-xl"><Activity size={20}/></div>
                    <div><h3 className="font-bold text-slate-800">Panel de Control de Estadísticas</h3><p className="text-[10px] font-black text-slate-400 uppercase">Filtros temporales activos</p></div>
                </div>
                <div className="flex gap-2">
                    <select className="bg-white border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-600 shadow-sm outline-none focus:ring-2 focus:ring-indigo-100" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select className="bg-white border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-600 shadow-sm outline-none focus:ring-2 focus:ring-indigo-100" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}>
                        <option value="all">Todo el año</option>
                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl"><Users size={24}/></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Plantilla</p><p className="text-3xl font-black text-slate-800">{statsData.totalEmployees}</p></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="bg-orange-50 text-orange-600 p-4 rounded-2xl"><Target size={24}/></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Días Ausencias</p><p className="text-3xl font-black text-slate-800">{statsData.totalAbsences}d</p></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl"><ShieldAlert size={24}/></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Días de Baja</p><p className="text-3xl font-black text-slate-800">{statsData.totalBajas}d</p></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl"><Timer size={24}/></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Duración Media</p><p className="text-3xl font-black text-slate-800">{statsData.avgBajaDuration}d</p></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl"><Activity size={24}/></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">% Personal Efectivo</p><p className="text-3xl font-black text-slate-800">{statsData.efficiencyPerc}%</p></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><BarChart2 size={20} className="text-blue-500"/> Personal por Departamento</h4>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statsData.depts}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                <Bar dataKey="users" name="Empleados" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><Briefcase size={20} className="text-slate-400"/> Desglose de Departamento (Clic para ver detalle días)</h4>
                    <div className="flex-1 overflow-y-auto max-h-[400px] scrollbar-hide">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3">Departamento</th>
                                    <th className="px-4 py-3 text-center">Empleados</th>
                                    <th className="px-4 py-3 text-center">Bajas (d)</th>
                                    <th className="px-4 py-3 text-center">Total Aus. (d)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {statsData.depts.map(d => (
                                    <React.Fragment key={d.id}>
                                        <tr 
                                            onClick={() => setExpandedDept(expandedDept === d.id ? null : d.id)}
                                            className={`hover:bg-slate-50 transition-all cursor-pointer ${expandedDept === d.id ? 'bg-slate-50/50' : ''}`}
                                        >
                                            <td className="px-4 py-4 font-bold text-slate-700 flex items-center gap-2">
                                                {expandedDept === d.id ? <ChevronUp size={14} className="text-indigo-500"/> : <ChevronRight size={14} className="text-slate-300"/>}
                                                {d.name}
                                            </td>
                                            <td className="px-4 py-4 text-center font-black text-slate-400">{d.users}</td>
                                            <td className="px-4 py-4 text-center"><span className={`font-black ${d.bajas > 0 ? 'text-red-500 bg-red-50 px-2 py-0.5 rounded-lg' : 'text-slate-300'}`}>{d.bajas}d</span></td>
                                            <td className="px-4 py-4 text-center font-black text-blue-500">{d.absences}d</td>
                                        </tr>
                                        {expandedDept === d.id && (
                                            <tr className="bg-slate-50/30">
                                                <td colSpan={4} className="px-8 py-0 border-l-4 border-indigo-500">
                                                    <div className="max-h-60 overflow-y-auto">
                                                        <table className="w-full text-left text-[10px]">
                                                            <thead className="bg-slate-100 text-slate-500 font-black uppercase tracking-tighter">
                                                                <tr>
                                                                    <th className="px-4 py-2">Empleado</th>
                                                                    <th className="px-4 py-2 text-center">Días Ausencia</th>
                                                                    <th className="px-4 py-2 text-center">Días Baja</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-200 bg-white">
                                                                {d.employees.map(u => (
                                                                    <tr key={u.id} className="hover:bg-indigo-50/30 transition-colors">
                                                                        <td className="px-4 py-2.5 font-bold text-slate-800">{u.name}</td>
                                                                        <td className="px-4 py-2.5 text-center font-black text-slate-400">{u.absences > 0 ? `${u.absences}d` : '-'}</td>
                                                                        <td className="px-4 py-2.5 text-center font-black text-red-500">{u.bajas > 0 ? `${u.bajas}d` : '-'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Gestión de Departamentos (SUPERVISORES)
export const DepartmentManager = () => {
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!editingDept) return;
        setIsSaving(true);
        if (editingDept.id === 'new') {
            await store.createDepartment(editingDept.name, editingDept.supervisorIds);
        } else {
            await store.updateDepartment(editingDept.id, editingDept.name, editingDept.supervisorIds);
        }
        setIsSaving(false);
        setEditingDept(null);
    };

    const toggleSupervisor = (userId: string) => {
        if (!editingDept) return;
        const current = editingDept.supervisorIds || [];
        const newIds = current.includes(userId) 
            ? current.filter(id => id !== userId) 
            : [...current, userId];
        setEditingDept({ ...editingDept, supervisorIds: newIds });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Departamentos y Responsables</h3>
                <button 
                    onClick={() => setEditingDept({ id: 'new', name: '', supervisorIds: [] })}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
                >
                    <Plus size={16}/> Nuevo Departamento
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {store.departments.map(d => (
                    <div key={d.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group">
                        <div>
                            <h4 className="font-bold text-slate-700">{d.name}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                                {d.supervisorIds?.length || 0} Responsables
                            </p>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => setEditingDept(d)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={16}/></button>
                            <button onClick={() => store.deleteDepartment(d.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>

            {editingDept && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[130] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-scale-in">
                        <h3 className="text-xl font-bold text-slate-800 mb-6">{editingDept.id === 'new' ? 'Nuevo' : 'Editar'} Departamento</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Nombre</label>
                                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={editingDept.name} onChange={e => setEditingDept({...editingDept, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Responsables / Supervisores</label>
                                <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl p-2 space-y-1 bg-slate-50">
                                    {store.users.sort((a,b) => a.name.localeCompare(b.name)).map(u => (
                                        <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 text-blue-600 rounded" 
                                                checked={editingDept.supervisorIds.includes(u.id)}
                                                onChange={() => toggleSupervisor(u.id)}
                                            />
                                            <span className="text-sm font-medium text-slate-700">{u.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setEditingDept(null)} className="flex-1 py-3 text-slate-500 font-bold">Cancelar</button>
                                <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2">
                                    {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Configuración RRHH (Tipos de Ausencia, Festivos, etc.)
export const HRConfigManager = () => {
    const [editingType, setEditingType] = useState<LeaveTypeConfig | null>(null);
    const [newShift, setNewShift] = useState({ id: '', name: '', color: '#3b82f6', start: '08:00', end: '16:30' });
    const [newHoliday, setNewHoliday] = useState({ id: '', date: '', name: '' });

    const handleSaveType = async () => {
        if (!editingType) return;
        if (editingType.id.startsWith('temp_')) {
            await store.createLeaveType(editingType.label, editingType.subtractsDays, editingType.fixedRanges);
        } else {
            await store.updateLeaveType(editingType.id, editingType.label, editingType.subtractsDays, editingType.fixedRanges);
        }
        setEditingType(null);
    };

    const addRange = () => {
        if (!editingType) return;
        const newRanges = [...(editingType.fixedRanges || []), { startDate: '', endDate: '', label: 'Nuevo Periodo' }];
        setEditingType({ ...editingType, fixedRanges: newRanges });
    };

    const removeRange = (idx: number) => {
        if (!editingType) return;
        const newRanges = (editingType.fixedRanges || []).filter((_, i) => i !== idx);
        setEditingType({ ...editingType, fixedRanges: newRanges });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
            {/* TIPOS DE AUSENCIA */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tipos de Ausencia</h3>
                    <button onClick={() => setEditingType({ id: 'temp_' + Date.now(), label: '', subtractsDays: true, fixedRanges: [] })} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Plus size={18}/></button>
                </div>
                <div className="space-y-2">
                    {store.config.leaveTypes.map(t => (
                        <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm group">
                            <div>
                                <p className="font-bold text-sm text-slate-700">{t.label}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{t.subtractsDays ? 'Resta días' : 'No resta días'}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingType(t)} className="p-1.5 text-slate-400 hover:text-blue-500"><Edit2 size={14}/></button>
                                <button onClick={() => store.deleteLeaveType(t.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>

                {editingType && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center"><h4 className="font-bold text-slate-800 text-sm">Editar Tipo</h4><button onClick={() => setEditingType(null)}><X size={16}/></button></div>
                        <input className="w-full p-2.5 border rounded-xl text-sm" placeholder="Nombre (Ej: Vacaciones 2026)" value={editingType.label} onChange={e => setEditingType({...editingType, label: e.target.value})} />
                        <label className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-xl border border-slate-100">
                            <input type="checkbox" checked={editingType.subtractsDays} onChange={e => setEditingType({...editingType, subtractsDays: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                            <span className="text-xs font-bold text-slate-600">Resta días del saldo anual</span>
                        </label>
                        
                        <div className="pt-2 border-t border-slate-200">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Rangos Fijos / Turnos</span>
                                <button onClick={addRange} className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"><Plus size={14}/></button>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {(editingType.fixedRanges || []).map((range, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 text-[10px] space-y-2">
                                        <input className="w-full p-1.5 border-b outline-none font-bold" placeholder="Etiqueta (Ej: Junio)" value={range.label} onChange={e => {
                                            const newR = [...(editingType.fixedRanges || [])];
                                            newR[idx].label = e.target.value;
                                            setEditingType({...editingType, fixedRanges: newR});
                                        }} />
                                        <div className="flex gap-2">
                                            <input type="date" className="flex-1" value={range.startDate} onChange={e => {
                                                const newR = [...(editingType.fixedRanges || [])];
                                                newR[idx].startDate = e.target.value;
                                                setEditingType({...editingType, fixedRanges: newR});
                                            }} />
                                            <input type="date" className="flex-1" value={range.endDate} onChange={e => {
                                                const newR = [...(editingType.fixedRanges || [])];
                                                newR[idx].endDate = e.target.value;
                                                setEditingType({...editingType, fixedRanges: newR});
                                            }} />
                                            <button onClick={() => removeRange(idx)} className="text-red-400"><Trash2 size={12}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button onClick={handleSaveType} className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg">Guardar Tipo de Ausencia</button>
                    </div>
                )}
            </div>

            {/* TIPOS DE TURNO */}
            <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Turnos de Trabajo</h3>
                <div className="space-y-2">
                    {store.config.shiftTypes.map(s => (
                        <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm group">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: s.color}}></div>
                                <div>
                                    <span className="font-bold text-sm text-slate-700">{s.name}</span>
                                    <p className="text-[9px] text-slate-400 font-mono">{s.segments[0].start} - {s.segments[0].end}</p>
                                </div>
                            </div>
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setNewShift({ id: s.id, name: s.name, color: s.color, start: s.segments[0]?.start || '08:00', end: s.segments[0]?.end || '16:30' })} className="p-1.5 text-slate-300 hover:text-blue-500 bg-slate-50 rounded-lg"><Edit2 size={14}/></button>
                                <button onClick={() => store.deleteShiftType(s.id)} className="p-1.5 text-slate-300 hover:text-red-500 bg-slate-50 rounded-lg"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 mt-6">
                    <h4 className="font-bold text-slate-800 text-sm border-b pb-2">{newShift.id ? 'Editar Turno' : 'Crear Turno'}</h4>
                    <input className="w-full p-2.5 border rounded-xl text-sm" placeholder="Nombre Turno..." value={newShift.name} onChange={e=>setNewShift({...newShift, name: e.target.value})} />
                    <div className="flex gap-4">
                        <div className="flex-1"><label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Inicio</label><input type="time" className="w-full p-2 border rounded-lg text-xs" value={newShift.start} onChange={e=>setNewShift({...newShift, start: e.target.value})}/></div>
                        <div className="flex-1"><label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Fin</label><input type="time" className="w-full p-2 border rounded-lg text-xs" value={newShift.end} onChange={e=>setNewShift({...newShift, end: e.target.value})}/></div>
                        <div><label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Color</label><input type="color" className="h-8 w-12 border-none rounded-lg p-0 cursor-pointer" value={newShift.color} onChange={e=>setNewShift({...newShift, color: e.target.value})}/></div>
                    </div>
                    <div className="flex gap-2">
                        {newShift.id && <button onClick={() => setNewShift({id: '', name: '', color:'#3b82f6', start:'08:00', end:'16:30'})} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200">Cancelar</button>}
                        <button onClick={async () => { if(!newShift.name) return; if(newShift.id) await store.updateShiftType(newShift.id, newShift.name, newShift.color, newShift.start, newShift.end); else await store.createShiftType(newShift.name, newShift.color, newShift.start, newShift.end); setNewShift({id: '', name: '', color:'#3b82f6', start:'08:00', end:'16:30'}); }} className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">{newShift.id ? 'Actualizar Turno' : 'Guardar Turno'}</button>
                    </div>
                </div>
            </div>

            {/* FESTIVOS */}
            <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Festivos Nacionales</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {store.config.holidays.sort((a,b) => a.date.localeCompare(b.date)).map(h => (
                        <div key={h.id} className="bg-red-50/50 p-4 rounded-xl border border-red-100 flex justify-between items-center group">
                            <div><p className="text-[10px] font-black text-red-600 uppercase">{new Date(h.date).toLocaleDateString()}</p><p className="font-bold text-xs">{h.name}</p></div>
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setNewHoliday({ id: h.id, date: h.date, name: h.name })} className="p-1.5 text-red-400 hover:text-red-600 bg-white/50 rounded-lg"><Edit2 size={14}/></button>
                                <button onClick={() => store.deleteHoliday(h.id)} className="p-1.5 text-red-400 hover:text-red-700 bg-white/50 rounded-lg"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 mt-6">
                    <h4 className="font-bold text-slate-800 text-sm border-b pb-2">{newHoliday.id ? 'Editar Festivo' : 'Añadir Festivo'}</h4>
                    <input type="date" className="w-full p-2.5 border rounded-xl text-sm" value={newHoliday.date} onChange={e=>setNewHoliday({...newHoliday, date: e.target.value})} />
                    <input className="w-full p-2.5 border rounded-xl text-sm" placeholder="Nombre Festividad..." value={newHoliday.name} onChange={e=>setNewHoliday({...newHoliday, name: e.target.value})} />
                    <div className="flex gap-2">
                        {newHoliday.id && <button onClick={() => setNewHoliday({id: '', date:'', name:''})} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200">Cancelar</button>}
                        <button onClick={async () => { if(newHoliday.date && newHoliday.name) { if(newHoliday.id) await store.updateHoliday(newHoliday.id, newHoliday.date, newHoliday.name); else await store.createHoliday(newHoliday.date, newHoliday.name); setNewHoliday({id: '', date:'', name:''}); } }} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/30">{newHoliday.id ? 'Actualizar' : 'Añadir Festivo'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Gestión de Catálogo de EPIs y Stock
export const EPIManager = () => {
    const [view, setView] = useState<'catalog' | 'stock'>('catalog');
    const [editingPPE, setEditingPPE] = useState<PPEType | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [, setRefresh] = useState(0);

    // Suscripción al store para refrescar la vista cuando cambie el stock en la base de datos
    useEffect(() => {
        const unsubscribe = store.subscribe(() => setRefresh(prev => prev + 1));
        return unsubscribe;
    }, []);

    const handleSave = async () => {
        if (!editingPPE) return;
        setIsSaving(true);
        if (editingPPE.id === 'new') {
            await store.createPPEType(editingPPE.name, editingPPE.sizes);
        } else {
            await store.updatePPEType(editingPPE.id, editingPPE.name, editingPPE.sizes);
        }
        setEditingPPE(null);
        setIsSaving(false);
    };

    const handleUpdateStock = async (typeId: string, size: string, newQty: number) => {
        const type = store.config.ppeTypes.find(t => t.id === typeId);
        if (type) {
            const updatedStock = { ...(type.stock || {}) };
            updatedStock[size] = Math.max(0, newQty);
            await store.updatePPEStock(typeId, updatedStock);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl shrink-0">
                    <button onClick={() => setView('catalog')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${view === 'catalog' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Catálogo</button>
                    <button onClick={() => setView('stock')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${view === 'stock' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Control de Stock</button>
                </div>
                
                {view === 'catalog' && (
                    <button onClick={() => setEditingPPE({ id: 'new', name: '', sizes: ['S', 'M', 'L', 'XL'], stock: {} })} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20"><Plus size={16}/> Nuevo Material</button>
                )}
            </div>

            {view === 'catalog' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {store.config.ppeTypes.map(p => (
                        <div key={p.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 opacity-20"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-orange-50 p-2 rounded-xl text-orange-600"><HardHat size={20}/></div>
                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingPPE(p)} className="p-2 text-slate-400 hover:text-blue-500 bg-slate-50 rounded-lg"><Edit2 size={16}/></button>
                                    <button onClick={() => store.deletePPEType(p.id)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 rounded-lg"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <h4 className="font-bold text-slate-800 mb-4">{p.name}</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {p.sizes.map(s => (
                                    <span key={s} className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-black rounded border border-slate-100">{s}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase">
                            <tr>
                                <th className="px-6 py-4">Tipo de Material</th>
                                <th className="px-6 py-4">Tallas y Existencias Disponibles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {store.config.ppeTypes.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-700">{p.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                            {p.sizes.map(size => {
                                                const currentStock = p.stock?.[size] || 0;
                                                return (
                                                    <div key={size} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex flex-col items-center">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase mb-2">Talla {size}</span>
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => handleUpdateStock(p.id, size, currentStock - 1)}
                                                                className="p-1 text-slate-400 hover:text-red-500 bg-slate-50 rounded transition-colors"
                                                            >
                                                                <Minus size={14}/>
                                                            </button>
                                                            <span className={`w-8 text-center font-black text-lg ${currentStock <= 0 ? 'text-red-600' : currentStock < 5 ? 'text-orange-600' : 'text-green-600'}`}>
                                                                {currentStock}
                                                            </span>
                                                            <button 
                                                                onClick={() => handleUpdateStock(p.id, size, currentStock + 1)}
                                                                className="p-1 text-slate-400 hover:text-blue-500 bg-slate-50 rounded transition-colors"
                                                            >
                                                                <Plus size={14}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editingPPE && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[130] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-scale-in">
                        <h3 className="text-xl font-bold text-slate-800 mb-6">{editingPPE.id === 'new' ? 'Nuevo' : 'Editar'} Material EPI</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Nombre del Artículo</label>
                                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={editingPPE.name} onChange={e => setEditingPPE({...editingPPE, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Tallas / Medidas (Separadas por comas)</label>
                                <input 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" 
                                    value={editingPPE.sizes.join(', ')} 
                                    onChange={e => setEditingPPE({...editingPPE, sizes: e.target.value.split(',').map(s => s.trim())})} 
                                    placeholder="Ej: S, M, L, XL o 38, 40, 42..."
                                />
                                <p className="text-[9px] text-slate-400 mt-2 italic px-1">Al añadir tallas nuevas, aparecerán con stock 0 en la sección de control.</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setEditingPPE(null)} className="flex-1 py-3 text-slate-500 font-bold">Cancelar</button>
                                <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2">
                                    {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Gestión de Comunicaciones (Muro de anuncios, etc.)
export const CommunicationsManager = () => {
    // Muro
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    
    // Notificaciones Directas
    const [tab, setTab] = useState<'wall' | 'direct' | 'email'>('wall');
    const [directMsg, setDirectMsg] = useState('');
    
    // Plantillas
    const [templates, setTemplates] = useState<EmailTemplate[]>(store.config.emailTemplates || []);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    
    const [audience, setAudience] = useState<'all' | 'dept' | 'users'>('all');
    const [targetDeptId, setTargetDeptId] = useState('');
    const [targetUserIds, setTargetUserIds] = useState<string[]>([]);
    
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setTemplates(store.config.emailTemplates);
    }, [store.config.emailTemplates]);

    const handleCreatePost = async () => {
        if (!title.trim() || !content.trim()) return;
        setIsSaving(true);
        await store.createNewsPost(title, content, store.currentUser?.id || 'admin');
        setTitle('');
        setContent('');
        setIsSaving(false);
    };

    const handleSendDirect = async () => {
        if (!directMsg.trim()) return;
        setIsSaving(true);
        
        let uids: string[] = [];
        if (audience === 'all') {
            uids = store.users.map(u => u.id);
        } else if (audience === 'dept') {
            if (!targetDeptId) { setIsSaving(false); return; }
            uids = store.users.filter(u => u.departmentId === targetDeptId).map(u => u.id);
        } else {
            if (targetUserIds.length === 0) { setIsSaving(false); return; }
            uids = targetUserIds;
        }

        await store.sendAdminNotification(directMsg, uids);
        setDirectMsg('');
        setTargetUserIds([]);
        setIsSaving(false);
        alert(`Notificación enviada a ${uids.length} usuarios.`);
    };

    const handleSaveTemplate = async () => {
        if (!editingTemplate) return;
        let newTemplates = [...templates];
        const idx = newTemplates.findIndex(t => t.id === editingTemplate.id);
        if (idx >= 0) {
            newTemplates[idx] = editingTemplate;
        } else {
            newTemplates.push(editingTemplate);
        }
        
        setIsSaving(true);
        try {
            await store.saveEmailTemplates(newTemplates);
            setEditingTemplate(null);
        } catch (e) {
            alert("Error al guardar plantillas");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleUserSelection = (uid: string) => {
        setTargetUserIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
    };

    return (
        <div className="space-y-4 animate-fade-in pb-12">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl self-start mb-4">
                <button 
                    onClick={() => setTab('wall')} 
                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${tab === 'wall' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Muro de Anuncios
                </button>
                <button 
                    onClick={() => setTab('direct')} 
                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${tab === 'direct' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Notificaciones Pop-up
                </button>
                <button 
                    onClick={() => setTab('email')} 
                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${tab === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Plantillas de Email
                </button>
            </div>

            {tab === 'wall' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-fit">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><Megaphone size={20} className="text-blue-500"/> Crear Comunicado en el Muro</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Título del Anuncio</label>
                                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Nueva política de vestuario..." />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Contenido del Mensaje</label>
                                <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32" value={content} onChange={e => setContent(e.target.value)} placeholder="Escribe aquí el mensaje para todos los empleados..." />
                            </div>
                            <button onClick={handleCreatePost} disabled={isSaving} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2 transition-all">
                                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                                Publicar Anuncio
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><History size={20} className="text-slate-400"/> Historial de Anuncios</h4>
                        <div className="space-y-4">
                            {store.config.news.length === 0 ? (
                                <p className="text-center text-slate-400 italic py-4">No hay anuncios publicados.</p>
                            ) : store.config.news.map(post => (
                                <div key={post.id} className="flex justify-between items-start p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                                    <div className="flex-1">
                                        <h5 className="font-bold text-slate-800">{post.title}</h5>
                                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{post.content}</p>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase mt-2 block">{new Date(post.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <button onClick={() => store.deleteNewsPost(post.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : tab === 'direct' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-fit">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="font-bold text-slate-800 flex items-center gap-2"><Bell size={20} className="text-indigo-500"/> Notificación Pop-up</h4>
                            <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-black uppercase tracking-tighter">Aparece al abrir la App</span>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-3 ml-1">¿A quién quieres avisar?</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setAudience('all')} className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all ${audience === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>Todos</button>
                                    <button onClick={() => setAudience('dept')} className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all ${audience === 'dept' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>Departamento</button>
                                    <button onClick={() => setAudience('users')} className={`py-3 rounded-xl border text-[10px) font-black uppercase tracking-tighter transition-all ${audience === 'users' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>Seleccionar</button>
                                </div>
                            </div>

                            {audience === 'dept' && (
                                <div className="animate-fade-in">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Elegir Departamento</label>
                                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={targetDeptId} onChange={e => setTargetDeptId(e.target.value)}>
                                        <option value="">Selecciona un departamento...</option>
                                        {store.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {audience === 'users' && (
                                <div className="animate-fade-in">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Elegir Usuarios ({targetUserIds.length})</label>
                                    <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-2xl p-2 bg-slate-50 space-y-1">
                                        {store.users.map(u => (
                                            <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer transition-colors">
                                                <input type="checkbox" checked={targetUserIds.includes(u.id)} onChange={() => toggleUserSelection(u.id)} className="w-4 h-4 text-indigo-600 rounded border-slate-200" />
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700">{u.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{store.departments.find(d => d.id === u.departmentId)?.name}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Mensaje para el Pop-up</label>
                                <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm h-32 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" value={directMsg} onChange={e => setDirectMsg(e.target.value)} placeholder="Ej: Por favor, pasad por oficina para recoger los nuevos carnets..." />
                            </div>

                            <button onClick={handleSendDirect} disabled={isSaving} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/30 flex justify-center items-center gap-2 transition-all hover:bg-indigo-700 active:scale-[0.98]">
                                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                                Enviar Notificación Inmediata
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                            <Megaphone size={30} />
                        </div>
                        <h4 className="font-bold text-slate-700 mb-2">Consejos de Comunicación</h4>
                        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                            Las **notificaciones directas** se muestran como un aviso emergente que el usuario debe marcar como leído. Utilízalas para avisos críticos o urgentes. Para información general, usa el **Muro de Anuncios**.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><Mail size={20} className="text-blue-500"/> Notificaciones por Email</h4>
                        <div className="space-y-4">
                            {templates.map(t => (
                                <div key={t.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
                                    <div>
                                        <p className="font-bold text-slate-800">{t.label}</p>
                                        <p className="text-[10px] text-slate-400 font-black uppercase">{t.subject}</p>
                                    </div>
                                    <button onClick={() => setEditingTemplate(t)} className="p-2 bg-white text-blue-600 rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all"><Edit2 size={16}/></button>
                                </div>
                            ))}
                            <button 
                                onClick={() => setEditingTemplate({ id: crypto.randomUUID(), label: 'Nueva Plantilla', subject: '', body: '', recipients: { worker: true, supervisor: false, admin: false } })}
                                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-xs flex justify-center items-center gap-2 hover:bg-slate-50 transition-all"
                            >
                                <Plus size={16}/> Añadir Nueva Plantilla
                            </button>
                        </div>
                    </div>

                    <div>
                        {editingTemplate ? (
                            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-slate-800">Editando: {editingTemplate.label}</h4>
                                    <button onClick={() => setEditingTemplate(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Etiqueta de la Plantilla</label>
                                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={editingTemplate.label} onChange={e => setEditingTemplate({...editingTemplate, label: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Asunto del Email</label>
                                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={editingTemplate.subject} onChange={e => setEditingTemplate({...editingTemplate, subject: e.target.value})} placeholder="Ej: Su solicitud ha sido aprobada" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Cuerpo del Mensaje</label>
                                        <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-48 focus:ring-2 focus:ring-blue-100 outline-none" value={editingTemplate.body} onChange={e => setEditingTemplate({...editingTemplate, body: e.target.value})} placeholder="Hola {{nombre}}, tu solicitud para {{fecha}} ha sido..." />
                                        <p className="text-[9px] text-slate-400 mt-2 italic">Variables disponibles: {"{{nombre}}, {{fecha}}, {{estado}}, {{comentario}}"}</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-3 ml-1">¿Quién recibe este aviso?</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input type="checkbox" checked={editingTemplate.recipients.worker} onChange={e => setEditingTemplate({...editingTemplate, recipients: {...editingTemplate.recipients, worker: e.target.checked}})} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="text-xs font-bold text-slate-600">Empleado</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input type="checkbox" checked={editingTemplate.recipients.supervisor} onChange={e => setEditingTemplate({...editingTemplate, recipients: {...editingTemplate.recipients, supervisor: e.target.checked}})} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="text-xs font-bold text-slate-600">Supervisor</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input type="checkbox" checked={editingTemplate.recipients.admin} onChange={e => setEditingTemplate({...editingTemplate, recipients: {...editingTemplate.recipients, admin: e.target.checked}})} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="text-xs font-bold text-slate-600">Admin</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button onClick={() => {
                                            if (confirm('¿Eliminar esta plantilla?')) {
                                                const newT = templates.filter(t => t.id !== editingTemplate.id);
                                                store.saveEmailTemplates(newT);
                                                setEditingTemplate(null);
                                            }
                                        }} className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-red-100 transition-all">
                                            <Trash2 size={18}/> Eliminar
                                        </button>
                                        <button onClick={handleSaveTemplate} disabled={isSaving} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2 hover:bg-blue-700 transition-all">
                                            {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Guardar Plantilla
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 p-12 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                                    <Mail size={40} />
                                </div>
                                <h4 className="font-bold text-slate-800 mb-2">Configuración de Avisos</h4>
                                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                                    Selecciona una plantilla para editar su contenido o crea una nueva. Estos emails se enviarán automáticamente según el selector de destinatarios configurado.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Consultas de Ausencias y Horas Extra
export const AbsenceQueryManager = () => {
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [queryMode, setQueryMode] = useState<'absences' | 'overtime'>('absences');
    const [results, setResults] = useState<any[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const handleQuery = () => {
        if (!start || !end) {
            alert("Por favor, selecciona un rango de fechas completo.");
            return;
        }
        
        const filtered = store.requests.filter(req => {
            // Solo aprobadas
            if (req.status !== RequestStatus.APPROVED) return false;
            
            // EXCLUIR REGULARIZACIONES
            if (req.typeId === RequestType.ADJUSTMENT_DAYS || req.typeId === RequestType.ADJUSTMENT_OVERTIME) return false;
            
            const isOvertime = store.isOvertimeRequest(req.typeId);
            const isDayOffExchange = req.typeId === RequestType.OVERTIME_SPEND_DAYS;
            
            if (queryMode === 'absences') {
                // Queremos: Bajas médicas, Vacaciones, Asuntos Propios, Ausencias justificables y Canjes por días
                if (isOvertime && !isDayOffExchange) return false;
            } else {
                // Queremos solo registros de horas extra (incluidos festivos trabajados, abonos, etc)
                if (!isOvertime) return false;
                // SOLO POSITIVAS para saber cuántas extras han registrado (devengado)
                if ((req.hours || 0) <= 0) return false;
            }
            
            const rStart = req.startDate.split('T')[0];
            const rEnd = (req.endDate || req.startDate).split('T')[0];
            
            // Lógica de solapamiento de fechas
            return rStart <= end && rEnd >= start;
        }).map(req => {
            const u = store.users.find(usr => usr.id === req.userId);
            return { ...req, user: u };
        });

        setResults(filtered);
        setHasSearched(true);
    };

    const handlePrint = () => {
        window.print();
    };

    // Agrupación para Ausencias (NUEVO)
    const groupedAbsences = useMemo(() => {
        if (queryMode !== 'absences') return [];
        const groups: Record<string, { user: any, items: any[], totalDays: number }> = {};
        
        results.forEach(req => {
            const userId = req.userId;
            if (!groups[userId]) {
                groups[userId] = { user: req.user, items: [], totalDays: 0 };
            }

            // Cálculo de días en el rango para este registro específico
            const rStart = req.startDate.split('T')[0];
            const rEnd = (req.endDate || req.startDate).split('T')[0];
            const overlapStartStr = rStart > start ? rStart : start;
            const overlapEndStr = rEnd < end ? rEnd : end;
            const d1 = new Date(overlapStartStr);
            const d2 = new Date(overlapEndStr);
            d1.setHours(0,0,0,0); d2.setHours(0,0,0,0);
            const daysInRange = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            groups[userId].items.push({ ...req, daysInRange });
            groups[userId].totalDays += daysInRange;
        });

        return Object.values(groups).sort((a, b) => a.user?.name.localeCompare(b.user?.name));
    }, [results, queryMode, start, end]);

    // Agrupación para Horas Extra (Árbol)
    const groupedOvertime = useMemo(() => {
        if (queryMode !== 'overtime') return [];
        const groups: Record<string, { user: any, items: any[], total: number }> = {};
        
        results.forEach(req => {
            const userId = req.userId;
            if (!groups[userId]) {
                groups[userId] = { user: req.user, items: [], total: 0 };
            }
            groups[userId].items.push(req);
            groups[userId].total += (req.hours || 0);
        });

        return Object.values(groups).sort((a, b) => a.user?.name.localeCompare(b.user?.name));
    }, [results, queryMode]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col gap-6 print:hidden">
                <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-xl self-start">
                    <button 
                        onClick={() => { setQueryMode('absences'); setResults([]); setHasSearched(false); }}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${queryMode === 'absences' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Palmtree size={14}/> Ausencias
                    </button>
                    <button 
                        onClick={() => { setQueryMode('overtime'); setResults([]); setHasSearched(false); }}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${queryMode === 'overtime' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Timer size={14}/> Horas Extra
                    </button>
                </div>

                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Fecha Inicial</label>
                        <input 
                            type="date" 
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                            value={start} 
                            onChange={e => setStart(e.target.value)} 
                        />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Fecha Final</label>
                        <input 
                            type="date" 
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                            value={end} 
                            onChange={e => setEnd(e.target.value)} 
                        />
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleQuery} 
                            className={`px-8 py-3 ${queryMode === 'absences' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold rounded-xl text-sm shadow-lg transition-all flex items-center gap-2`}
                        >
                            <Search size={18}/> Consultar
                        </button>
                        {hasSearched && results.length > 0 && (
                            <button 
                                onClick={handlePrint} 
                                className="px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                            >
                                <Printer size={18}/> Imprimir
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {hasSearched && results.length > 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in-up">
                    <div className={`p-6 border-b border-slate-50 ${queryMode === 'absences' ? 'bg-blue-50/30' : 'bg-indigo-50/30'} flex justify-between items-center print:bg-white`}>
                        <h4 className="font-bold text-slate-800">
                            {queryMode === 'absences' ? 'Informe de Ausencias y Bajas' : 'Informe Detallado de Horas Extra (Devengadas)'}
                        </h4>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Rango: {new Date(start).toLocaleDateString()} al {new Date(end).toLocaleDateString()}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                                <tr>
                                    <th className="px-6 py-4">{queryMode === 'overtime' ? 'Material / Acción' : 'Empleado / Departamento'}</th>
                                    <th className="px-6 py-4">{queryMode === 'overtime' ? 'Motivo' : 'Tipo de Registro'}</th>
                                    <th className="px-6 py-4">Periodo / Fecha</th>
                                    {queryMode === 'overtime' ? (
                                        <th className="px-6 py-4 text-center">Horas</th>
                                    ) : (
                                        <th className="px-6 py-4 text-center">Días en Rango</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {queryMode === 'absences' ? (
                                    groupedAbsences.map(group => (
                                        <React.Fragment key={group.user?.id}>
                                            <tr className="bg-blue-900 text-white">
                                                <td colSpan={3} className="px-6 py-3">
                                                    <div className="flex items-center gap-4">
                                                        <img src={group.user?.avatar} className="w-10 h-10 rounded-xl border-2 border-white/20 object-cover" />
                                                        <div>
                                                            <div className="font-black uppercase tracking-tight text-base leading-tight">{group.user?.name}</div>
                                                            <div className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">
                                                                {store.departments.find(d => d.id === group.user?.departmentId)?.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-center bg-blue-950">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-2xl font-black text-white leading-none">{group.totalDays}</span>
                                                        <span className="text-[8px] font-black uppercase text-blue-300 tracking-tighter">Días totales</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {group.items.sort((a,b) => a.startDate.localeCompare(b.startDate)).map(req => (
                                                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-3 pl-14">
                                                        <div className="flex items-center gap-2">
                                                            <ChevronRight size={14} className="text-slate-300" />
                                                            <span className={`px-2 py-1 rounded-lg font-bold text-[10px] uppercase border ${
                                                                req.typeId === RequestType.SICKNESS 
                                                                    ? 'bg-red-50 text-red-600 border-red-100' 
                                                                    : req.typeId === RequestType.OVERTIME_SPEND_DAYS 
                                                                        ? 'bg-purple-50 text-purple-600 border-purple-100'
                                                                        : 'bg-blue-50 text-blue-600 border-blue-100'
                                                            }`}>
                                                                {store.getTypeLabel(req.typeId)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 italic text-slate-400 text-xs">
                                                        {req.reason || 'S/M'}
                                                    </td>
                                                    <td className="px-6 py-3 text-slate-600 font-medium">
                                                        {new Date(req.startDate).toLocaleDateString()} {req.endDate && req.endDate !== req.startDate ? `- ${new Date(req.endDate).toLocaleDateString()}` : ''}
                                                    </td>
                                                    <td className="px-6 py-3 text-center font-black text-blue-700 bg-blue-50/20">
                                                        {req.daysInRange}d
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    groupedOvertime.map(group => (
                                        <React.Fragment key={group.user?.id}>
                                            <tr className="bg-indigo-900 text-white">
                                                <td colSpan={3} className="px-6 py-3">
                                                    <div className="flex items-center gap-4">
                                                        <img src={group.user?.avatar} className="w-10 h-10 rounded-xl border-2 border-white/20 object-cover" />
                                                        <div>
                                                            <div className="font-black uppercase tracking-tight text-base leading-tight">{group.user?.name}</div>
                                                            <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">
                                                                {store.departments.find(d => d.id === group.user?.departmentId)?.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-center bg-indigo-950">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-2xl font-black text-white leading-none">{group.total.toFixed(1)}</span>
                                                        <span className="text-[8px] font-black uppercase text-indigo-300 tracking-tighter">Horas totales</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {group.items.sort((a,b) => a.startDate.localeCompare(b.startDate)).map(req => (
                                                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-3 pl-14">
                                                        <div className="flex items-center gap-2">
                                                            <ChevronRight size={14} className="text-slate-300" />
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                                                                req.typeId === RequestType.OVERTIME_EARN ? 'bg-green-50 text-green-600 border-green-100' :
                                                                req.typeId === RequestType.WORKED_HOLIDAY ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                                'bg-red-50 text-red-600 border-red-100'
                                                            }`}>
                                                                {store.getTypeLabel(req.typeId)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 italic text-slate-400 text-xs">
                                                        {req.reason || 'S/M'}
                                                    </td>
                                                    <td className="px-6 py-3 text-slate-600 font-medium">
                                                        {new Date(req.startDate).toLocaleDateString()}
                                                    </td>
                                                    <td className={`px-6 py-3 text-center font-black ${req.hours > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {req.hours > 0 ? `+${req.hours}` : req.hours}h
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                            {queryMode === 'overtime' && (
                                <tfoot className="bg-slate-50 font-black">
                                    <tr>
                                        <td colSpan={3} className="px-6 py-4 text-right text-slate-500 uppercase text-[10px]">Suma Total Global en Rango:</td>
                                        <td className="px-6 py-4 text-center text-indigo-700 text-lg">
                                            {results.reduce((sum, r) => sum + (r.hours || 0), 0).toFixed(1)}h
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            ) : (
                hasSearched && (
                    <div className="bg-white p-20 text-center rounded-3xl border border-dashed text-slate-400 italic animate-fade-in">
                        <AlertTriangle className="mx-auto mb-4 opacity-20" size={48} />
                        No se han encontrado {queryMode === 'absences' ? 'ausencias aprobadas' : 'registros de horas'} en el rango seleccionado.
                    </div>
                )
            )}
            
            {!hasSearched && (
                <div className="bg-white p-20 text-center rounded-3xl border border-dashed text-slate-300 italic flex flex-col items-center gap-4">
                    <Calendar size={64} className="opacity-10" />
                    <p className="max-w-xs mx-auto">Selecciona un rango de fechas arriba para generar el informe de {queryMode === 'absences' ? 'personal ausente o de baja' : 'actividad de horas extra'}.</p>
                </div>
            )}
        </div>
    );
};

// Mantenimiento
export const MaintenanceManager = () => {
    const [isRepairing, setIsRepairing] = useState(false);

    const handleRepair = async () => {
        if (confirm('¿Deseas sincronizar la trazabilidad de horas extra? Esto corregirá registros antiguos marcándolos como consumidos si están vinculados a solicitudes aprobadas.')) {
            setIsRepairing(true);
            await store.repairOvertimeIntegrity();
            setIsRepairing(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-blue-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Database size={120} /></div>
                <h4 className="text-xl font-bold mb-4">Punto de Restauración y Backup</h4>
                <div className="flex gap-4">
                    <button className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"><Download size={18}/> Exportar JSON</button>
                    <button className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"><Upload size={18}/> Importar Backup</button>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><RotateCcw size={20} className="text-orange-500"/> Integridad de Datos</h4>
                <p className="text-sm text-slate-500 mb-6">Si detectas que a algunos empleados les siguen apareciendo registros de horas extra que ya deberían estar consumidos, usa esta herramienta para sincronizar la base de datos.</p>
                <button 
                    onClick={handleRepair} 
                    disabled={isRepairing}
                    className="bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-100 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {isRepairing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18}/>}
                    Sincronizar Trazabilidad de Horas
                </button>
            </div>
        </div>
    );
};