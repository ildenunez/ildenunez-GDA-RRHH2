import React from 'react';
import { LeaveRequest, RequestStatus, Role, RequestType } from '../types';
import { store } from '../services/store';
import { X, Printer, Calendar, Clock, FileText, CheckCircle, XCircle, AlertCircle, User as UserIcon, MessageSquare, UserCheck, Save, ChevronRight } from 'lucide-react';

interface RequestDetailModalProps {
  request: LeaveRequest;
  onClose: () => void;
}

const RequestDetailModal: React.FC<RequestDetailModalProps> = ({ request, onClose }) => {
  const user = store.users.find(u => u.id === request.userId);
  const dept = user ? store.departments.find(d => d.id === user.departmentId) : null;
  
  // Buscar quién resolvió la solicitud
  const approver = request.resolvedBy ? store.users.find(u => u.id === request.resolvedBy) : null;

  // Trazabilidad de las horas vinculadas a registros específicos
  const usageDetails = request.overtimeUsage?.map(usage => {
      const sourceReq = store.requests.find(r => r.id === usage.requestId);
      return {
          ...usage,
          sourceDate: sourceReq?.startDate,
          sourceReason: sourceReq?.reason
      };
  }) || [];

  // Calcular si hay horas que provienen del saldo histórico (no vinculadas a un ID de solicitud)
  const totalTracedHours = usageDetails.reduce((sum, u) => sum + u.hoursUsed, 0);
  const untracedHours = Math.max(0, (request.hours || 0) - totalTracedHours);
  const [editedHours, setEditedHours] = React.useState(request.hours || 0);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const canManage = store.currentUser?.role === Role.ADMIN || store.currentUser?.role === Role.SUPERVISOR;
  const isPending = request.status === RequestStatus.PENDING;
  const isOvertimeAdd = store.isOvertimeRequest(request.typeId) && (request.hours || 0) > 0;

  const handlePrint = () => {
      window.print();
  };

  const handleAction = async (status: RequestStatus) => {
      const isRejection = status === RequestStatus.REJECTED;
      const promptMsg = isRejection ? 'Motivo del rechazo (obligatorio):' : 'Comentario / Observaciones (opcional):';
      const comment = window.prompt(promptMsg);
      if (isRejection && !comment) return;

      setIsProcessing(true);
      try {
          // Si es horas y se han editado, guardar primero
          if (isOvertimeAdd && editedHours !== request.hours) {
              await store.updateRequestHours(request.id, editedHours);
          }
          await store.updateRequestStatus(request.id, status, store.currentUser?.id || '', comment || '');
          onClose();
      } catch (error) {
          alert('Error al procesar la solicitud');
      } finally {
          setIsProcessing(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-start z-[150] p-4 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:items-start print:static print:block">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-fade-in-up my-8 print:my-0 print:shadow-none print:w-full print:max-w-none print:rounded-none">
        
        {/* Header (No Print Actions) */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden">
            <h2 className="font-bold text-slate-700">Detalle de Solicitud</h2>
            <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-colors shadow-sm text-slate-700">
                    <Printer size={16}/> Imprimir Informe
                </button>
                <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500">
                    <X size={20}/>
                </button>
            </div>
        </div>

        {/* Report Content */}
        <div className="p-8 print:p-0">
            {/* Header del Informe */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white border border-slate-200 flex items-center justify-center rounded-xl p-2 print:border-none print:p-0">
                         <img src="https://termosycalentadoresgranada.com/wp-content/uploads/2025/08/https___cdn.evbuc_.com_images_677236879_73808960223_1_original.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Informe de Solicitud</h1>
                        <p className="text-slate-500 text-sm">Portal de RRHH - GdA</p>
                        <p className="text-slate-400 text-[10px] mt-1 font-mono uppercase tracking-tighter">ID: {request.id}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border
                        ${request.status === RequestStatus.APPROVED ? 'bg-green-50 text-green-700 border-green-200' : 
                          request.status === RequestStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}
                    `}>
                        {request.status === RequestStatus.APPROVED && <CheckCircle size={14}/>}
                        {request.status === RequestStatus.REJECTED && <XCircle size={14}/>}
                        {request.status === RequestStatus.PENDING && <AlertCircle size={14}/>}
                        {request.status}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Creado: {new Date(request.createdAt).toLocaleDateString()}</p>
                </div>
            </div>

            {/* Datos del Empleado */}
            <div className="mb-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Datos del Empleado</h3>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <span className="block text-xs text-slate-500">Nombre Completo</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-2"><UserIcon size={14}/> {user?.name}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-500">Departamento</span>
                        <span className="font-semibold text-slate-800">{dept?.name || '-'}</span>
                    </div>
                    <div className="col-span-2">
                        <span className="block text-xs text-slate-500">Email</span>
                        <span className="font-semibold text-slate-800">{user?.email}</span>
                    </div>
                </div>
            </div>

            {/* Detalles de la Solicitud */}
            <div className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100 print:bg-white print:border-black">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{store.getTypeLabel(request.typeId)}</h3>
                
                <div className="grid grid-cols-2 gap-y-4">
                    <div>
                        <span className="flex items-center gap-2 text-sm text-slate-500 mb-1"><Calendar size={14}/> Fecha Inicio</span>
                        <span className="font-medium text-slate-900">{new Date(request.startDate).toLocaleDateString()}</span>
                    </div>
                    {request.endDate && (
                        <div>
                            <span className="flex items-center gap-2 text-sm text-slate-500 mb-1"><Calendar size={14}/> Fecha Fin</span>
                            <span className="font-medium text-slate-900">{new Date(request.endDate).toLocaleDateString()}</span>
                        </div>
                    )}
                    {request.hours !== undefined && (
                        <div>
                            <span className="flex items-center gap-2 text-sm text-slate-500 mb-1"><Clock size={14}/> Total Horas</span>
                            {isPending && canManage && isOvertimeAdd ? (
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        step="0.5"
                                        value={editedHours}
                                        onChange={(e) => setEditedHours(parseFloat(e.target.value) || 0)}
                                        className="w-24 px-3 py-1.5 border-2 border-indigo-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none"
                                    />
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 uppercase tracking-tighter">Editando</span>
                                </div>
                            ) : (
                                <span className="font-mono font-bold text-slate-900">{request.hours}h</span>
                            )}
                        </div>
                    )}
                </div>

                {request.reason && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <span className="flex items-center gap-2 text-sm text-slate-500 mb-1"><FileText size={14}/> Motivo / Comentario Empleado</span>
                        <p className="text-slate-700 italic">"{request.reason}"</p>
                    </div>
                )}
            </div>

            {/* Impacto en Saldo */}
            <div className="mb-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="h-1 w-1 bg-blue-400 rounded-full"></div> Impacto en Saldo del Empleado
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cálculo de impacto Vacaciones */}
                    {(() => {
                        const { daysDelta } = store.getDeltasForRequest(request.typeId, request.startDate, request.endDate || '', request.hours || 0);
                        const isApproved = request.status === RequestStatus.APPROVED;
                        const isReward = request.typeId === RequestType.OVERTIME_TO_DAYS;
                        const current = user?.daysAvailable || 0;

                        // Los días de vacaciones normales y ajustes se restan/suman al CREAR la solicitud (si no es RECHAZADA)
                        const wasApplied = request.status !== RequestStatus.REJECTED && (daysDelta !== 0);
                        const before = wasApplied ? current - daysDelta : current;
                        
                        // El beneficio de días extras (OVERTIME_TO_DAYS) se suma solo al APROBAR
                        const pendingRewardVal = (isReward && request.status === RequestStatus.PENDING) ? (Math.abs(request.hours || 0) / 8) : 0;
                        const after = wasApplied ? current + pendingRewardVal : current + daysDelta + pendingRewardVal;
                        
                        if (daysDelta === 0 && !isReward) return null;

                        return (
                            <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-orange-600 uppercase">Vacaciones</span>
                                    <span className="text-xs font-bold text-orange-400">{Math.abs(daysDelta || (Math.abs(request.hours || 0) / 8)).toFixed(1)}d</span>
                                </div>
                                <div className="flex items-center justify-between bg-white/60 rounded-xl p-2 px-3 border border-orange-100/50">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase">Saldo Previo</p>
                                        <p className="text-sm font-black text-slate-600">{before.toFixed(1)}d</p>
                                    </div>
                                    <ChevronRight size={14} className="text-orange-300 mx-1" />
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-slate-400 uppercase">Resultado</p>
                                        <p className="text-sm font-black text-orange-600">{after.toFixed(1)}d</p>
                                    </div>
                                </div>
                                <p className="text-[9px] text-orange-400 font-medium italic">
                                    {daysDelta < 0 ? '* Descontado al crear la solicitud' : '* Se sumará al aprobar la solicitud'}
                                </p>
                            </div>
                        );
                    })()}

                    {/* Cálculo de impacto Horas Extra */}
                    {(() => {
                        const { hoursDelta } = store.getDeltasForRequest(request.typeId, request.startDate, request.endDate || '', request.hours || 0);
                        const isEarning = [RequestType.OVERTIME_EARN, RequestType.WORKED_HOLIDAY].includes(request.typeId as RequestType);
                        const current = user?.overtimeHours || 0;

                        // La mayoría de operaciones (Ajustes, Gastos de horas) se restan/suman al CREAR la solicitud (si no es RECHAZADA)
                        const wasApplied = request.status !== RequestStatus.REJECTED && (hoursDelta !== 0);
                        const before = wasApplied ? current - hoursDelta : current;
                        
                        // Los ingresos (Registro, Festivo) se suman solo al APROBAR
                        const pendingEarnVal = (isEarning && request.status === RequestStatus.PENDING) ? Math.abs(request.hours || 0) : 0;
                        const after = wasApplied ? current + pendingEarnVal : current + hoursDelta + pendingEarnVal;

                        if (hoursDelta === 0 && !isEarning) return null;

                        return (
                            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-blue-600 uppercase">Horas Extra</span>
                                    <span className="text-xs font-bold text-blue-400">{Math.abs(request.hours || 0).toFixed(1)}h</span>
                                </div>
                                <div className="flex items-center justify-between bg-white/60 rounded-xl p-2 px-3 border border-blue-100/50">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase">Saldo Previo</p>
                                        <p className="text-sm font-black text-slate-600">{before.toFixed(1)}h</p>
                                    </div>
                                    <ChevronRight size={14} className="text-blue-300 mx-1" />
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-slate-400 uppercase">Resultado</p>
                                        <p className="text-sm font-black text-blue-600">{after.toFixed(1)}h</p>
                                    </div>
                                </div>
                                <p className="text-[9px] text-blue-400 font-medium italic">
                                    {hoursDelta < 0 ? '* Descontado al crear la solicitud' : '* Se sumará al aprobar la solicitud'}
                                </p>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Validación y Observaciones Admin */}
            {(request.status !== RequestStatus.PENDING) && (
                <div className="mb-8 bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 border-b border-blue-100 pb-2">Información de Validación</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <span className="block text-xs text-blue-500 mb-1">Responsable de la acción</span>
                            <div className="flex items-center gap-2 font-bold text-slate-800">
                                <div className="p-1 bg-blue-100 text-blue-600 rounded">
                                    <UserCheck size={14}/>
                                </div>
                                {approver ? approver.name : 'Administración / Sistema'}
                            </div>
                        </div>
                        {request.adminComment && (
                            <div className="col-span-2 mt-2">
                                <span className="flex items-center gap-2 text-xs font-bold text-blue-500 mb-2">
                                    <MessageSquare size={14}/> Observaciones de la validación:
                                </span>
                                <p className="text-slate-700 font-medium italic bg-white p-3 rounded-lg border border-blue-100">
                                    "{request.adminComment}"
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Trazabilidad de Horas (Si aplica) */}
            {((usageDetails && usageDetails.length > 0) || untracedHours > 0) && (
                <div className="mb-8">
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Trazabilidad de Horas Consumidas</h3>
                     <table className="w-full text-sm text-left">
                         <thead className="bg-slate-100 text-slate-600 print:bg-slate-50">
                             <tr>
                                 <th className="p-2 rounded-l-lg">Fecha Origen</th>
                                 <th className="p-2">Motivo Origen</th>
                                 <th className="p-2 text-right rounded-r-lg">Horas Usadas</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {usageDetails.map((u, i) => (
                                 <tr key={i}>
                                     <td className="p-2">{u.sourceDate ? new Date(u.sourceDate).toLocaleDateString() : 'N/A'}</td>
                                     <td className="p-2 text-slate-500 italic">{u.sourceReason || '-'}</td>
                                     <td className="p-2 text-right font-mono font-bold">{u.hoursUsed}h</td>
                                 </tr>
                             ))}
                             {/* Fila para completar las horas que vienen del saldo histórico */}
                             {untracedHours > 0 && (
                                 <tr className="bg-blue-50/30">
                                     <td className="p-2 text-blue-600 font-medium italic">Histórico</td>
                                     <td className="p-2 text-slate-500 italic text-xs">Saldo acumulado anterior o ajustes de administración</td>
                                     <td className="p-2 text-right font-mono font-bold text-blue-700">{untracedHours}h</td>
                                 </tr>
                             )}
                         </tbody>
                         <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                             <tr>
                                 <td colSpan={2} className="p-2 text-right text-slate-600 uppercase text-[10px]">Suma Total del Desglose:</td>
                                 <td className="p-2 text-right font-mono text-slate-900">{(totalTracedHours + untracedHours)}h</td>
                             </tr>
                         </tfoot>
                     </table>
                </div>
            )}
            
            {/* Acciones para Admin (No Print) */}
            {canManage && isPending && (
                <div className="mt-12 flex flex-col md:flex-row gap-4 pt-8 border-t border-slate-200 print:hidden">
                    <button 
                        disabled={isProcessing}
                        onClick={() => handleAction(RequestStatus.APPROVED)} 
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        <CheckCircle size={20}/>
                        {isOvertimeAdd && editedHours !== request.hours ? 'Actualizar y Aprobar' : 'Aprobar Solicitud'}
                    </button>
                    <button 
                        disabled={isProcessing}
                        onClick={() => handleAction(RequestStatus.REJECTED)} 
                        className="bg-white border-2 border-slate-200 text-slate-400 font-bold px-8 py-4 rounded-2xl hover:border-rose-500 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-50"
                    >
                        Rechazar
                    </button>
                </div>
            )}

            {/* Footer Firma */}
            <div className="mt-12 pt-8 border-t border-slate-200 print:flex hidden justify-between">
                <div className="text-center">
                    <div className="h-16 border-b border-slate-400 w-48 mb-2"></div>
                    <p className="text-xs text-slate-500">Firma Empleado</p>
                </div>
                <div className="text-center">
                    <div className="h-16 border-b border-slate-400 w-48 mb-2"></div>
                    <p className="text-xs text-slate-500">Firma Responsable</p>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default RequestDetailModal;