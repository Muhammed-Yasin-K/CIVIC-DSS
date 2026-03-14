import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <div
            onClick={toggleTheme}
            className={`
                relative w-16 h-8 rounded-full p-1 cursor-pointer transition-colors duration-500 ease-in-out
                ${theme === 'dark' ? 'bg-slate-800 border border-slate-600' : 'bg-blue-100 border border-blue-200'}
                shadow-inner
            `}
        >
            <motion.div
                className="w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center relative z-10"
                layout
                transition={{ type: "spring", stiffness: 700, damping: 30 }}
                style={{
                    marginLeft: theme === 'dark' ? 'auto' : '0',
                    marginRight: theme === 'dark' ? '0' : 'auto',
                    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff'
                }}
            >
                <motion.div
                    initial={false}
                    animate={{ rotate: theme === 'dark' ? 360 : 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {theme === 'dark' ? (
                        <Moon size={14} className="text-blue-400 fill-blue-400/20" />
                    ) : (
                        <Sun size={14} className="text-orange-400 fill-orange-400/20" />
                    )}
                </motion.div>
            </motion.div>

            {/* Background Icons for context */}
            <div className="absolute inset-0 flex justify-between items-center px-2 pointer-events-none">
                <Sun size={12} className={`transition-opacity duration-300 ${theme === 'dark' ? 'opacity-50 text-slate-500' : 'opacity-0'}`} />
                <Moon size={12} className={`transition-opacity duration-300 ${theme === 'light' ? 'opacity-50 text-blue-300' : 'opacity-0'}`} />
            </div>
        </div>
    );
};

export default ThemeToggle;
