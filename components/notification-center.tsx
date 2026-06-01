'use client';

import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2, AlertCircle, Clock, Info } from 'lucide-react';
import { getNotifications, markNotificationRead } from '@/app/actions/attendance';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    const res = await getNotifications();
    if (res.success) {
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n: any) => !n.isRead).length);
    }
  };

  const handleMarkRead = async (id: string) => {
    const res = await markNotificationRead(id);
    if (res.success) {
      fetchNotifications();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all relative"
      >
        <Bell size={20} className={unreadCount > 0 ? 'animate-bounce' : ''} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 border-2 border-white dark:border-zinc-900 rounded-full text-[8px] font-black text-white flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-4 w-96 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-2xl z-[110] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-widest">Notifikasi</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      className={`p-5 flex gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer ${!n.isRead ? 'bg-indigo-50/30 dark:bg-indigo-500/5' : ''}`}
                    >
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                        n.type === 'SESSION_ALERT' ? 'bg-amber-100 text-amber-600' :
                        n.type === 'PACKAGE_COMPLETED' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        {n.type === 'SESSION_ALERT' ? <AlertCircle size={18} /> :
                         n.type === 'PACKAGE_COMPLETED' ? <CheckCircle2 size={18} /> : <Info size={18} />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <p className="font-black text-xs leading-none">{n.title}</p>
                          <span className="text-[9px] font-bold text-zinc-400">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: id })}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center space-y-2">
                  <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-300">
                    <Bell size={24} />
                  </div>
                  <p className="text-xs font-bold text-zinc-400 italic">Belum ada notifikasi.</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 text-center">
              <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">
                Lihat Semua Riwayat
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
