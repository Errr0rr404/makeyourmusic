import { useState, useEffect } from 'react';
import {
  getAccessibleModules,
  getModuleAccess,
  type ERPModule,
  type ModuleAccess
} from './permissions';

/**
 * Hook to get ERP modules accessible by user role
 * All modules are enabled for all authenticated users in this ERP platform
 */
export function useERPModules(userRole: string | undefined) {
  const [state, setState] = useState({ enabledModules: [] as ERPModule[], loading: true });

  useEffect(() => {
    // Get modules accessible by role
    let filtered: ERPModule[] = [];

    if (userRole) {
      filtered = getAccessibleModules(userRole);
    }

    setState({ enabledModules: filtered, loading: false });
  }, [userRole]);


  const enabledModules = state.enabledModules;
  const loading = state.loading;

  /**
   * Check if a specific module is enabled for current user
   */
  const isModuleEnabled = (module: ERPModule): boolean => {
    return enabledModules.includes(module);
  };

  /**
   * Get module access for current user
   */
  const getAccess = (module: ERPModule): ModuleAccess | null => {
    if (!userRole) return null;
    return getModuleAccess(userRole, module);
  };

  return {
    enabledModules,
    loading,
    isModuleEnabled,
    getAccess,
  };
}
