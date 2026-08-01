import React from 'react';

type DataPoint = {
  name: string;
  value: number;
};

interface CustomBarChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
}

export function CustomBarChart({ data, title, height = 250 }: CustomBarChartProps) {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="w-full flex flex-col" style={{ height }}>
      {title && <h3 className="text-sm font-medium mb-4">{title}</h3>}
      <div className="flex-1 flex items-end justify-between gap-2 border-b border-border/50 pb-2">
        {data.map((item, index) => {
          // Add a tiny base height so even 0 has a bar
          const percentage = maxValue === 0 ? 0 : (item.value / maxValue) * 100;
          return (
            <div key={index} className="flex flex-col items-center flex-1 gap-2 group">
              {/* Tooltip-like value display on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold bg-primary/20 text-primary px-2 py-1 rounded">
                {item.value}
              </div>
              
              {/* The actual Bar */}
              <div 
                className="w-full bg-primary/40 group-hover:bg-primary transition-colors rounded-t-sm"
                style={{ 
                  height: `${Math.max(percentage, 2)}%`, // at least 2% height for visibility
                  minHeight: '4px' 
                }}
              />
              
              {/* X-Axis Label */}
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {item.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
