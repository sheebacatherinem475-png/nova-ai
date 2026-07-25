import React, { useState, useRef } from 'react';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, 
  PieChart, Pie, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FileImage, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface InteractiveChartProps {
  initialType: string;
  data: Record<string, unknown>[];
  initialXKey?: string;
  initialYKey?: string;
  title?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function InteractiveChart({ initialType, data, initialXKey, initialYKey, title }: InteractiveChartProps) {
  const [type, setType] = useState(initialType || 'bar');
  const [xKey, setXKey] = useState(initialXKey || '');
  const [yKey, setYKey] = useState(initialYKey || '');
  const chartRef = useRef<HTMLDivElement>(null);

  // Get keys for dropdowns
  const keys = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'name' || type === 'pie') : [];

  const handleExportPNG = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current);
    const link = document.createElement('a');
    link.download = `${title || 'chart'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleExportPDF = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
    });
    pdf.addImage(imgData, 'PNG', 10, 10, 280, 150);
    pdf.save(`${title || 'chart'}.pdf`);
  };

  const renderChart = () => {
    if (!data || data.length === 0) return <div>No data available</div>;

    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey={xKey} stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
              <Legend />
              <Line type="monotone" dataKey={yKey} stroke={COLORS[0]} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey={xKey} type="number" name={xKey} stroke="#888" />
              <YAxis dataKey={yKey} type="number" name={yKey} stroke="#888" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
              <Legend />
              <Scatter name={title || "Data"} data={data} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={100} label>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey={xKey} stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
              <Legend />
              <Bar dataKey={yKey} fill={COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 my-4 w-full flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h4 className="font-semibold text-zinc-100">{title || 'Data Visualization'}</h4>
        
        <div className="flex gap-2 text-xs items-center">
          <select 
            value={type} 
            onChange={e => setType(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-200"
          >
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="scatter">Scatter</option>
            <option value="pie">Pie</option>
          </select>

          {keys.length > 0 && (
            <>
              <select 
                value={xKey} 
                onChange={e => setXKey(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-200"
              >
                {keys.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              
              <select 
                value={yKey} 
                onChange={e => setYKey(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-200"
              >
                {keys.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </>
          )}

          <div className="flex gap-1 ml-2">
            <button onClick={handleExportPNG} className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white" title="Export PNG">
              <FileImage size={14} />
            </button>
            <button onClick={handleExportPDF} className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white" title="Export PDF">
              <FileText size={14} />
            </button>
          </div>
        </div>
      </div>

      <div ref={chartRef} className="w-full bg-zinc-900 pt-2 pb-4 px-2">
        {renderChart()}
      </div>
    </div>
  );
}
