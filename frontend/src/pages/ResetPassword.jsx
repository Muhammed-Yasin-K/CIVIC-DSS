import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Lock, CheckCircle, AlertCircle, RefreshCw, ArrowLeft, Shield } from 'lucide-react';
import api from '../services/api';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            setError('Invalid or missing reset token. Please request a new link.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await api.post('/api/v1/auth/reset-password', {
                token: token,
                new_password: newPassword
            });
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 5000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to reset password. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200"
            >
                {/* Header */}
                <div className="bg-[var(--primary)] p-8 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Lock className="w-24 h-24 rotate-12" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="p-3 bg-white/20 rounded-full mb-4">
                            <Shield className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold">Secure Reset</h1>
                        <p className="text-blue-100 mt-2 text-sm">Create a strong new password for your account</p>
                    </div>
                </div>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center py-6"
                            >
                                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-100">
                                    <CheckCircle className="w-12 h-12" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">Password Updated!</h2>
                                <p className="text-slate-600 mt-3 leading-relaxed">
                                    Your password has been reset successfully. You will be redirected to the login page shortly.
                                </p>
                                <Link
                                    to="/login"
                                    className="inline-block mt-8 text-[var(--primary)] font-bold hover:underline"
                                >
                                    Go to login now
                                </Link>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                {error && (
                                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
                                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {!token ? (
                                    <div className="text-center py-4">
                                        <p className="text-slate-500 mb-6">You need a valid security token to access this page.</p>
                                        <Link to="/login" className="flex items-center justify-center gap-2 text-[var(--primary)] font-bold">
                                            <ArrowLeft className="w-4 h-4" /> Back to Login
                                        </Link>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Lock className="h-4 w-4 text-slate-400" />
                                                </div>
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900 bg-slate-50 focus:bg-white transition-all"
                                                    placeholder="Enter at least 6 characters"
                                                    required
                                                    disabled={loading}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm New Password</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Lock className="h-4 w-4 text-slate-400" />
                                                </div>
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900 bg-slate-50 focus:bg-white transition-all"
                                                    placeholder="Repeat new password"
                                                    required
                                                    disabled={loading}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-4 bg-[var(--primary)] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
                                            {loading ? 'Changing Password...' : 'Reset Password'}
                                        </button>

                                        <p className="text-center text-xs text-slate-400 mt-4">
                                            Secured by Civic Risk Intelligence Platform
                                        </p>
                                    </form>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
