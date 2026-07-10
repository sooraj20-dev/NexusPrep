import React from 'react';
import { ResponsiveContainer, RadialBarChart, PolarAngleAxis, RadialBar } from 'recharts';
import { COLORS, scoreColor } from '../utils/constants';

export function RadialScore({ label, value, color = scoreColor(value), size = 132 }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ value }]} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" fill={color} cornerRadius={0} background={{ fill: COLORS.panel2 }} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="iv-mono -mt-20 mb-8 font-bold" style={{ fontSize: "1.8rem", color, fontFamily: "'JetBrains Mono', monospace" }}>{value}%</div>
      <span style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", textAlign: "center" }}>{label}</span>
    </div>
  );
}
