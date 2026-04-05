import { User, Role, Department, LeaveRequest, RequestStatus, AppConfig, Notification, LeaveTypeConfig, EmailTemplate, ShiftType, ShiftAssignment, Holiday, PPEType, PPERequest, RequestType, OvertimeUsage, DateRange, NewsPost, Truck, Driver, DriverPPE } from '../types';
import { supabase } from './supabase';
import { playNotificationSound } from './NotificationSound';

class Store {
  users: User[] = [];
  departments: Department[] = [];
  requests: LeaveRequest[] = [];
  notifications: Notification[] = [];
  config: AppConfig = {
    leaveTypes: [],
    emailTemplates: [],
    shifts: [],
    shiftTypes: [],
    shiftAssignments: [],
    holidays: [],
    ppeTypes: [],
    ppeRequests: [],
    news: [],
    smtpSettings: { host: 'smtp.gmail.com', port: 587, user: 'admin@empresa.com', password: '', enabled: false },
    trucks: [],
    drivers: [],
    driversPpe: []
  };

  currentUser: User | null = null;
  initialized = false;
  private listeners: (() => void)[] = [];

  subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  private mapUser(u: any): User {
    return {
      ...u,
      id: String(u.id).trim(),
      departmentId: String(u.department_id).trim(),
      daysAvailable: Number(u.days_available ?? 0),
      overtimeHours: Number(u.overtime_hours ?? 0),
      avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}`,
      truckNumber: u.truck_number
    };
  }

  getTypeLabel(typeId: string): string {
    if (!typeId) return 'Tipo desconocido';
    const map: Record<string, string> = {
      [RequestType.VACATION]: 'Vacaciones',
      [RequestType.SICKNESS]: 'Baja Médica',
      [RequestType.PERSONAL]: 'Asuntos Propios',
      [RequestType.OVERTIME_EARN]: 'Registro Horas Extra',
      [RequestType.OVERTIME_SPEND_DAYS]: 'Canje por Días Libres',
      [RequestType.OVERTIME_TO_DAYS]: 'Pasar horas a días',
      [RequestType.OVERTIME_PAY]: 'Abono en Nómina',
      [RequestType.WORKED_HOLIDAY]: 'Festivo Trabajado',
      [RequestType.UNJUSTIFIED]: 'Ausencia Justificada',
      [RequestType.ADJUSTMENT_DAYS]: 'Regularización Días (Admin)',
      [RequestType.ADJUSTMENT_OVERTIME]: 'Regularización Horas (Admin)',
    };
    const dynamic = this.config.leaveTypes.find(t => t.id === typeId);
    if (dynamic) return dynamic.label;
    return map[typeId] || typeId;
  }

  async refresh() {
    try {
      this.config.dbError = undefined;
      const fetchT = async (table: string, query: any = null) => {
        try {
          const { data, error } = await (query || supabase.from(table).select('*'));
          if (error) {
            console.warn(`Optional table missing or error [${table}]:`, error.message);
            if (table === 'user_schedules') this.config.dbError = error.message;
            return [];
          }
          return data || [];
        } catch (e: any) {
          console.warn(`Exception fetching [${table}]:`, e);
          if (table === 'user_schedules') this.config.dbError = e.message;
          return [];
        }
      };

      const [u, d, r, lt, pt, pr, nw, hl, st, sa, tr, dr, dp, sett] = await Promise.all([
        fetchT('users'),
        fetchT('departments'),
        fetchT('requests'),
        fetchT('leave_types'),
        fetchT('ppe_types'),
        fetchT('ppe_requests'),
        fetchT('news', supabase.from('news').select('*').order('created_at', { ascending: false })),
        fetchT('holidays'),
        fetchT('shift_types'),
        (async () => {
          let allData: any[] = [];
          let from = 0; let to = 999;
          while(true) {
            const { data, error } = await supabase.from('user_schedules').select('*').range(from, to);
            if (error) { console.error('user_schedules DB err:', error); break; }
            if (!data || data.length === 0) break;
            allData = [...allData, ...data];
            if (data.length < 1000) break;
            from += 1000; to += 1000;
          }
          return allData;
        })(),
        fetchT('trucks'),
        fetchT('drivers'),
        fetchT('drivers_ppe'),
        fetchT('settings')
      ]);

      this.users = u.map((x: any) => this.mapUser(x));
      this.departments = d.map((x: any) => ({
        id: String(x.id).trim(), name: String(x.name || ''), supervisorIds: (x.supervisor_ids || []).map((id: any) => String(id).trim())
      }));
      this.requests = r.map((r: any) => ({
        id: String(r.id).trim(), userId: String(r.user_id).trim(), typeId: String(r.type_id).trim(), label: r.label,
        startDate: (r.start_date || '').trim(), endDate: (r.end_date || '').trim(), hours: r.hours, reason: r.reason,
        status: (r.status || '').trim(), createdAt: r.created_at, adminComment: r.admin_comment,
        resolvedBy: r.resolved_by ? String(r.resolved_by).trim() : undefined,
        consumedHours: Number(r.consumed_hours || 0), overtimeUsage: r.overtime_usage || []
      }));
      this.config.news = nw.map((n: any) => ({
        id: String(n.id),
        title: n.title,
        content: n.content,
        authorId: String(n.author_id),
        createdAt: n.created_at,
        pinned: !!n.pinned
      }));
      this.config.leaveTypes = lt.map((t: any) => ({ id: String(t.id), label: t.label, subtractsDays: !!t.subtracts_days, fixedRanges: t.fixed_range || [] }));
      this.config.ppeTypes = pt.map((p: any) => ({ id: String(p.id), name: p.name, sizes: p.sizes || [], stock: p.stock || {} }));
      this.config.ppeRequests = pr.map((p: any) => ({ id: String(p.id), userId: String(p.user_id), typeId: String(p.type_id), size: p.size, status: p.status, createdAt: p.created_at, deliveryDate: p.delivery_date }));
      this.config.holidays = hl.map((h: any) => ({ id: String(h.id), date: h.date, name: h.name }));
      this.config.shiftTypes = st.map((s: any) => ({ ...s, id: String(s.id) }));
      this.config.shiftAssignments = sa.map((a: any) => ({ id: String(a.id), userId: String(a.user_id).trim(), date: (a.date ? String(a.date) : '').split('T')[0].trim(), shiftTypeId: String(a.shift_type_id || '').trim() }));
      this.config.trucks = tr.map((t: any) => ({ id: String(t.id), name: t.name }));
      this.config.drivers = dr.map((d: any) => ({ id: String(d.id), name: d.name, truckId: String(d.truck_id) }));
      this.config.driversPpe = dp.map((p: any) => ({ id: String(p.id), driverId: String(p.driver_id), typeId: String(p.type_id), size: p.size, status: p.status, createdAt: p.created_at, requestedDate: p.requested_date, deliveryDate: p.delivery_date }));

      if (sett) {
        const smtpRow = sett.find((r: any) => r.key === 'smtp');
        const templatesRow = sett.find((r: any) => r.key === 'email_templates');
        if (smtpRow?.value) this.config.smtpSettings = smtpRow.value;
        if (templatesRow?.value) this.config.emailTemplates = templatesRow.value;
      }

      if (this.currentUser) {
        const updatedSelf = this.users.find(u => u.id === this.currentUser!.id);
        if (updatedSelf) this.currentUser = updatedSelf;
        const { data: n } = await supabase.from('notifications').select('*').eq('user_id', this.currentUser.id).order('created_at', { ascending: false });
        if (n) this.notifications = n.map((x: any) => ({ id: String(x.id), userId: String(x.user_id), message: x.message, read: x.read, date: x.created_at, type: x.type }));
        
        // Setup Realtime subscription
        const channelName = `notifs_${this.currentUser.id}`;
        if (!supabase.getChannels().find(c => c.topic === `realtime:${channelName}`)) {
            supabase.channel(channelName)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${this.currentUser.id}` }, (payload) => {
                const newNotif = payload.new;
                this.notifications = [{ id: String(newNotif.id), userId: String(newNotif.user_id), message: newNotif.message, read: newNotif.read, date: newNotif.created_at, type: newNotif.type }, ...this.notifications];
                playNotificationSound();
                this.notify();
            })
            .subscribe();
        }
      }
      this.notify();
    } catch (error) { console.error("Store Refresh Error:", error); }
  }

  async saveEmailTemplates(templates: EmailTemplate[]) {
    try {
      this.config.emailTemplates = templates;
      await supabase.from('settings').upsert({ key: 'email_templates', value: templates }, { onConflict: 'key' });
      await this.refresh();
    } catch (e) {
      console.error("Error saving email templates:", e);
      throw e;
    }
  }

  async init() {
    if (this.initialized) return;
    const saved = localStorage.getItem('gda_session');
    if (saved) this.currentUser = this.mapUser(JSON.parse(saved));
    await this.refresh();
    this.initialized = true;
  }

  async assignShiftsBatch(changes: { userId: string, date: string, shiftTypeId: string }[]) {
    if (changes.length === 0) return;
    try {
      const groups: Record<string, typeof changes> = {};
      changes.forEach(c => {
        if (!groups[c.userId]) groups[c.userId] = [];
        groups[c.userId].push(c);
      });

      for (const [uid, userChanges] of Object.entries(groups)) {
        const dates = userChanges.map(c => c.date);
        const { error: deleteError } = await supabase.from('user_schedules').delete().eq('user_id', uid).in('date', dates);
        if (deleteError) {
          console.error("Delete Error for user " + uid, deleteError);
          throw deleteError;
        }

        const inserts = userChanges.filter(c => c.shiftTypeId !== '').map(c => ({
          id: crypto.randomUUID(),
          user_id: uid,
          date: c.date,
          shift_type_id: c.shiftTypeId
        }));

        if (inserts.length > 0) {
          const { error } = await supabase.from('user_schedules').insert(inserts);
          if (error) {
            console.error("Insert Error", error);
            throw error;
          }
        }
      }
      await this.refresh();
    } catch (e: any) {
      console.error("Batch Save Error:", e);
      throw e;
    }
  }

  calcAbsenceDays(startDate: string, endDate?: string) {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    if (end < start) return 0;
    return Math.ceil(Math.abs(end.getTime() - start.getTime()) / 86400000) + 1;
  }

  async _adjustUserBalance(uid: string, daysDelta: number, hoursDelta: number) {
    const u = this.users.find(x => x.id === uid);
    if (!u) return;
    const currentDays = u.daysAvailable || 0;
    const currentHours = u.overtimeHours || 0;
    const { error } = await supabase.from('users').update({
        days_available: currentDays + daysDelta,
        overtime_hours: currentHours + hoursDelta
    }).eq('id', uid);
    if (error) console.error("Error adjusting balance:", error);
  }

  getDeltasForRequest(typeId: string, startDate: string, endDate: string, hours: number) {
    let daysDelta = 0; let hoursDelta = 0;
    const isOvertime = this.isOvertimeRequest(typeId);
    if (!isOvertime) {
        const typeConfig = this.config.leaveTypes.find(t => t.id === typeId);
        if (typeConfig?.subtractsDays) daysDelta = -this.calcAbsenceDays(startDate, endDate);
    } else {
        if ([RequestType.OVERTIME_SPEND_DAYS, RequestType.OVERTIME_PAY, RequestType.OVERTIME_TO_DAYS].includes(typeId as RequestType)) {
            hoursDelta = -Math.abs(hours || 0);
            // El día de OVERTIME_TO_DAYS no se suma en el Delta base (Pendiente), se suma al Aprobar
        }
        if (typeId === RequestType.ADJUSTMENT_OVERTIME) {
            hoursDelta = hours || 0;
        }
    }

    if (typeId === RequestType.ADJUSTMENT_DAYS) {
        daysDelta = hours || 0;
    }

    return { daysDelta, hoursDelta };
  }

  async createRequest(d: any, uid: string, s: RequestStatus, aid?: string) {
    await supabase.from('requests').insert({ id: crypto.randomUUID(), user_id: uid, type_id: d.typeId, label: d.label || this.getTypeLabel(d.typeId), start_date: d.startDate, end_date: d.endDate, hours: d.hours, reason: d.reason, status: s, created_at: new Date().toISOString(), resolved_by: aid || null });
    
    if (s !== RequestStatus.REJECTED) {
        const { daysDelta, hoursDelta } = this.getDeltasForRequest(d.typeId, d.startDate, d.endDate, d.hours);
        if (daysDelta !== 0 || hoursDelta !== 0) await this._adjustUserBalance(uid, daysDelta, hoursDelta);
        if (s === RequestStatus.APPROVED) {
            if ([RequestType.OVERTIME_EARN, RequestType.WORKED_HOLIDAY].includes(d.typeId as RequestType)) await this._adjustUserBalance(uid, 0, Math.abs(d.hours || 0));
            if (d.typeId === RequestType.OVERTIME_TO_DAYS) await this._adjustUserBalance(uid, Math.abs(d.hours || 0) / 8, 0);
        }
    }
    await this.refresh();
  }

  async updateRequest(id: string, d: any) {
    const old = this.requests.find(r => r.id === id);
    if (old && old.status !== RequestStatus.REJECTED) {
        const oldDeltas = this.getDeltasForRequest(old.typeId, old.startDate, old.endDate || '', old.hours || 0);
        const newDeltas = this.getDeltasForRequest(d.typeId, d.startDate, d.endDate, d.hours);
        const diffDays = newDeltas.daysDelta - oldDeltas.daysDelta;
        const diffHours = newDeltas.hoursDelta - oldDeltas.hoursDelta;
        
        let earnedDiff = 0;
        let dayRewardDiff = 0;
        if (old.status === RequestStatus.APPROVED) {
            const oldEarned = [RequestType.OVERTIME_EARN, RequestType.WORKED_HOLIDAY].includes(old.typeId as RequestType) ? Math.abs(old.hours || 0) : 0;
            const newEarned = [RequestType.OVERTIME_EARN, RequestType.WORKED_HOLIDAY].includes(d.typeId as RequestType) ? Math.abs(d.hours || 0) : 0;
            earnedDiff = newEarned - oldEarned;
            
            const oldDayReward = old.typeId === RequestType.OVERTIME_TO_DAYS ? Math.abs(old.hours || 0) / 8 : 0;
            const newDayReward = d.typeId === RequestType.OVERTIME_TO_DAYS ? Math.abs(d.hours || 0) / 8 : 0;
            dayRewardDiff = newDayReward - oldDayReward;
        }
        if (diffDays !== 0 || diffHours !== 0 || earnedDiff !== 0 || dayRewardDiff !== 0) await this._adjustUserBalance(old.userId, diffDays + dayRewardDiff, diffHours + earnedDiff);
    }
    await supabase.from('requests').update({ type_id: d.typeId, start_date: d.startDate, end_date: d.endDate, hours: d.hours, reason: d.reason }).eq('id', id);
    await this.refresh();
  }

  async updateRequestStatus(id: string, s: RequestStatus, aid: string, c?: string) {
    const req = this.requests.find(r => r.id === id);
    if (!req) return;
    
    if (s === RequestStatus.REJECTED && req.status !== RequestStatus.REJECTED) {
        const { daysDelta, hoursDelta } = this.getDeltasForRequest(req.typeId, req.startDate, req.endDate || '', req.hours || 0);
        let refundHours = -hoursDelta;
        let refundDays = -daysDelta;
        if (req.status === RequestStatus.APPROVED) {
            if ([RequestType.OVERTIME_EARN, RequestType.WORKED_HOLIDAY].includes(req.typeId as RequestType)) refundHours -= Math.abs(req.hours || 0);
            if (req.typeId === RequestType.OVERTIME_TO_DAYS) refundDays -= Math.abs(req.hours || 0) / 8;
        }
        if (refundDays !== 0 || refundHours !== 0) await this._adjustUserBalance(req.userId, refundDays, refundHours);
    }
    
    if (s === RequestStatus.APPROVED && req.status === RequestStatus.PENDING) {
        let addDays = 0; let addHours = 0;
        if ([RequestType.OVERTIME_EARN, RequestType.WORKED_HOLIDAY].includes(req.typeId as RequestType)) addHours = Math.abs(req.hours || 0);
        if (req.typeId === RequestType.OVERTIME_TO_DAYS) addDays = Math.abs(req.hours || 0) / 8;
        if (addDays !== 0 || addHours !== 0) await this._adjustUserBalance(req.userId, addDays, addHours);
    }
    
    await supabase.from('requests').update({ status: s, admin_comment: c || '', resolved_by: aid }).eq('id', id);
    await this.refresh();
  }

  getExpectedBalance(uid: string) {
    let totalDays = 0;
    let totalHours = 0;
    
    // Process all requests (except REJECTED)
    const userReqs = this.requests.filter(r => r.userId === uid && r.status !== RequestStatus.REJECTED);
    
    for (const req of userReqs) {
        const { daysDelta, hoursDelta } = this.getDeltasForRequest(req.typeId, req.startDate, req.endDate || '', req.hours || 0);
        totalDays += daysDelta;
        totalHours += hoursDelta;

        // Add earnings ONLY if approved
        if (req.status === RequestStatus.APPROVED) {
            if ([RequestType.OVERTIME_EARN, RequestType.WORKED_HOLIDAY].includes(req.typeId as RequestType)) totalHours += Math.abs(req.hours || 0);
            if (req.typeId === RequestType.OVERTIME_TO_DAYS) totalDays += Math.abs(req.hours || 0) / 8;
        }
    }

    return { daysAvailable: totalDays, overtimeHours: totalHours };
  }

  async recalculateUserBalance(uid: string) {
    // 1. Refresh to get latest requests
    await this.refresh();
    
    // 2. Get projections
    const expected = this.getExpectedBalance(uid);

    // 3. Update DB
    await supabase.from('users').update({
        days_available: expected.daysAvailable,
        overtime_hours: expected.overtimeHours
    }).eq('id', uid);
    
    await this.refresh();
  }
  
  async updateRequestHours(id: string, h: number) {
    await supabase.from('requests').update({ hours: h }).eq('id', id);
    await this.refresh();
  }

  async deleteRequest(id: string, refundBalance: boolean = false) { 
    if (refundBalance) {
        const req = this.requests.find(r => r.id === id);
        if (req && req.status !== RequestStatus.REJECTED) {
            const { daysDelta, hoursDelta } = this.getDeltasForRequest(req.typeId, req.startDate, req.endDate || '', req.hours || 0);
            let refundHours = -hoursDelta;
            let refundDays = -daysDelta;
            if (req.status === RequestStatus.APPROVED) {
                if ([RequestType.OVERTIME_EARN, RequestType.WORKED_HOLIDAY].includes(req.typeId as RequestType)) refundHours -= Math.abs(req.hours || 0);
                if (req.typeId === RequestType.OVERTIME_TO_DAYS) refundDays -= Math.abs(req.hours || 0) / 8;
            }
            if (refundDays !== 0 || refundHours !== 0) await this._adjustUserBalance(req.userId, refundDays, refundHours);
        }
    }
    await supabase.from('requests').delete().eq('id', id); 
    await this.refresh(); 
  }
  async markNotificationAsRead(id: string) { await supabase.from('notifications').update({ read: true }).eq('id', id); await this.refresh(); }
  async markAllNotificationsAsRead(uid: string) { await supabase.from('notifications').update({ read: true }).eq('user_id', uid); await this.refresh(); }
  async deleteNotification(id: string) { await supabase.from('notifications').delete().eq('id', id); await this.refresh(); }
  getMyRequests() { return this.requests.filter(r => r.userId === this.currentUser?.id).sort((a, b) => b.startDate.localeCompare(a.startDate)); }
  getNotificationsForUser(uid: string) { return this.notifications.filter(n => n.userId === uid); }
  getShiftForUserDate(uid: string, d: string) { return this.config.shiftTypes.find(s => s.id === this.config.shiftAssignments.find(a => a.userId === uid && a.date === d)?.shiftTypeId); }
  getPendingApprovalsForUser(uid: string) {
    const u = this.users.find(x => x.id === uid);
    if (!u) return [];
    if (u.role === Role.ADMIN) return this.requests.filter(r => r.status === RequestStatus.PENDING);
    if (u.role === Role.SUPERVISOR) {
      const dIds = this.departments.filter(d => (d.supervisorIds || []).includes(uid)).map(d => d.id);
      return this.requests.filter(r => r.status === RequestStatus.PENDING && dIds.includes(this.users.find(x => x.id === r.userId)?.departmentId || ''));
    }
    return [];
  }
  isOvertimeRequest(t: string) { return [RequestType.OVERTIME_EARN, RequestType.OVERTIME_SPEND_DAYS, RequestType.OVERTIME_TO_DAYS, RequestType.OVERTIME_PAY, RequestType.WORKED_HOLIDAY, RequestType.ADJUSTMENT_OVERTIME].includes(t as RequestType); }
  getRequestConflicts(r: LeaveRequest) {
    const u = this.users.find(x => x.id === r.userId);
    if (!u) return [];
    return this.requests.filter(x => x.id !== r.id && x.status !== RequestStatus.REJECTED && !this.isOvertimeRequest(x.typeId) && this.users.find(y => y.id === x.userId)?.departmentId === u.departmentId && r.startDate.split('T')[0] <= (x.endDate || x.startDate).split('T')[0] && (r.endDate || r.startDate).split('T')[0] >= x.startDate.split('T')[0]);
  }
  getAvailableOvertimeRecords(uid: string) { return this.requests.filter(r => r.userId === uid && r.status === RequestStatus.APPROVED && (r.typeId === RequestType.OVERTIME_EARN || r.typeId === RequestType.WORKED_HOLIDAY) && (r.hours || 0) > (r.consumedHours || 0)); }
  async login(email: string, pass: string) {
    const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if (data) {
      this.currentUser = this.mapUser(data);
      localStorage.setItem('gda_session', JSON.stringify(this.currentUser));
      await this.refresh();
      return this.currentUser;
    }
    return null;
  }
  logout() { this.currentUser = null; localStorage.removeItem('gda_session'); this.notify(); }
  async createUser(d: any, p: string) { 
    const { departmentId, daysAvailable, overtimeHours, ...rest } = d;
    const { error } = await supabase.from('users').insert({ 
      id: crypto.randomUUID(), 
      ...rest, 
      department_id: departmentId, 
      days_available: daysAvailable || 22,
      overtime_hours: overtimeHours || 0,
      password: p 
    }); 
    if (error) throw error;
    await this.refresh(); 
  }
  async updateUserAdmin(id: string, d: any) { 
    const { departmentId, daysAvailable, overtimeHours, ...rest } = d; 
    const { error } = await supabase.from('users').update({ 
      ...rest, 
      department_id: departmentId,
      days_available: daysAvailable,
      overtime_hours: overtimeHours
    }).eq('id', id); 
    if (error) throw error;
    await this.refresh(); 
  }
  async updateUserProfile(id: string, d: any) { await supabase.from('users').update(d).eq('id', id); await this.refresh(); }
  async deleteUser(id: string) { await supabase.from('users').delete().eq('id', id); await this.refresh(); }
  async createDepartment(n: string, sids: string[]) { await supabase.from('departments').insert({ id: crypto.randomUUID(), name: n, supervisor_ids: sids }); await this.refresh(); }
  async updateDepartment(id: string, n: string, sids: string[]) { await supabase.from('departments').update({ name: n, supervisor_ids: sids }).eq('id', id); await this.refresh(); }
  async deleteDepartment(id: string) { await supabase.from('departments').delete().eq('id', id); await this.refresh(); }
  async createLeaveType(l: string, s: boolean, f: any) { await supabase.from('leave_types').insert({ id: crypto.randomUUID(), label: l, subtracts_days: s, fixed_range: f }); await this.refresh(); }
  async updateLeaveType(id: string, l: string, s: boolean, f: any) { await supabase.from('leave_types').update({ label: l, subtracts_days: s, fixed_range: f }).eq('id', id); await this.refresh(); }
  async deleteLeaveType(id: string) { await supabase.from('leave_types').delete().eq('id', id); await this.refresh(); }
  async createShiftType(n: string, c: string, st: string, e: string) { await supabase.from('shift_types').insert({ id: crypto.randomUUID(), name: n, color: c, segments: [{ start: st, end: e }] }); await this.refresh(); }
  async updateShiftType(id: string, n: string, c: string, st: string, e: string) { await supabase.from('shift_types').update({ name: n, color: c, segments: [{ start: st, end: e }] }).eq('id', id); await this.refresh(); }
  async deleteShiftType(id: string) { await supabase.from('shift_types').delete().eq('id', id); await this.refresh(); }
  async createHoliday(d: string, n: string) { await supabase.from('holidays').insert({ id: crypto.randomUUID(), date: d, name: n }); await this.refresh(); }
  async updateHoliday(id: string, d: string, n: string) { await supabase.from('holidays').update({ date: d, name: n }).eq('id', id); await this.refresh(); }
  async deleteHoliday(id: string) { await supabase.from('holidays').delete().eq('id', id); await this.refresh(); }
  async createPPEType(n: string, s: string[]) { await supabase.from('ppe_types').insert({ id: crypto.randomUUID(), name: n, sizes: s, stock: {} }); await this.refresh(); }
  async updatePPEType(id: string, n: string, s: string[]) { await supabase.from('ppe_types').update({ name: n, sizes: s }).eq('id', id); await this.refresh(); }
  async updatePPEStock(id: string, s: any) { await supabase.from('ppe_types').update({ stock: s }).eq('id', id); await this.refresh(); }
  async deletePPEType(id: string) { await supabase.from('ppe_types').delete().eq('id', id); await this.refresh(); }
  async createPPERequest(uid: string, tid: string, sz: string) { await supabase.from('ppe_requests').insert({ id: crypto.randomUUID(), user_id: uid, type_id: tid, size: sz, status: 'PENDIENTE', created_at: new Date().toISOString() }); await this.refresh(); }
  async markPPEAsRequested(id: string) { await supabase.from('ppe_requests').update({ status: 'SOLICITADO' }).eq('id', id); await this.refresh(); }
  async deliverPPERequest(id: string, q: number = 1) { await supabase.from('ppe_requests').update({ status: 'ENTREGADO', delivery_date: new Date().toISOString() }).eq('id', id); await this.refresh(); }
  async deletePPERequest(id: string) { await supabase.from('ppe_requests').delete().eq('id', id); await this.refresh(); }
  async createNewsPost(t: string, c: string, aid: string) { await supabase.from('news').insert({ id: crypto.randomUUID(), title: t, content: c, author_id: aid, created_at: new Date().toISOString() }); await this.refresh(); }
  async deleteNewsPost(id: string) { await supabase.from('news').delete().eq('id', id); await this.refresh(); }
    async saveSmtpSettings(s: any) { await supabase.from('settings').update({ value: s }).eq('key', 'smtp'); await this.refresh(); }
    async createTruck(n: string) { await supabase.from('trucks').insert({ id: crypto.randomUUID(), name: n }); await this.refresh(); }
  async deleteTruck(id: string) { await supabase.from('trucks').delete().eq('id', id); await this.refresh(); }
  async createDriver(n: string, tid: string) { await supabase.from('drivers').insert({ id: crypto.randomUUID(), name: n, truck_id: tid }); await this.refresh(); }
  async deleteDriver(id: string) { await supabase.from('drivers').delete().eq('id', id); await this.refresh(); }
  async createDriverPPE(did: string, tid: string, sz: string) { await supabase.from('drivers_ppe').insert({ id: crypto.randomUUID(), driver_id: did, type_id: tid, size: sz, status: 'PENDIENTE', created_at: new Date().toISOString() }); await this.refresh(); }
  async updateDriverPPEStatus(id: string, s: string, _q?: number) {
    const updateData: any = { status: s };
    if (s === 'ENTREGADO') updateData.delivery_date = new Date().toISOString();
    if (s === 'SOLICITADO') updateData.requested_date = new Date().toISOString();
    await supabase.from('drivers_ppe').update(updateData).eq('id', id);
    await this.refresh();
  }
  async deleteDriverPPE(id: string) { await supabase.from('drivers_ppe').delete().eq('id', id); await this.refresh(); }
  async sendAdminNotification(message: string, userIds: string[]) {
    const notifs = userIds.map(uid => ({
        id: crypto.randomUUID(),
        user_id: uid,
        message: `[ADMIN] ${message}`,
        read: false,
        created_at: new Date().toISOString()
    }));
    await supabase.from('notifications').insert(notifs);
    await this.refresh();
  }
  async repairOvertimeIntegrity() { await this.refresh(); }
}

export const store = new Store();