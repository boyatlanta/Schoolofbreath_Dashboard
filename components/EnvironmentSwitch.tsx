import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { getEnvironment, setEnvironment, type Environment } from '../utils/envConfig';

export const EnvironmentSwitch: React.FC = () => {
  const [current, setCurrent] = useState<Environment>(() => getEnvironment());
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => setCurrent(getEnvironment());
    window.addEventListener('sb-env-changed', handler);
    return () => window.removeEventListener('sb-env-changed', handler);
  }, []);

  const handleSwitch = () => {
    const next: Environment = current === 'prod' ? 'dev' : 'prod';
    setEnvironment(next);
    queryClient.invalidateQueries();
    toast.info(`Switched to ${next.toUpperCase()} API`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">API</span>
      <button
        onClick={handleSwitch}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-all
          ${current === 'dev'
            ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
            : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
          }
        `}
        title={`Currently: ${current.toUpperCase()}. Click to switch to ${current === 'prod' ? 'DEV' : 'PROD'}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        {current.toUpperCase()}
      </button>
    </div>
  );
};
