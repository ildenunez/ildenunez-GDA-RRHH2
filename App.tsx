import React, { Component, useState, useEffect, ReactNode, ErrorInfo } from 'react';
import { store } from './services/store';
import { User, Role, LeaveRequest, Notification } from './types';
import Dashboard from './components/Dashboard';
import { Approvals, UserManagement, UpcomingAbsences, AdminSettings } from './components/Management';
import CalendarView from './components/CalendarView';
import NotificationsView from './components/NotificationsView';
import ProfileView from './components/ProfileView';
import RequestDetailModal from './components/RequestDetailModal';
import RequestFormModal from './components/RequestFormModal';
import HelpView from './components/HelpView';
import PPEView from './components/PPEView';
import RepartidoresView from './components/RepartidoresView';
import UnreadNotificationsModal from './components/UnreadNotificationsModal';
import { 
  LayoutDashboard, 
  CalendarDays, 
  ShieldCheck, 
  Users as UsersIcon, 
  Settings, 
  LogOut, 
  Menu, 
  Bell,
  Plus,
  Info,
  Loader2,
  ArrowRight,
  HelpCircle,
  HardHat,
  CalendarClock,
  AlertTriangle,
  Truck,
  ShieldAlert,
  ArrowUpRight,
  Clock
} from 'lucide-react';

const LOGO_URL = "https://termosycalentadoresgranada.com/wp-content/uploads/2025/08/https___cdn.evbuc_.com_images_677236879_73808960223_1_original.png";

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("React Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md border border-red-100">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={32}/>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Algo salió mal</h2>
                <p className="text-slate-500 mb-6 text-sm">Ha ocurrido un error inesperado al cargar esta sección. Por favor, intenta recargar la página.</p>
                <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/30">
                    Recargar Página
                </button>
            </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const Login = ({ onLogin }: { onLogin: (u: User) => void }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
        await store.init();
        const user = await store.login(email, pass);
        if (user) {
            onLogin(user);
        } else setError('Credenciales inválidas.');
    } catch (e) { 
        console.error(e);
        setError('Error de conexión.'); 
    } finally { 
        setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1950&q=80")' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-indigo-900" />
      
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative w-full max-w-md p-1 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] border border-white/10 animate-fade-in-up">
        <div className="bg-white/80 backdrop-blur-md rounded-[2.2rem] p-10 shadow-inner">
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-xl mx-auto mb-6 flex items-center justify-center p-5 border border-slate-100 group hover:scale-105 transition-transform duration-500">
               <img src={LOGO_URL} alt="GdA RRHH" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">GdA <span className="text-indigo-600">RRHH</span></h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Portal del Empleado</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <input type="email" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-400" placeholder="Email corporativo" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="relative group">
                <input type="password" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-400" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} />
              </div>
            </div>
            {error && <div className="text-red-600 text-xs font-bold flex items-center gap-2 bg-red-50 p-4 rounded-2xl border border-red-100 animate-shake"><Info size={16} className="shrink-0"/> {error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-black py-4.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)] flex justify-center items-center gap-3 hover:bg-indigo-700 hover:shadow-indigo-500/40 active:scale-[0.98] transition-all duration-300">
              {loading ? <Loader2 className="animate-spin"/> : <>Entrar <ArrowRight size={20}/></>}
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Desarrollado por Ilde Núñez</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'absence' | 'overtime'>('absence');
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [viewingRequest, setViewingRequest] = useState<LeaveRequest | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  
  const [unreadToModal, setUnreadToModal] = useState<Notification | null>(null);
  const [showSupervisorReminder, setShowSupervisorReminder] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);

  useEffect(() => {
    // Force Inter Font with absolute priority
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@1..900&display=swap');
      * {
        font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
      }
      h1, h2, h3, h4, h5, h6 {
        font-family: 'Inter', system-ui, sans-serif !important;
        font-weight: 800 !important;
      }
    `;
    document.head.appendChild(style);
    
    const initApp = async () => {
        try {
          await store.init();
          if (store.currentUser) {
              setUser({ ...store.currentUser });
          }
        } catch(e) { console.error("App Init Error:", e); }
        finally { setInitializing(false); }
    };
    initApp();

    const unsubscribe = store.subscribe(() => {
        setRefresh(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
        setUser({ ...store.currentUser! });
    }
  }, [refresh]);

  useEffect(() => {
    if (user && !unreadToModal) {
      const allNotifs = store.getNotificationsForUser(user.id);
      const firstAdminUnread = allNotifs.find(n => !n.read && (n.type === 'admin' || n.message.startsWith('[ADMIN]')));
      if (firstAdminUnread) {
        setUnreadToModal(firstAdminUnread);
      }
    }
  }, [user, user?.id, store.notifications]);

  useEffect(() => {
    if (user && !initializing && !reminderDismissed) {
      const isSupervisor = user.role === Role.SUPERVISOR || user.role === Role.ADMIN;
      if (isSupervisor) {
        const pendingCount = store.getPendingApprovalsForUser(user.id).length;
        if (pendingCount > 0) {
          setShowSupervisorReminder(true);
        }
      }
    }
  }, [user, initializing, reminderDismissed]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    store.refresh();
  };

  if (initializing) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin text-blue-500 w-12 h-12" />
    </div>
  );

  if (!user) return <Login onLogin={setUser} />;

  const handleLogout = () => {
      store.logout();
      setUser(null);
      setReminderDismissed(false); // Reset para el próximo login
  };

  const isSupervisor = user.role === Role.SUPERVISOR || user.role === Role.ADMIN;
  const isAdmin = user.role === Role.ADMIN;
  
  const pendingCount = isSupervisor ? store.getPendingApprovalsForUser(user.id).length : 0;
  const unreadCount = store.getNotificationsForUser(user.id).filter(n => !n.read).length;

  const NavItem = ({ id, icon: Icon, label, badgeCount }: any) => (
    <button onClick={() => handleTabChange(id)} className={`w-full flex items-center justify-between px-6 py-3.5 rounded-2xl transition-all duration-300 group ${activeTab === id ? 'bg-white/10 text-white shadow-xl shadow-black/10' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
      <div className="flex items-center space-x-3">
        <Icon size={18} className={activeTab === id ? 'text-white' : 'text-white/60 group-hover:text-white'} />
        <span className="text-[14px] font-medium tracking-tight whitespace-nowrap">{label}</span>
      </div>
      {badgeCount > 0 && <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{badgeCount}</span>}
    </button>
  );

  return (
    <div className="flex h-screen h-[100dvh] bg-[#F8FAFC] overflow-hidden font-sans selection:bg-brand-100 selection:text-brand-900">
      <aside className={`fixed top-0 bottom-0 left-0 z-50 w-52 bg-[#0F172A] transition-transform duration-500 md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl print:hidden`}>
        <div className="p-8 flex flex-col items-center shrink-0">
            <div className="w-20 h-20 bg-white rounded-3xl p-3 flex items-center justify-center shadow-lg mb-4">
               <img src={LOGO_URL} className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-white">GdA <span className="text-blue-400">RRHH</span></h1>
        </div>
        
        <nav className="px-4 space-y-1.5 flex-1 overflow-y-auto min-h-0 scrollbar-hide pt-4">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="calendar" icon={CalendarDays} label="Calendario" />
          <NavItem id="notifications" icon={Bell} label="Notificaciones" badgeCount={unreadCount} />
          <NavItem id="epis" icon={HardHat} label="EPIS" />
          
          {isSupervisor && (
            <>
              <div className="pt-8 pb-2 px-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Reparto</div>
              <NavItem id="repartidores" icon={Truck} label="Repartidores" />
              
              <div className="pt-8 pb-2 px-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Gestión</div>
              <NavItem id="upcoming" icon={CalendarClock} label="Próximas Ausencias" />
              <NavItem id="approvals" icon={ShieldCheck} label="Aprobaciones" badgeCount={pendingCount} />
              <NavItem id="team" icon={UsersIcon} label="Mi Equipo" />
            </>
          )}
        </nav>

        <div className="p-4 shrink-0 mt-auto space-y-1 border-t border-white/5 pt-6">
          {isAdmin && <NavItem id="settings" icon={Settings} label="Ajustes" />}
          <NavItem id="help" icon={HelpCircle} label="Ayuda" />
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-6 py-3.5 rounded-2xl text-white/60 hover:text-rose-400 hover:bg-rose-500/10 transition-all mt-2 group leading-tight">
            <LogOut size={18} />
            <span className="text-[14px] font-medium font-sans">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-52 flex flex-col h-screen h-[100dvh] relative transition-all duration-300">
        <header className="h-20 flex items-center justify-between px-10 z-30 shrink-0 print:hidden bg-[#F8FAFC]">
          <div className="flex items-center gap-6 flex-1">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-3 text-slate-600 bg-white shadow-sm rounded-xl border border-slate-100"><Menu size={20}/></button>
            <div className="relative max-w-sm w-full hidden md:block">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                 <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M12.9 14.32a8 8 0 1 1 1.41-1.41l5.35 5.33-1.42 1.42-5.33-5.34zM8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12z"/></svg>
               </div>
               <input type="text" placeholder="Buscar..." className="block w-full pl-11 pr-4 py-3 bg-slate-100 border-none rounded-2xl text-sm font-medium text-slate-600 placeholder-slate-400 focus:ring-2 focus:ring-brand shadow-inner" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="p-2 text-slate-400 hover:text-brand cursor-pointer transition-colors hidden sm:block">
              <HelpCircle size={22} />
            </div>
            
            <div className="flex items-center gap-4 pl-6 border-l border-slate-200 cursor-pointer group" onClick={() => handleTabChange('profile')}>
              <div className="flex flex-col items-end text-right">
                <span className="text-[13px] font-black text-slate-800 leading-tight">{user.name}</span>
                <span className="text-[11px] font-bold text-slate-400 leading-tight">
                  {store.departments.find(d => d.id === user.departmentId)?.name || 'Sin Departamento'}
                </span>
              </div>
              <div className="relative">
                <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-slate-100 group-hover:border-brand transition-all object-cover shadow-sm" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#F8FAFC] rounded-full" />
              </div>
            </div>
          </div>
        </header>

        <div className={`flex-1 overflow-auto px-10 pb-10 ${viewingRequest ? 'print:hidden' : ''}`}>
           <div className="max-w-[1600px] mx-auto min-h-full">
             <ErrorBoundary>
               {activeTab === 'dashboard' && <Dashboard user={user} onNewRequest={t => {setModalInitialTab(t); setShowRequestModal(true);}} onEditRequest={r => {setEditingRequest(r); setShowRequestModal(true);}} onViewRequest={setViewingRequest} />}
               {activeTab === 'calendar' && <CalendarView user={user} />}
               {activeTab === 'notifications' && <NotificationsView user={user} />}
               {activeTab === 'profile' && <ProfileView user={user} onProfileUpdate={() => setUser({...store.currentUser!})} />}
               {activeTab === 'approvals' && <Approvals user={user} onViewRequest={setViewingRequest} />}
               {activeTab === 'team' && <UserManagement currentUser={user} onViewRequest={setViewingRequest} />}
               {activeTab === 'upcoming' && <UpcomingAbsences user={user} onViewRequest={setViewingRequest} />}
               {activeTab === 'epis' && <PPEView user={user} />}
               {activeTab === 'repartidores' && <RepartidoresView user={user} />}
               {activeTab === 'settings' && isAdmin && <AdminSettings onViewRequest={setViewingRequest} />}
               {activeTab === 'help' && <HelpView />}
             </ErrorBoundary>
              </div>
        </div>
        {showRequestModal && <RequestFormModal onClose={() => { setShowRequestModal(false); store.refresh(); }} user={user} initialTab={modalInitialTab} editingRequest={editingRequest} />}
        {viewingRequest && <RequestDetailModal request={viewingRequest} onClose={() => setViewingRequest(null)} />}
        {unreadToModal && <UnreadNotificationsModal notification={unreadToModal} onClose={() => setUnreadToModal(null)} />}
        
        {/* Modal Recordatorio para Supervisores */}
        {showSupervisorReminder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in border border-blue-100">
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <ShieldAlert size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Tareas Pendientes</h3>
                <p className="text-slate-500 mb-8">
                  Hola <span className="font-bold text-slate-700">{user.name}</span>, tienes <span className="text-blue-600 font-black text-lg">{pendingCount}</span> solicitudes de tu equipo esperando ser revisadas.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => { setShowSupervisorReminder(false); setReminderDismissed(true); handleTabChange('approvals'); }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 group"
                   >
                    Ir a Aprobaciones
                    <ArrowUpRight size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => { setShowSupervisorReminder(false); setReminderDismissed(true); }}
                    className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                  >
                    Revisar más tarde
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}