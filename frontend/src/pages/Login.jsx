import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, User, Eye, EyeOff, AlertCircle, ChevronRight, Hash, X, Trash2, Droplet, Users, Microscope, BarChart3, Map, TrendingUp, Search, Clock, MapPin, Wallet, Sparkles, Sun, CheckCircle, Landmark, Building2, Phone, Mail, FileText, Activity, Monitor, Thermometer, Calendar, Home, LayoutGrid, Menu, RefreshCw, Key } from 'lucide-react';
import api from '../services/api';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotUsername, setForgotUsername] = useState('');
    const [forgotMessage, setForgotMessage] = useState('');
    const [resetStep, setResetStep] = useState(1); // 1 for request, 2 for reset
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetError, setResetError] = useState('');

    // Smooth scroll helper
    const scrollToSection = (id) => {
        const isLanding = !searchParams.get('type');
        const scrollOptions = { behavior: 'smooth', block: 'start' };

        if (!isLanding) {
            setSearchParams({});
            setTimeout(() => {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView(scrollOptions);
                }
            }, 100);
        } else {
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView(scrollOptions);
            }
        }
    };
    const [searchParams, setSearchParams] = useSearchParams();
    const isAdminLogin = searchParams.get('type') === 'admin';
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [expandedFaq, setExpandedFaq] = useState(null);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [backendStatus, setBackendStatus] = useState('checking'); // checking, online, offline
    const navigate = useNavigate();
    const isLandingPage = !searchParams.get('type');

    // Check backend health
    const checkBackend = async () => {
        try {
            await api.get('/health');
            setBackendStatus('online');
        } catch (err) {
            setBackendStatus('offline');
            console.error('Backend unreachable:', err);
        }
    };

    useEffect(() => {
        checkBackend();
        // Periodically check if offline or checking
        const interval = setInterval(() => {
            if (backendStatus !== 'online') {
                checkBackend();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [backendStatus]);

    // Captcha State
    const [captchaCode, setCaptchaCode] = useState('');
    const [userCaptcha, setUserCaptcha] = useState('');
    const [isCaptchaError, setIsCaptchaError] = useState(false);

    const generateCaptcha = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing characters
        let result = '';
        for (let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setCaptchaCode(result);
        setUserCaptcha(''); // Auto-clear on refresh
        setIsCaptchaError(false);
    };

    useEffect(() => {
        generateCaptcha();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (userCaptcha.toUpperCase() !== captchaCode) {
            setError('Invalid CAPTCHA code. Please try again.');
            setIsCaptchaError(true);
            setTimeout(() => setIsCaptchaError(false), 500); // Reset shake after 500ms
            setLoading(false);
            return;
        }

        const role = isAdminLogin ? 'admin' : 'officer';

        // Admin login validation (Simplified for UI demo)
        if (isAdminLogin && !username.toLowerCase().includes('admin')) {
            // In a real app, the backend handles this, but for UI feedback:
            // setError('Invalid Admin Credentials');
            // setLoading(false);
            // return;
        }

        try {
            const response = await api.post('/api/v1/auth/login', { username, password });

            // Basic role check if backend doesn't reject mismatched roles automatically
            if (response.data.user.role !== role) {
                throw new Error(`Unauthorized access for ${role} portal.`);
            }

            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('role', response.data.user.role);
            if (response.data.user.jurisdiction) {
                localStorage.setItem('jurisdiction', response.data.user.jurisdiction);
            }
            navigate('/');
        } catch (err) {
            const errorMessage = err.response?.data?.detail || err.message || 'Authentication failed. Verify your credentials.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Clear token on mount to prevent stale sessions
    useEffect(() => {
        if (!searchParams.get('type')) {
            // Only clear if on landing page part to avoid disrupting an active re-verification flow if we had one
            // But for now, let's just ensure no interference
        }
    }, []);



    // Toggle Admin Login
    const toggleAdminLogin = () => {
        const newRole = !isAdminLogin ? 'admin' : 'officer';
        setSearchParams({ type: newRole });
        setError('');
        setUsername('');
        setPassword('');
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 font-sans">

            {/* 1. Tricolour Strip */}
            <div className="h-2 w-full flex">
                <div className="h-full w-1/3 bg-[#FF9933]"></div>
                <div className="h-full w-1/3 bg-white"></div>
                <div className="h-full w-1/3 bg-[#138808]"></div>
            </div>

            {/* 2. Header (Modified) */}
            <header className="bg-white border-b border-gray-200 relative z-20">

                {/* Main Header */}
                <div className="py-4 px-4 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                        {/* Emblem/Logo Area */}
                        <div className="flex items-center justify-center w-16 h-16 bg-[var(--primary)] rounded-lg shadow-sm text-white">
                            <Activity className="w-10 h-10" strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-2xl md:text-3xl font-bold text-[var(--primary)] uppercase tracking-tight leading-none">
                                Civic Risk Intelligence
                            </h1>
                            <h2 className="text-sm font-semibold text-slate-500 tracking-wide -mt-1">
                                Advanced Decision Support System
                            </h2>
                        </div>
                    </div>

                    {/* Desktop Navigation & Breadcrumbs */}
                    <div className="flex flex-col items-end gap-2">
                        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-slate-600 bg-slate-50 p-1 rounded-lg border border-slate-200">
                            <button onClick={() => { setSearchParams({}); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-50 hover:text-[var(--primary)] transition-all">
                                <Home className="w-4 h-4" /> Home
                            </button>
                            <button onClick={() => scrollToSection('capabilities')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-50 hover:text-[var(--primary)] transition-all">
                                <LayoutGrid className="w-4 h-4" /> Capabilities
                            </button>
                            <button onClick={() => scrollToSection('contact')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-50 hover:text-[var(--primary)] transition-all">
                                <Mail className="w-4 h-4" /> Contact
                            </button>
                            <div className="w-px h-4 bg-slate-300 mx-1"></div>
                            <button
                                onClick={() => setShowRoleModal(true)}
                                className="px-4 py-1.5 bg-[var(--primary)] text-white rounded-md hover:bg-[#001e42] transition-colors shadow-sm"
                            >
                                Login
                            </button>
                        </nav>

                        {/* Breadcrumb Context */}
                        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
                            <span>Portal</span>
                            <ChevronRight className="w-3 h-3" />
                            <span className="font-semibold text-[var(--primary)]">Secure Access</span>
                        </div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="lg:hidden absolute top-6 right-4 p-2 text-[var(--primary)] hover:bg-slate-100 rounded-md transition-colors"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Navigation Drawer */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="lg:hidden border-t border-slate-200 bg-white overflow-hidden"
                        >
                            <nav className="flex flex-col p-4 gap-2">
                                <button onClick={() => { setSearchParams({}); window.scrollTo({ top: 0, behavior: 'smooth' }); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-700 font-medium">
                                    <Home className="w-5 h-5 text-[var(--primary)]" /> Home
                                </button>
                                <button onClick={() => { scrollToSection('capabilities'); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-700 font-medium">
                                    <LayoutGrid className="w-5 h-5 text-[var(--primary)]" /> Capabilities
                                </button>
                                <button onClick={() => { scrollToSection('contact'); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-700 font-medium">
                                    <Mail className="w-5 h-5 text-[var(--primary)]" /> Contact
                                </button>
                                <div className="h-px bg-slate-100 my-2"></div>
                                <button
                                    onClick={() => { setShowRoleModal(true); setIsMobileMenuOpen(false); }}
                                    className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--primary)] text-white rounded-lg font-bold shadow-sm"
                                >
                                    Log In
                                </button>
                            </nav>
                        </motion.div>
                    )}
                </AnimatePresence>

            </header >




            {/* 3. Main Content Area */}
            {
                isLandingPage ? (
                    /* --- LANDING PAGE VIEW (15 Sections) --- */
                    <main className="flex-grow flex flex-col relative z-10 w-full overflow-hidden">

                        {/* Section 1: Hero */}
                        <section className="w-full pt-16 pb-20 px-6 md:px-16 relative overflow-hidden border-b border-slate-100">
                            {/* Interactive Aurora Background */}
                            <div className="absolute inset-0 bg-slate-50/50"></div>
                            <div className="absolute top-[-10%] right-[-5%] w-[70%] h-[70%] rounded-full bg-blue-100/40 blur-[80px] animate-pulse"></div>
                            <div className="absolute top-[20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100/40 blur-[100px]"></div>
                            <div className="absolute bottom-[-10%] right-[20%] w-[40%] h-[60%] rounded-full bg-teal-50/40 blur-[60px]"></div>

                            {/* Subtle Mesh Overlay */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.8),rgba(255,255,255,0.4))] backdrop-blur-[1px]"></div>

                            <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.6 }}
                                    className="text-left"
                                >
                                    <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-[var(--primary)] rounded-md text-xs font-bold uppercase tracking-wider border border-blue-100/50">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>AI-Powered Platform</span>
                                    </div>

                                    <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 leading-[1.1] tracking-tight">
                                        Intelligence-driven <br />
                                        <span className="text-[var(--primary)]">Risk Management</span>
                                    </h1>

                                    <p className="text-lg text-slate-600 mb-10 max-w-xl leading-relaxed font-normal">
                                        Empowering <span className="font-semibold text-slate-800">urban organizations</span> with predictive risk analytics, resource optimization, and proactive management solutions.
                                    </p>

                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <button
                                            onClick={() => setShowRoleModal(true)}
                                            className="btn-primary flex items-center justify-center gap-2"
                                        >
                                            Access System <ChevronRight className="w-4 h-4 block" />
                                        </button>
                                        <button
                                            onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
                                            className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-md font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                                        >
                                            View Documentation
                                        </button>
                                    </div>

                                    <div className="mt-10 flex items-center gap-6 text-sm text-slate-500 font-medium">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-[var(--secondary)]" />
                                            <span>Cloud Ready</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-[var(--secondary)]" />
                                            <span>Secure & Certified</span>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Hero Visual - Digital Twin Wireframe */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 1 }}
                                    className="relative hidden md:flex items-center justify-center h-[500px]"
                                >
                                    {/* 3D Perspective Container */}
                                    <div className="relative w-[400px] h-[400px]" style={{ perspective: '1000px' }}>

                                        {/* Floating Elements (HUD) */}
                                        <motion.div
                                            animate={{ y: [-10, 10, -10] }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                            className="absolute -top-12 -right-12 z-50 bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 p-4 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.15)]"
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={`w-2 h-2 rounded-full bg-cyan-400 animate-pulse`}></div>
                                                <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Live Feed</span>
                                            </div>
                                            <div className="space-y-1 font-mono text-xs">
                                                <div className="flex justify-between gap-8 text-slate-400"><span>Grid Lat:</span> <span className="text-slate-200">18.5204° N</span></div>
                                                <div className="flex justify-between gap-8 text-slate-400"><span>Grid Long:</span> <span className="text-slate-200">73.8567° E</span></div>
                                                <div className="flex justify-between gap-8 text-slate-400"><span>Active Nodes:</span> <span className="text-cyan-400">8,492</span></div>
                                            </div>
                                        </motion.div>

                                        <div className="absolute -bottom-10 -left-12 z-50 bg-white/90 backdrop-blur-md border border-slate-200 p-4 rounded-lg shadow-xl flex items-center gap-4">
                                            <div className="bg-red-50 p-2 rounded-md">
                                                <AlertCircle className="w-6 h-6 text-red-600 animate-pulse" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Critical Alert</div>
                                                <div className="text-sm font-bold text-slate-900">Zone B-4 Breached</div>
                                            </div>
                                        </div>

                                        {/* Tilted Map Plane */}
                                        <motion.div
                                            className="absolute inset-0 bg-slate-900/80 rounded-xl border border-slate-700/50 shadow-2xl overflow-hidden backdrop-blur-sm"
                                            style={{ transform: 'rotateX(55deg) rotateZ(20deg) scale(0.9)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
                                            animate={{ rotateZ: 20 }} // Static rotation for stability vs spin
                                        >
                                            {/* Grid Lines */}
                                            <div className="absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.15)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>

                                            {/* Scanning Laser Beam */}
                                            <motion.div
                                                animate={{ top: ['-20%', '120%'] }}
                                                transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                                                className="absolute left-0 right-0 h-16 bg-gradient-to-b from-cyan-400/20 to-transparent blur-md z-10 border-t border-cyan-400/50"
                                            ></motion.div>

                                            {/* 3D Building Blocks (Simulated with absolute divs) */}
                                            <div className="absolute top-1/4 left-1/4 w-16 h-16 bg-blue-500/20 border border-blue-400/30"></div>
                                            <div className="absolute top-1/2 left-1/3 w-24 h-12 bg-indigo-500/20 border border-indigo-400/30"></div>
                                            <div className="absolute bottom-1/4 right-1/4 w-20 h-20 bg-cyan-500/20 border border-cyan-400/30"></div>

                                            {/* Hotspots */}
                                            <div className="absolute top-[30%] left-[40%]">
                                                <div className="w-8 h-8 rounded-full bg-red-500/20 animate-ping absolute"></div>
                                                <div className="w-3 h-3 rounded-full bg-red-500 relative z-20 shadow-[0_0_10px_rgba(239,68,68,1)]"></div>
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[1px] h-12 bg-gradient-to-t from-red-500 to-transparent"></div>
                                            </div>

                                            <div className="absolute bottom-[25%] right-[35%]">
                                                <div className="w-20 h-20 rounded-full bg-orange-400/10 animate-ping absolute -ml-8 -mt-8" style={{ animationDuration: '3s' }}></div>
                                                <div className="w-2 h-2 rounded-full bg-orange-400 relative z-20"></div>
                                            </div>

                                            {/* Connection Lines */}
                                            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                                                <path d="M100,100 L200,200 L150,300" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="5,5" />
                                                <circle cx="200" cy="200" r="3" fill="#22d3ee" />
                                            </svg>
                                        </motion.div>

                                        {/* Decorative Glow */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none -z-10 mix-blend-screen"></div>

                                    </div>
                                </motion.div>
                            </div>
                        </section>

                        {/* Section 2: Problem Statement - Clean & Professional */}
                        <section className="w-full py-20 bg-gradient-to-b from-slate-50 to-white border-y border-slate-200">
                            <div className="max-w-7xl mx-auto px-6 md:px-12">
                                <div className="text-center mb-20 max-w-3xl mx-auto">
                                    <span className="inline-block px-4 py-1.5 bg-blue-100 text-[var(--primary)] rounded-full text-xs font-bold uppercase tracking-wider mb-4">Core Challenges</span>
                                    <h2 className="text-4xl font-bold text-slate-900 mb-5 tracking-tight">Addressing Critical Civic Issues</h2>
                                    <p className="text-slate-600 text-lg leading-relaxed">Targeting the most pressing pain points in urban administration with data-driven precision and proactive intelligence.</p>
                                </div>

                                <div className="grid md:grid-cols-4 gap-6">
                                    {[
                                        { icon: Trash2, color: "text-red-700", bg: "bg-red-50", border: "border-red-100", title: "Waste Management", desc: "Optimizing collection routes & overflow prevention." },
                                        { icon: Droplet, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-100", title: "Water Distribution", desc: "Predicting shortages & managing supply equity." },
                                        { icon: Sun, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-100", title: "Urban Heat Islands", desc: "Monitoring thermal stress in dense zones." },
                                        { icon: Users, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-100", title: "Crowd Control", desc: "Real-time density monitoring for safety." }
                                    ].map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5, delay: i * 0.1 }}
                                            viewport={{ once: true }}
                                            className="p-6 rounded-xl landing-glass-card group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-100 to-transparent rounded-bl-full opacity-50 group-hover:from-blue-100 group-hover:opacity-100 transition-all duration-500"></div>
                                            <div className={`w-14 h-14 ${item.bg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 relative z-10 shadow-sm border border-white/50`}>
                                                <item.icon className={`w-7 h-7 ${item.color}`} strokeWidth={2} />
                                            </div>
                                            <h3 className="font-bold text-slate-900 text-lg mb-3 relative z-10 group-hover:text-[var(--primary)] transition-colors">{item.title}</h3>
                                            <p className="text-slate-600 text-sm leading-relaxed relative z-10">{item.desc}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Section 3: How It Works - Process Flow */}
                        <section id="how-it-works" className="w-full py-20 bg-white relative">
                            <div className="max-w-7xl mx-auto px-6 md:px-12">
                                <div className="text-center mb-16">
                                    <span className="text-[var(--primary)] font-bold tracking-wider uppercase text-xs mb-2 block">Operational Architecture</span>
                                    <h2 className="text-3xl font-bold text-slate-900">Intelligence Cycle</h2>
                                </div>

                                <div className="grid md:grid-cols-3 gap-8 relative">
                                    {/* Connecting Arrows (Desktop) */}
                                    <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-slate-200 z-0"></div>
                                    <div className="hidden md:block absolute top-10 left-[48%] transform rotate-45 border-t-2 border-r-2 border-slate-200 w-4 h-4 z-0"></div>
                                    <div className="hidden md:block absolute top-10 right-[18%] transform rotate-45 border-t-2 border-r-2 border-slate-200 w-4 h-4 z-0"></div>

                                    {[
                                        { step: "01", title: "Data Aggregation", desc: "Integrates historical records, satellite imagery, and IoT sensor feeds.", icon: BarChart3 },
                                        { step: "02", title: "Predictive Analysis", desc: "AI models forecast potential risks and identify hotspots spatially.", icon: TrendingUp },
                                        { step: "03", title: "Proactive Response", desc: "Automated alerts enable preemptive resource deployment.", icon: Shield }
                                    ].map((item, i) => (
                                        <div key={i} className="relative z-10 flex flex-col items-center text-center group">
                                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-4 border-slate-50 shadow-sm mb-6 group-hover:border-blue-50 transition-colors">
                                                <div className="w-16 h-16 bg-[var(--primary)] text-white rounded-full flex items-center justify-center shadow-lg">
                                                    <item.icon className="w-8 h-8" strokeWidth={1.5} />
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                                            <p className="text-slate-600 text-sm leading-relaxed max-w-xs">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>


                        {/* Section 5: Strategic Benefits */}
                        <section id="capabilities" className="w-full py-20 bg-slate-50 border-t border-slate-200">
                            <div className="w-full px-6 md:px-12 max-w-7xl mx-auto">
                                <h2 className="text-3xl font-bold text-center mb-16 text-slate-900">System Capabilities</h2>
                                <div className="grid md:grid-cols-4 gap-6">
                                    {[
                                        { title: "Early Warning", desc: "Get 7-30 days advance notice on resource crunches.", icon: Clock },
                                        { title: "Hotspot Intel", desc: "Geo-spatial identification of high-risk zones.", icon: MapPin },
                                        { title: "Cost Optimization", desc: "Reduce emergency deployment expenses by 40%.", icon: Wallet },
                                        { title: "Data-Driven Policy", desc: "Move from reactive to proactive decision-making.", icon: BarChart3 }
                                    ].map((item, i) => (
                                        <div key={i} className="p-6 bg-white landing-card-gradient-border landing-glass-card group relative overflow-hidden text-center hover:bg-white/80">
                                            <div className="relative z-10">
                                                <div className="w-16 h-16 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                                                    <item.icon className="w-8 h-8 text-[var(--secondary)]" strokeWidth={1.5} />
                                                </div>
                                                <h3 className="font-bold text-slate-900 mb-2 text-lg">{item.title}</h3>
                                                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Section 7: Request Demo Form */}
                        <section id="contact" className="w-full py-20 bg-gradient-to-b from-slate-50 to-white border-t border-slate-200">
                            <div className="max-w-2xl mx-auto px-6">
                                <div className="bg-white p-10 md:p-14 rounded-2xl shadow-xl border border-slate-200 relative overflow-hidden">
                                    {/* Decorative Elements */}
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full opacity-50"></div>
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-slate-50 to-transparent rounded-tr-full opacity-50"></div>

                                    <div className="text-center mb-10 relative z-10">
                                        <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--primary)] rounded-xl mb-5 shadow-lg">
                                            <Activity className="w-8 h-8 text-white" />
                                        </div>
                                        <h2 className="text-3xl font-bold text-slate-900 mb-3">Request System Access</h2>
                                        <p className="text-slate-600 text-base">For Authorized Organizations</p>
                                    </div>
                                    <form className="space-y-5 relative z-10" onSubmit={(e) => e.preventDefault()}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wider">Organization Name</label>
                                                <div className="relative">
                                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-slate-900 placeholder:text-slate-400"
                                                        placeholder="e.g. Pune Municipal Corp"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wider">City/Zone</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-slate-900 placeholder:text-slate-400"
                                                        placeholder="City Name"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wider">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="email"
                                                    className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-slate-900 placeholder:text-slate-400"
                                                    placeholder="name@organization.com"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wider">Mobile Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="tel"
                                                    className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-slate-900 placeholder:text-slate-400"
                                                    placeholder="Phone Number"
                                                />
                                            </div>
                                        </div>
                                        <div className="pt-4">
                                            <button
                                                type="submit"
                                                className="w-full py-4 bg-gradient-to-r from-[var(--primary)] to-[#001e42] text-white rounded-lg font-bold text-base uppercase tracking-wider hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                                            >
                                                Submit Request
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <p className="text-xs text-center text-slate-500 pt-2">
                                            By submitting, you agree to the <a href="#" className="underline hover:text-[var(--primary)] transition-colors">Terms of Service</a>. Verification required.
                                        </p>
                                    </form>
                                </div>
                            </div>
                        </section>
                        {/* Section 9: Public Impact */}
                        <section className="w-full py-20 bg-indigo-50/50 border-y border-indigo-100">
                            <div className="max-w-4xl mx-auto px-6 text-center">
                                <h2 className="text-3xl font-bold text-slate-900 mb-10">Civic Value Proposition</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        "Sanitation Efficiency", "Water Security", "Crowd Safety", "Rapid Redressal"
                                    ].map((item, i) => (
                                        <div key={i} className="flex flex-col items-center gap-3 p-4 bg-green-50 rounded-xl">
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                            <span className="font-semibold text-slate-700 text-sm">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>





                        {/* Section 12: FAQs with Accordion */}
                        <section className="w-full py-20 bg-white border-t border-slate-200">
                            <div className="max-w-4xl mx-auto px-6">
                                <div className="text-center mb-14">
                                    <span className="inline-block px-4 py-1.5 bg-blue-100 text-[var(--primary)] rounded-full text-xs font-bold uppercase tracking-wider mb-4">Support Matrix</span>
                                    <h2 className="text-4xl font-bold text-slate-900 mb-4">System Inquiries</h2>
                                    <p className="text-slate-600 text-lg">Technical specifications and access protocols</p>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { q: "How is access provisioned?", a: "Access is strictly regulated. Authorized personnel from registered municipal bodies are issued secure credentials after verification." },
                                        { q: "What is the scope of intelligence?", a: "The platform integrates predictive modeling for waste, water, and crowd dynamics with real-time risk assessment." },
                                        { q: "What are the deployment prerequisites?", a: "The system is cloud-native and requires minimal local infrastructure. Data integration is handled via secure APIs." },
                                        { q: "Is the data end-to-end encrypted?", a: "Yes. We adhere to the highest government data security standards with ongoing audit logs and role-based access." }
                                    ].map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: i * 0.05 }}
                                            viewport={{ once: true }}
                                            className="border border-slate-200 rounded-lg overflow-hidden bg-white hover:border-slate-300 transition-colors"
                                        >
                                            <button
                                                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                                                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-blue-50/30 transition-colors group"
                                            >
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedFaq === i ? 'bg-[var(--primary)] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                        <span className="font-bold text-xs">{expandedFaq === i ? '-' : '+'}</span>
                                                    </div>
                                                    <h4 className={`font-bold text-base md:text-lg transition-colors ${expandedFaq === i ? 'text-[var(--primary)]' : 'text-slate-900'}`}>{item.q}</h4>
                                                </div>
                                                <motion.div
                                                    animate={{ rotate: expandedFaq === i ? 90 : 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="flex-shrink-0 ml-4"
                                                >
                                                    <ChevronRight className={`w-5 h-5 transition-colors ${expandedFaq === i ? 'text-[var(--primary)]' : 'text-slate-400'}`} />
                                                </motion.div>
                                            </button>
                                            <AnimatePresence>
                                                {expandedFaq === i && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="px-6 pb-5 pl-11 border-t border-slate-100 pt-4">
                                                            <p className="text-slate-600 leading-relaxed">{item.a}</p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </section>




                        {/* Section 15: Call to Action (Big Footer) */}
                        <section className="w-full py-20 bg-[#000080] text-white text-center">
                            <div className="max-w-4xl mx-auto px-6">
                                <h2 className="text-3xl md:text-5xl font-black mb-10">Ready to Deploy Intelligent Governance?</h2>
                                <div className="flex flex-col md:flex-row gap-6 justify-center">
                                    <button
                                        onClick={() => scrollToSection('contact')}
                                        className="px-8 py-4 bg-[#FF9933] text-white rounded-lg font-bold text-lg shadow-xl hover:bg-orange-600 transition-colors"
                                    >
                                        Request System Access
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Section 14: System Status (Visual Strip) */}
                        {/* Section 14: System Status (Visual Strip) */}
                        <div className="w-full bg-[#1e293b] border-t border-white/10 py-2">
                            <div className="max-w-7xl mx-auto px-4 lg:px-12 flex justify-between items-center text-[10px] text-gray-400 font-mono">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> System Status: Operational</span>
                                    <span>Updates: 14 Feb 2026</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span>Coverage: Kerala</span>
                                    <span>Uptime: 99.8%</span>
                                </div>
                            </div>
                        </div>

                    </main>
                ) : (
                    /* --- EXISTING LOGIN FORM VIEW --- */
                    <div className="flex-grow flex items-center justify-center p-4 md:p-8 relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">

                        {/* Background Decor */}
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-slate-100/50 pointer-events-none"></div>

                        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center relative z-10">

                            {/* Left Side: Information / Creative Text */}
                            <div className="hidden md:flex flex-col max-w-lg">
                                <div className="mb-6 inline-block">
                                    <span className="bg-slate-900/50 text-slate-600 text-[10px] font-bold px-3 py-1 rounded border border-slate-300 flex items-center gap-2 uppercase tracking-widest backdrop-blur-sm">
                                        <Lock className="w-3 h-3 text-[#000080]" />
                                        Official Personnel Only
                                    </span>
                                </div>
                                <h2 className="text-4xl font-bold text-gray-800 mb-6 leading-tight">
                                    Spatio-Temporal Intelligence<br />
                                    <span className="text-[#FF9933]">Smarter</span> & <span className="text-[#138808]">Safer</span> Governance
                                </h2>
                                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                                    Empowering civic authorities with real-time data insights, predictive modeling, and efficient resource allocation tools.
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-[#FF9933]">
                                        <h4 className="font-bold text-gray-800 text-lg">24/7</h4>
                                        <p className="text-sm text-gray-500">Real-time Monitoring</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-[#138808]">
                                        <h4 className="font-bold text-gray-800 text-lg">Secure</h4>
                                        <p className="text-sm text-gray-500">End-to-End Encrypted</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Login Form */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className="w-full max-w-md mx-auto"
                            >
                                <div className={`
                                bg-white rounded-xl shadow-2xl overflow-hidden border-t-4 transition-all duration-300
                                ${isAdminLogin ? 'border-[#000080]' : 'border-[#FF9933]'}
                            `}>
                                    {/* Login Header */}
                                    <div className="p-8 pb-0 text-center">
                                        <h3 className="text-2xl font-bold text-gray-800 mb-2">
                                            {isAdminLogin ? 'Administrator Login' : 'Officer Login'}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Please enter your {isAdminLogin ? 'admin' : 'civic'} credentials
                                        </p>
                                    </div>

                                    {/* Form */}
                                    <div className="p-8 pt-6">
                                        <AnimatePresence mode="wait">
                                            {error && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm"
                                                >
                                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                    <span>{error}</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <form onSubmit={handleLogin} className="space-y-5">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                    {isAdminLogin ? 'Admin Username' : 'Civic ID'}
                                                </label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        {isAdminLogin
                                                            ? <Shield className="h-5 w-5 text-gray-400 group-focus-within:text-[#000080] transition-colors" />
                                                            : <User className="h-5 w-5 text-gray-400 group-focus-within:text-[#FF9933] transition-colors" />
                                                        }
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={username}
                                                        onChange={(e) => setUsername(e.target.value)}
                                                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:outline-none transition-all text-gray-900 bg-white"
                                                        style={{
                                                            '--tw-ring-color': isAdminLogin ? '#000080' : '#FF9933'
                                                        }}
                                                        placeholder={isAdminLogin ? "admin" : "officer123"}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                    Password
                                                </label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#000080] transition-colors" />
                                                    </div>
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:outline-none transition-all text-gray-900 bg-white"
                                                        style={{
                                                            '--tw-ring-color': isAdminLogin ? '#000080' : '#FF9933'
                                                        }}
                                                        placeholder="••••••••"
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                                                    >
                                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                                <div className="flex justify-end mt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowForgotModal(true)}
                                                        className="text-xs font-semibold text-slate-500 hover:text-[var(--primary)] transition-colors"
                                                    >
                                                        Forgot Password?
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Captcha Section */}
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="bg-slate-100 border border-slate-300 rounded-lg px-4 py-2 flex items-center gap-3 select-none w-full relative overflow-hidden group">
                                                    {/* Visual Noise */}
                                                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] pointer-events-none"></div>
                                                    <div className="absolute top-1/2 left-4 w-full h-0.5 bg-slate-400/20 -rotate-3 pointer-events-none"></div>
                                                    <div className="absolute top-1/3 left-0 w-full h-0.5 bg-slate-400/20 rotate-12 pointer-events-none"></div>

                                                    <span className="font-mono text-xl font-bold tracking-[0.3em] text-black z-20 font-black relative" style={{ textShadow: '2px 2px 0px rgba(255,255,255,0.5)' }}>
                                                        {captchaCode.split('').join(' ')}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={generateCaptcha}
                                                        className="ml-auto p-1.5 text-slate-500 hover:text-[var(--primary)] hover:bg-white rounded-full transition-all active:rotate-180 duration-300"
                                                        title="Refresh Code"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <motion.input
                                                    animate={isCaptchaError ? { x: [-10, 10, -10, 10, 0] } : {}}
                                                    transition={{ duration: 0.4 }}
                                                    type="text"
                                                    value={userCaptcha}
                                                    onChange={(e) => {
                                                        setUserCaptcha(e.target.value);
                                                        if (isCaptchaError) setIsCaptchaError(false);
                                                    }}
                                                    className={`w-24 p-2.5 border rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-offset-0 focus:outline-none uppercase transition-colors text-gray-900 bg-white ${isCaptchaError ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                                    style={{
                                                        '--tw-ring-color': isCaptchaError ? '#ef4444' : (isAdminLogin ? '#000080' : '#FF9933')
                                                    }}
                                                    placeholder="CODE"
                                                    maxLength={5}
                                                    required
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={loading || backendStatus !== 'online'}
                                                className={`
                                                w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white 
                                                focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200
                                                ${(loading || backendStatus !== 'online') ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'}
                                            `}
                                                style={{
                                                    backgroundColor: backendStatus === 'offline' ? '#94a3b8' : (isAdminLogin ? '#000080' : '#FF9933'),
                                                    boxShadow: (loading || backendStatus !== 'online') ? 'none' : (isAdminLogin ? '0 4px 14px 0 rgba(0,0,128,0.3)' : '0 4px 14px 0 rgba(255,153,51,0.3)')
                                                }}
                                            >
                                                {loading ? (
                                                    <div className="flex items-center gap-2">
                                                        <RefreshCw className="w-4 h-4 animate-spin" /> Authenticating...
                                                    </div>
                                                ) : backendStatus === 'offline' ? (
                                                    <div className="flex items-center gap-2">
                                                        <AlertCircle className="w-4 h-4" /> Backend Offline
                                                    </div>
                                                ) : backendStatus === 'checking' ? (
                                                    <div className="flex items-center gap-2">
                                                        <RefreshCw className="w-4 h-4 animate-spin" /> Initializing...
                                                    </div>
                                                ) : (
                                                    'Secure Login'
                                                )}
                                            </button>
                                        </form>
                                    </div>

                                </div>
                            </motion.div>
                        </div>
                    </div>
                )
            }

            {/* 4. Footer (NIC Standard) */}
            <footer className="bg-[#1e293b] text-white py-6 border-t-4 border-[#FF9933]">
                <div className="max-w-7xl mx-auto px-4 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-6 text-sm">
                        <div>
                            <h5 className="font-bold text-[#FF9933] mb-2 uppercase text-xs tracking-wider">About Platform</h5>
                            <p className="text-gray-300 text-xs leading-relaxed">
                                An enterprise-grade decision support system for urban analytics and risk management.
                                Empowering organizations with AI-driven insights for proactive management and efficient operations.
                            </p>
                        </div>
                        <div className="text-center md:text-left">
                            <ul className="space-y-1 text-xs text-gray-400">
                                <li><a href="#" className="hover:text-white transition-colors">Website Policies</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Copyright Policy</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Hyperlinking Policy</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Terms & Conditions</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Help & Support</a></li>
                            </ul>
                        </div>
                        <div className="flex flex-col items-center md:items-end">
                            <div className="flex flex-col items-center md:items-end">
                                <div className="p-2 bg-white/10 rounded mb-2">
                                    <span className="font-bold text-lg tracking-widest text-white">Civic Risk Intelligence</span>
                                </div>
                                <p className="text-xs text-gray-500">© 2026 Civic Risk Intelligence. All rights reserved.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>


            {/* Role Selection Modal */}
            <AnimatePresence>
                {showRoleModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowRoleModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ type: "spring", duration: 0.3 }}
                            className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/50 ring-1 ring-black/5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative p-6 px-8 border-b border-gray-100/50 bg-gradient-to-r from-white/50 to-blue-50/20">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2 font-display">
                                            <Shield className="w-6 h-6 text-[#FF9933] fill-current opacity-90" />
                                            Select Login Type
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1 ml-9 font-medium">Choose your authorized access portal</p>
                                    </div>
                                    <button
                                        onClick={() => setShowRoleModal(false)}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 grid gap-4 bg-gradient-to-b from-white to-gray-50/50">
                                <button
                                    onClick={() => {
                                        setSearchParams({ type: 'admin' });
                                        setShowRoleModal(false);
                                    }}
                                    className="group relative flex items-center justify-between p-5 bg-white border border-gray-100 rounded-xl hover:border-[#000080]/30 hover:shadow-[0_8px_30px_rgb(0,0,128,0.06)] transition-all duration-300 text-left overflow-hidden ring-1 ring-gray-100 hover:ring-[#000080]/20"
                                >
                                    <div className="absolute inset-0 bg-blue-50/0 group-hover:bg-blue-50/30 transition-colors duration-300" />
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#000080] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-l-xl" />

                                    <div className="relative flex items-center gap-5">
                                        <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-[#000080] group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-blue-900/20">
                                            <Shield className="w-7 h-7 text-[#000080] group-hover:text-white transition-colors" />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="block font-bold text-gray-800 text-lg group-hover:text-[#000080] transition-colors leading-tight">Admin</span>
                                            <span className="text-xs font-medium text-gray-500 group-hover:text-gray-600 uppercase tracking-wide">Administrator Access</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#000080] group-hover:translate-x-1 transition-all duration-300" />
                                </button>

                                <button
                                    onClick={() => {
                                        setSearchParams({ type: 'officer' });
                                        setShowRoleModal(false);
                                    }}
                                    className="group relative flex items-center justify-between p-5 bg-white border border-gray-100 rounded-xl hover:border-[#FF9933]/30 hover:shadow-[0_8px_30px_rgb(255,153,51,0.06)] transition-all duration-300 text-left overflow-hidden ring-1 ring-gray-100 hover:ring-[#FF9933]/20"
                                >
                                    <div className="absolute inset-0 bg-orange-50/0 group-hover:bg-orange-50/30 transition-colors duration-300" />
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#FF9933] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-l-xl" />

                                    <div className="relative flex items-center gap-5">
                                        <div className="h-14 w-14 rounded-2xl bg-orange-50 flex items-center justify-center group-hover:bg-[#FF9933] group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-orange-900/20">
                                            <User className="w-7 h-7 text-[#FF9933] group-hover:text-white transition-colors" />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="block font-bold text-gray-800 text-lg group-hover:text-[#e68a00] transition-colors leading-tight">Officer</span>
                                            <span className="text-xs font-medium text-gray-500 group-hover:text-gray-600 uppercase tracking-wide">Field Officer Access</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#FF9933] group-hover:translate-x-1 transition-all duration-300" />
                                </button>
                            </div>

                            <div className="p-4 px-8 bg-gray-50/80 border-t border-gray-100 flex justify-between items-center backdrop-blur-sm">
                                <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Secure Access
                                </span>
                                <button
                                    onClick={() => setShowRoleModal(false)}
                                    className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors text-xs uppercase tracking-wide"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reset Modal */}
            <AnimatePresence>
                {showForgotModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowForgotModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden border border-slate-200"
                        >
                            <div className="bg-[var(--primary)] p-6 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Key className="w-6 h-6" /> Account Recovery
                                    </h3>
                                    <p className="text-blue-100 text-sm mt-1">Request a secure password reset</p>
                                </div>
                                <button onClick={() => { setShowForgotModal(false); setForgotMessage(''); setForgotUsername(''); setResetError(''); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-8">
                                <AnimatePresence mode="wait">
                                    {forgotMessage ? (
                                        <motion.div
                                            key="success"
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="text-center py-4"
                                        >
                                            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-5 border-2 border-green-100">
                                                <CheckCircle className="w-12 h-12" />
                                            </div>
                                            <h4 className="text-lg font-bold text-slate-800 mb-2">Check Your Email</h4>
                                            <p className="text-slate-600 text-sm leading-relaxed mb-6">{forgotMessage}</p>
                                            <button
                                                onClick={() => { setShowForgotModal(false); setForgotMessage(''); setForgotUsername(''); }}
                                                className="px-8 py-3 bg-[var(--primary)] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                                            >
                                                Back to Login
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <motion.form
                                            key="form"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onSubmit={async (e) => {
                                                e.preventDefault();
                                                setResetError('');
                                                try {
                                                    setLoading(true);
                                                    await api.post('/api/v1/auth/forgot-password', { username_or_email: forgotUsername });
                                                    setForgotMessage('A password reset link has been sent to the email associated with your account. Click the link to set a new password. The link expires in 15 minutes.');
                                                } catch (err) {
                                                    setResetError(err.response?.data?.detail || 'Failed to submit request. Please check your username or email.');
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            className="space-y-5"
                                        >
                                            {resetError && (
                                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                                    {resetError}
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Civic Email Address</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Mail className="h-4 w-4 text-slate-400" />
                                                    </div>
                                                    <input
                                                        type="email"
                                                        value={forgotUsername}
                                                        onChange={(e) => setForgotUsername(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900 bg-white"
                                                        placeholder="Enter your registered civic email"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                disabled={loading}
                                                className="w-full py-3 bg-[var(--primary)] text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                                {loading ? 'Sending...' : 'Send Reset Link'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowForgotModal(false)}
                                                className="w-full text-slate-500 text-sm font-medium hover:text-slate-800"
                                            >
                                                Back to Login
                                            </button>
                                        </motion.form>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Login;