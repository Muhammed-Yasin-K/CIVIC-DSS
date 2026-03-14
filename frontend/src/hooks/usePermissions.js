import { useEffect, useState } from 'react';

/**
 * Custom hook for role-based permissions
 * Returns permission checks based on user role
 */
export const usePermissions = () => {
    const [role, setRole] = useState(localStorage.getItem('role'));
    const [username, setUsername] = useState(localStorage.getItem('username'));

    useEffect(() => {
        setRole(localStorage.getItem('role'));
        setUsername(localStorage.getItem('username'));
    }, []);

    const isAdmin = role === 'admin';
    const isOfficer = role === 'civic_officer';

    return {
        role,
        username,
        isAdmin,
        isOfficer,

        // Feature permissions
        canManageEvents: isAdmin,
        canManageUsers: isAdmin,
        canConfigureSystem: isAdmin,
        canViewGlobalAnalytics: isAdmin,
        canCreateInspections: isAdmin,
        canExportReports: isAdmin,

        // Officer permissions
        canViewPredictions: true,
        canViewEvents: true,
        canViewHotspots: true,
        canViewForecasts: true,
        canUpdateAlerts: true,
        canUpdateOwnInspections: true,

        // Read-only checks
        isReadOnly: (feature) => {
            if (isAdmin) return false;

            const readOnlyFeatures = [
                'predictions',
                'events',
                'hotspots',
                'forecasts',
                'shap'
            ];

            return readOnlyFeatures.includes(feature);
        }
    };
};
