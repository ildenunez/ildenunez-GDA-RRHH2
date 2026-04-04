import React from 'react';
import { LeaveRequest, RequestStatus } from '../types';
import { store } from '../services/store';
import { AlertCircle, Trash2, X, RefreshCcw, Eraser } from 'lucide-react';

interface DeleteRequestModalProps {
  request: LeaveRequest;
  onClose: () => void;
  onSuccess: () => void;
}

const DeleteRequestModal: React.FC<DeleteRequestModalProps> = ({ request, onClose, onSuccess }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const isPending = request.status === RequestStatus.PENDING;
  const label = store.getTypeLabel(request.typeId);
  const amount = request.hours ? (request.hours > 0 ? `+${request.hours}h` : `${request.hours}h`) : '-';

  const handleDelete = async (refund: boolean) => {
    setIsDeleting(true);
    try {
      await store.deleteRequest(request.id, refund);
      onSuccess();
      onClose();
    } catch (error) {
      alert('Error al eliminar el registro');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-scale-in overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-rose-50 p-2 rounded-xl text-rose-600"><Trash2 size={20}/></div>
            <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight">Confirmar Eliminación</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8">
          <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Registro a eliminar</p>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-700">{label}</p>
                <p className="text-[10px] text-slate-400 font-medium">{new Date(request.startDate).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className={`font-black text-lg ${amount.startsWith('+') ? 'text-green-600' : 'text-blue-600'}`}>{amount}</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{request.status}</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            ¿Cómo deseas proceder con la eliminación de este registro? 
            {isPending ? ' Las solicitudes pendientes siempre devuelven el saldo proyectado al empleado.' : ''}
          </p>

          <div className="space-y-4">
            <button
              disabled={isDeleting}
              onClick={() => handleDelete(true)}
              className="w-full group bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-4 transition-all duration-300 shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 overflow-hidden relative"
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="text-left">
                  <p className="font-black text-xs uppercase tracking-widest mb-0.5">Eliminar y Devolver Saldo</p>
                  <p className="text-[10px] opacity-70 font-medium">El saldo del empleado se actualizará automáticamente</p>
                </div>
                <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
              </div>
            </button>

            {!isPending && (
              <button
                disabled={isDeleting}
                onClick={() => handleDelete(false)}
                className="w-full group bg-white border-2 border-slate-100 hover:border-slate-300 text-slate-600 rounded-2xl p-4 transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="font-black text-xs uppercase tracking-widest mb-0.5">Solo Eliminar Registro</p>
                    <p className="text-[10px] text-slate-400 font-medium">El saldo actual del empleado no se modificará</p>
                  </div>
                  <Eraser size={20} />
                </div>
              </button>
            )}

            <div className="pt-4 flex items-center gap-3 text-orange-500 bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
              <AlertCircle size={32} />
              <p className="text-[10px] font-bold leading-tight uppercase">
                Esta acción es irreversible y se eliminará permanentemente de la base de datos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteRequestModal;
