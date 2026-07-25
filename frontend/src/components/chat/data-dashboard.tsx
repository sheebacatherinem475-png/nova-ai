import React from 'react';
import { InteractiveChart } from './interactive-chart';

interface DashboardProps {
  charts: {
    type: string;
    data: Record<string, unknown>[];
    xKey?: string;
    yKey?: string;
    title?: string;
  }[];
}

export function DataDashboard({ charts }: DashboardProps) {
  if (!charts || charts.length === 0) return null;

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 my-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          Data Dashboard
        </h3>
      </div>
      
      <div className={`grid grid-cols-1 ${charts.length > 1 ? 'md:grid-cols-2' : ''} gap-4`}>
        {charts.map((chart, i) => (
          <div key={i} className="col-span-1 min-w-0">
            <InteractiveChart 
              initialType={chart.type} 
              data={chart.data} 
              initialXKey={chart.xKey} 
              initialYKey={chart.yKey} 
              title={chart.title} 
            />
          </div>
        ))}
      </div>
    </div>
  );
}
