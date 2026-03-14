import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Download, ChevronLeft, ChevronRight,
    Activity, User, Shield, Info, Filter
} from 'lucide-react';
import api from '../services/api';

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        user: '',
        action_type: ''
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchLogs();
    }, [page, filters]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = {
                page,
                page_size: 20,
                ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
            };
            const response = await api.get('/api/v1/audit-logs', { params });
            setLogs(response.data.logs);
            setTotalPages(response.data.total_pages);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format) => {
        try {
            const params = {
                format,
                ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
            };
            const response = await api.get('/api/v1/audit-logs/export', {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit_logs.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error exporting logs:', error);
            alert('Export failed');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="space-y-6 max-w-[1200px] mx-auto pb-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[var(--border-subtle)] pb-8">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Audit Logs</h1>
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-[var(--text-secondary)] text-sm font-semibold">
                            System Activity
                        </p>
                        <div className="h-4 w-px bg-[var(--border-subtle)] hidden sm:block" />
                        <div className="flex items-center gap-2 px-3 py-1 bg-[var(--primary-glow)] border border-[var(--primary)]/10 rounded-full">
                            <div className={`w-1.5 h-1.5 rounded-full bg-[var(--primary)] ${loading ? 'animate-pulse' : ''}`} />
                            <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest leading-none">
                                {loading ? 'Syncing...' : `${logs.length} results found`}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleExport('csv')}
                        className="flex items-center gap-2 px-5 py-2 bg-[var(--surface-alt)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all active:scale-95 shadow-sm"
                    >
                        <Download size={14} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-panel p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">Search User</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                            <input
                                type="text"
                                placeholder="Enter name or email..."
                                value={filters.user}
                                onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] text-sm font-medium outline-none focus:border-[var(--primary)] transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">Activity Type</label>
                        <select
                            value={filters.action_type}
                            onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
                            className="w-full px-4 py-2 bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] text-sm font-medium outline-none focus:border-[var(--primary)] transition-all cursor-pointer"
                        >
                            <option value="">All Activities</option>
                            <option value="user_registered">Registration</option>
                            <option value="user_login">Login</option>
                            <option value="user_login_failed">Login Failed</option>
                            <option value="update_config">Config Update</option>
                            <option value="update_ai_thresholds">AI Threshold Change</option>
                            <option value="create_user">User Created</option>
                            <option value="delete_user">User Deleted</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[var(--surface-alt)] border-b border-[var(--border-subtle)]">
                            <tr className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">
                                <th className="px-5 py-3 text-left">Date & Time</th>
                                <th className="px-5 py-3 text-left">User</th>
                                <th className="px-5 py-3 text-left">Activity</th>
                                <th className="px-5 py-3 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i}><td colSpan="4" className="px-5 py-6 text-center animate-pulse bg-[var(--surface-alt)]/10" /></tr>
                                ))
                            ) : logs.length > 0 ? (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-[var(--surface-alt)]/30 transition-colors">
                                        <td className="px-5 py-4 text-[12px] font-medium text-[var(--text-secondary)] whitespace-nowrap">
                                            {formatDate(log.timestamp)}
                                        </td>
                                        <td className="px-5 py-4 font-bold text-[var(--text-primary)]">
                                            {log.user_email || log.user_id || 'System'}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-bold text-[var(--text-primary)] capitalize">
                                                    {(log.action || '').replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-tighter">
                                                    {log.resource_type}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${log.status === 'success'
                                                ? 'bg-green-100 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20'
                                                : 'bg-red-100 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                                                }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-5 py-20 text-center">
                                        <Shield className="mx-auto mb-2 text-[var(--text-muted)] opacity-20" size={40} />
                                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">No logs found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-[var(--surface)] border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest rounded-lg disabled:opacity-30 flex items-center gap-1"
                    >
                        <ChevronLeft size={14} /> Previous
                    </button>
                    <span className="text-[11px] font-black text-[var(--text-muted)]">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 bg-[var(--surface)] border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest rounded-lg disabled:opacity-30 flex items-center gap-1"
                    >
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
