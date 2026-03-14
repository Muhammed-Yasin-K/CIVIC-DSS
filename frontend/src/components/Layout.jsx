import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Home, Activity, FileText, LogOut, LucideLayoutDashboard, AlertTriangle, TrendingUp, ClipboardCheck, BarChart3, Brain, Database, Settings, MapPin, User, Users, Calendar, FileCheck, Edit3, CheckSquare, BookOpen, Phone, CalendarDays, LifeBuoy } from 'lucide-react';
import { motion } from 'framer-motion';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        // Navigate to login and scroll to top for landing page experience
        navigate('/login');
        window.scrollTo({ top: 0, behavior: 'instant' });
    };

    const NavItem = ({ to, icon: Icon, label }) => {
        const isActive = location.pathname === to;
        return (
            <Link to={to} className={`flex items-center gap-3 p-3 rounded-xl transition-all mb-1 group relative ${isActive
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-alt)]'
                }`}>
                <Icon size={18} className={isActive ? 'text-white' : 'group-hover:text-[var(--primary)] transition-colors'} />
                <span className={`text-sm font-bold tracking-tight ${isActive ? 'text-white' : 'group-hover:translate-x-1 transition-transform'}`}>{label}</span>
                {isActive && (
                    <motion.div
                        layoutId="active-pill"
                        className="ml-auto w-1 h-4 rounded-full bg-white/50"
                    />
                )}
            </Link>
        );
    };

    return (
        <div className="flex min-h-screen bg-[var(--background)] text-[var(--text-primary)] transition-colors duration-300">
            {/* Professional Sidebar */}
            <motion.aside
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-64 fixed h-full z-20 hidden md:flex flex-col border-r border-[var(--border-subtle)] bg-[var(--surface)] transition-colors duration-300"
            >
                <div className="p-8 border-b border-[var(--border-subtle)]">
                    <div className="flex flex-col items-center">
                        <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-indigo-600 border border-white/10">
                            <Activity className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tighter uppercase mb-2">CIVIC RISK</h2>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-[var(--border-subtle)] bg-[var(--surface-alt)] ${role === 'admin'
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-blue-600 dark:text-blue-400'}`}>
                            {role === 'officer' ? 'Officer Portal' : role === 'admin' ? 'Admin Portal' : 'User Portal'}
                        </span>
                    </div>
                </div>

                <nav className="p-4 flex-1 overflow-y-auto">
                    {/* OFFICER MENU */}
                    {role === 'officer' && (
                        <>
                            <div className="mb-6">
                                <p className="px-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Operations</p>
                                <NavItem to="/" icon={LucideLayoutDashboard} label="Dashboard" />
                                <NavItem to="/hotspots" icon={TrendingUp} label="Hotspot Insights" />
                                <NavItem to="/forecast" icon={BarChart3} label="Trend Forecasting" />
                                <NavItem to="/profile" icon={User} label="My Profile" />
                            </div>

                            <div className="mb-6">
                                <p className="px-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">My Work</p>
                                <NavItem to="/inspections" icon={ClipboardCheck} label="My Inspections" />
                                <NavItem to="/tasks" icon={CheckSquare} label="My Tasks" />
                            </div>

                            <div>
                                <p className="px-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Resources</p>
                                <NavItem to="/knowledge-base" icon={BookOpen} label="Intelligence Portal" />
                                <NavItem to="/helpdesk" icon={LifeBuoy} label="Helpdesk & Support" />
                            </div>
                        </>
                    )}

                    {/* ADMIN MENU */}
                    {role === 'admin' && (
                        <>
                            <div className="mb-6">
                                <p className="px-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Analytics</p>
                                <NavItem to="/" icon={LucideLayoutDashboard} label="Global Dashboard" />
                                <NavItem to="/hotspots" icon={TrendingUp} label="Hotspot Insights" />
                                <NavItem to="/forecast" icon={BarChart3} label="Trend Forecasting" />
                                <NavItem to="/admin/inspections" icon={ClipboardCheck} label="Inspection Management" />
                                <NavItem to="/reports" icon={FileText} label="Reports & Export" />
                                <NavItem to="/profile" icon={User} label="My Profile" />
                            </div>

                            <div className="mb-6">
                                <p className="px-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">System</p>
                                <NavItem to="/admin/model-config" icon={Brain} label="Model Config" />
                                <NavItem to="/admin/data-management" icon={Database} label="Data Management" />
                                <NavItem to="/config" icon={Settings} label="System Settings" />
                            </div>

                            <div>
                                <p className="px-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Administration</p>
                                <NavItem to="/events" icon={Calendar} label="Event Management" />
                                <NavItem to="/users" icon={Users} label="User Management" />
                                <NavItem to="/admin/zones" icon={MapPin} label="Zones & Wards" />
                                <NavItem to="/alerts" icon={AlertTriangle} label="System Alerts" />
                                <NavItem to="/admin/support" icon={LifeBuoy} label="Support Tickets" />
                                <NavItem to="/audit-logs" icon={FileCheck} label="Audit Logs" />
                            </div>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-alt)]/30">
                    {token ? (
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-sm font-medium">
                            <LogOut size={18} /> Sign Out
                        </button>
                    ) : (
                        <Link to="/login" className="w-full flex items-center gap-3 p-3 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all text-sm font-medium">
                            <Shield size={18} /> Sign In
                        </Link>
                    )}
                </div>
            </motion.aside >

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 bg-[var(--background)] min-h-screen bg-grid-pattern relative transition-colors duration-300">
                <div className="max-w-[1600px] mx-auto p-6 lg:p-10">
                    <Outlet />
                </div>
            </main>
        </div >
    );
};

export default Layout;
