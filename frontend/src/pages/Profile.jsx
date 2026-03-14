import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Shield, MapPin, Key, AlertCircle, CheckCircle, Eye, EyeOff, UserCircle } from 'lucide-react';
import api from '../services/api';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    // Password change state
    const [passwordData, setPasswordData] = useState({
        username: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await api.get('/api/v1/auth/me');
                setUser(response.data);
                // Pre-fill username for security check if desired, 
                // but user asked for "only username and current password matches"
                // so we can let them type it or show it.
            } catch (err) {
                console.error('Error fetching profile:', err);
                setError('Failed to load profile information.');
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        // Security Check: Username must match the logged-in user
        if (passwordData.username !== user.username) {
            setError('Username does not match your account.');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setError('New password must be at least 6 characters.');
            return;
        }

        setUpdating(true);
        try {
            await api.post('/api/v1/auth/change-password', {
                current_password: passwordData.currentPassword,
                new_password: passwordData.newPassword
            });
            setMessage('Password updated successfully!');
            setPasswordData({
                username: '',
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update password. Please check your current password.');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Personal Profile</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Manage your account details and security settings</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-subtle)]">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <UserCircle size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-[var(--text-primary)]">{user?.full_name || user?.username}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{user?.role}</div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* User Info Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            <User size={18} className="text-[var(--primary)]" />
                            Account Information
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Username</label>
                                <div className="text-[var(--text-primary)] font-medium flex items-center gap-2">
                                    <Shield size={14} className="text-slate-400" />
                                    {user?.username}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Email Address</label>
                                <div className="text-[var(--text-primary)] font-medium flex items-center gap-2">
                                    <Mail size={14} className="text-slate-400" />
                                    {user?.email}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Role</label>
                                <div className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-tight border border-blue-100 dark:border-blue-800">
                                    {user?.role}
                                </div>
                            </div>
                            {user?.jurisdiction && (
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Jurisdiction</label>
                                    <div className="text-[var(--text-primary)] font-medium flex items-center gap-2">
                                        <MapPin size={14} className="text-slate-400" />
                                        {user?.jurisdiction}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-6">
                        <h3 className="text-amber-800 dark:text-amber-400 font-bold text-sm mb-2 flex items-center gap-2">
                            <AlertCircle size={16} /> Security Notice
                        </h3>
                        <p className="text-amber-700/80 dark:text-amber-500/80 text-xs leading-relaxed">
                            Passwords are encrypted and stored securely. Ensure your credentials are never shared with unauthorized personnel.
                        </p>
                    </div>
                </div>

                {/* Password Update Form */}
                <div className="md:col-span-2">
                    <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            <Key size={20} className="text-[var(--primary)]" />
                            Update Password
                        </h2>

                        <form onSubmit={handlePasswordChange} className="space-y-6">
                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400 text-sm"
                                    >
                                        <AlertCircle size={18} />
                                        {error}
                                    </motion.div>
                                )}
                                {message && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-xl flex items-center gap-3 text-green-700 dark:text-green-400 text-sm"
                                    >
                                        <CheckCircle size={18} />
                                        {message}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-2">
                                        <User size={14} /> Confirm Your Username
                                    </label>
                                    <input
                                        type="text"
                                        value={passwordData.username}
                                        onChange={(e) => setPasswordData({ ...passwordData, username: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all font-medium"
                                        placeholder="Type your username to authorize"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-2">
                                        <Key size={14} /> Current Password
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type={showPasswords.current ? "text" : "password"}
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                            className="w-full pl-4 pr-12 py-2.5 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--text-primary)] transition-colors p-1"
                                        >
                                            {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-2">
                                            <Key size={14} className="text-blue-500" /> New Password
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type={showPasswords.new ? "text" : "password"}
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                className="w-full pl-4 pr-12 py-2.5 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                                                placeholder="Min. 6 chars"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--text-primary)] transition-colors p-1"
                                            >
                                                {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-2">
                                            <Key size={14} className="text-blue-500" /> Confirm New Password
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type={showPasswords.confirm ? "text" : "password"}
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                className="w-full pl-4 pr-12 py-2.5 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                                                placeholder="Repeat new password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--text-primary)] transition-colors p-1"
                                            >
                                                {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="w-full md:w-auto px-10 py-3 bg-[var(--primary)] hover:bg-[#001e42] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {updating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Updating Security...
                                        </>
                                    ) : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
