import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Edit2, Trash2, Key, Filter, User, Mail, MapPin, Shield } from 'lucide-react';
import api from '../services/api';

const REGIONS_MAP = {
    "North": ["Delhi", "Shimla", "Jaipur", "Prayagraj"],
    "South-West": [
        "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod",
        "Kochi", "Kollam", "Kottayam", "Kozhikode", "Malappuram",
        "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"
    ],
    "South-East": ["Bengaluru", "Chennai", "Hyderabad"],
    "West": ["Ahmedabad", "Indore", "Mumbai", "Panaji", "Pune"],
    "East": ["Kolkata"]
};

const JURISDICTIONS = Object.keys(REGIONS_MAP).sort();

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        full_name: '',
        password: '',
        role: 'officer',
        jurisdiction: '',
        assigned_zones: [],
        is_active: true
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchUsers();
    }, [roleFilter]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = roleFilter !== 'all' ? { role: roleFilter } : {};
            const response = await api.get('/api/v1/users', { params });
            setUsers(response.data.users);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Username validation (no spaces, 3+ chars)
        if (!formData.username || formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        } else if (/\s/.test(formData.username)) {
            newErrors.username = 'Username cannot contain spaces';
        }

        // Email validation (Basic RFC)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email || !emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Role-based Jurisdiction validation
        if (formData.role === 'officer' && !formData.jurisdiction) {
            newErrors.jurisdiction = 'Jurisdiction is required for officers';
        }

        // Password validation (Create mode only)
        if (showCreateModal && (!formData.password || formData.password.length < 6)) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const submitData = { ...formData };
            if (submitData.role === 'officer' && submitData.jurisdiction) {
                // Automatically assign all cities in the region
                submitData.assigned_zones = REGIONS_MAP[submitData.jurisdiction] || [];
            }

            await api.post('/api/v1/users', submitData);
            setShowCreateModal(false);
            resetForm();
            fetchUsers();
        } catch (error) {
            console.error('Error creating user:', error);
            alert(error.response?.data?.detail || 'Failed to create user');
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const updateData = { ...formData };
            if (!updateData.password) delete updateData.password;
            delete updateData.username; // Username cannot be changed

            await api.put(`/api/v1/users/${selectedUser.id}`, updateData);
            setShowEditModal(false);
            resetForm();
            fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            alert(error.response?.data?.detail || 'Failed to update user');
        }
    };

    const handleDeleteUser = async () => {
        try {
            await api.delete(`/api/v1/users/${selectedUser.id}`);
            setShowDeleteModal(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert(error.response?.data?.detail || 'Failed to delete user');
        }
    };

    const handleResetPassword = async (userId) => {
        const newPassword = prompt('Enter new password (min 6 characters):');
        if (newPassword && newPassword.length >= 6) {
            try {
                await api.post(`/api/v1/users/${userId}/reset-password`, { new_password: newPassword });
                alert('Password reset successfully');
            } catch (error) {
                console.error('Error resetting password:', error);
                alert('Failed to reset password');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            username: '',
            email: '',
            full_name: '',
            password: '',
            role: 'officer',
            jurisdiction: '',
            assigned_zones: [],
            is_active: true
        });
        setSelectedUser(null);
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            password: '',
            role: user.role,
            jurisdiction: user.jurisdiction,
            assigned_zones: user.assigned_zones,
            is_active: user.is_active
        });
        setShowEditModal(true);
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">User Management</h1>
                <p className="text-[var(--text-secondary)] mt-2">Manage civic officers and administrators</p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    />
                </div>

                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-2 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="officer">Civic Officer</option>
                </select>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                    <Plus size={20} />
                    Create User
                </button>
            </div>

            {/* Users Table */}
            {loading ? (
                <div className="text-center py-12 text-[var(--text-muted)]">Loading users...</div>
            ) : (
                <div className="bg-[var(--surface)] rounded-xl overflow-hidden border border-[var(--border-subtle)] shadow-sm">
                    <table className="w-full">
                        <thead className="bg-[var(--surface-alt)]/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Jurisdiction</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-[var(--surface-alt)]/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="text-sm font-semibold text-[var(--text-primary)]">{user.full_name}</div>
                                            <div className="text-sm text-[var(--text-muted)]">{user.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${user.role === 'admin'
                                            ? 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800'
                                            : 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                                            }`}>
                                            {user.role === 'admin' ? 'Admin' : 'Civic Officer'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded transition-colors ${user.is_custom
                                            ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                            : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700'
                                            }`}>
                                            {user.is_custom ? 'Custom' : 'System'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{user.jurisdiction || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${user.is_active
                                            ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                            : 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                            }`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Edit user"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleResetPassword(user.id)}
                                                className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                                                title="Reset password"
                                            >
                                                <Key size={16} />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete user"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[var(--surface)] rounded-2xl p-8 max-w-md w-full border border-[var(--border-strong)] shadow-2xl"
                    >
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
                            {showCreateModal ? 'Create New User' : 'Edit User'}
                        </h2>
                        <form onSubmit={showCreateModal ? handleCreateUser : handleUpdateUser} className="space-y-5" autoComplete="off">
                            <div>
                                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-2">
                                    <User size={14} /> Username
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => { setFormData({ ...formData, username: e.target.value }); if (errors.username) setErrors({ ...errors, username: null }); }}
                                        disabled={showEditModal}
                                        className={`w-full px-4 py-2.5 bg-[var(--background)] border ${errors.username ? 'border-red-500' : 'border-[var(--border-subtle)]'} rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50 transition-all`}
                                        placeholder="e.g., off_kolkata"
                                        required
                                        autoComplete="off"
                                    />
                                    {errors.username && <p className="text-red-500 text-xs mt-1 font-medium">{errors.username}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-2">
                                    <Mail size={14} /> Email Address
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (errors.email) setErrors({ ...errors, email: null }); }}
                                    className={`w-full px-4 py-2.5 bg-[var(--background)] border ${errors.email ? 'border-red-500' : 'border-[var(--border-subtle)]'} rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all`}
                                    placeholder="officer@civic.gov"
                                    required
                                    autoComplete="off"
                                />
                                {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-2">
                                    <User size={14} /> Full Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                                    placeholder="e.g., Subhas Kundu"
                                    required
                                    autoComplete="off"
                                />
                            </div>
                            {showCreateModal && (
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-2">
                                        <Key size={14} /> Initial Password
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                                        required
                                        minLength={6}
                                        placeholder="Min. 6 characters"
                                        autoComplete="new-password"
                                    />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-2">
                                        <Shield size={14} /> System Role
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-all cursor-pointer"
                                    >
                                        <option value="officer">Officer</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-2">
                                        <MapPin size={14} /> Jurisdiction
                                    </label>
                                    <select
                                        value={formData.jurisdiction}
                                        onChange={(e) => { setFormData({ ...formData, jurisdiction: e.target.value }); if (errors.jurisdiction) setErrors({ ...errors, jurisdiction: null }); }}
                                        className={`w-full px-4 py-2.5 bg-[var(--background)] border ${errors.jurisdiction ? 'border-red-500' : 'border-[var(--border-subtle)]'} rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-all cursor-pointer`}
                                    >
                                        <option value="">Select Region</option>
                                        {JURISDICTIONS.map(region => (
                                            <option key={region} value={region}>{region}</option>
                                        ))}
                                    </select>
                                    {errors.jurisdiction && <p className="text-red-500 text-xs mt-1 font-medium">{errors.jurisdiction}</p>}
                                </div>
                            </div>
                            <div className="flex gap-4 mt-8">
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                                >
                                    {showCreateModal ? 'Create Account' : 'Save Changes'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { showCreateModal ? setShowCreateModal(false) : setShowEditModal(false); resetForm(); }}
                                    className="flex-1 px-6 py-3 bg-[var(--surface-alt)] hover:bg-[var(--border-strong)] text-[var(--text-primary)] font-bold rounded-xl transition-all active:scale-[0.98]"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[var(--surface)] rounded-2xl p-8 max-w-sm w-full border border-[var(--border-strong)] shadow-2xl"
                    >
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Confirm Action</h2>
                        <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
                            Are you sure you want to delete <strong>{selectedUser?.full_name}</strong>?
                            The user will no longer be able to access the system.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={handleDeleteUser}
                                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }}
                                className="flex-1 px-6 py-3 bg-[var(--surface-alt)] hover:bg-[var(--border-strong)] text-[var(--text-primary)] font-bold rounded-xl transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
