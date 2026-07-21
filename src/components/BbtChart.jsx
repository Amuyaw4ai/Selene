import React, { useMemo } from 'react';
import { addDays, parseDate } from '../utils/dateHelpers.js';
import { Thermometer } from 'lucide-react';

export default function BbtChart({ latestPeriod, dailySymptoms, averageCycleLength, cycleIndex, totalCycles }) {
  // Generate all cycle days for the current active cycle
  const chartData = useMemo(() => {
    if (!latestPeriod) return [];
    
    const data = [];
    const cycleLength = averageCycleLength || 28;
    
    for (let day = 0; day < cycleLength; day++) {
      const dateStr = addDays(latestPeriod.startDate, day);
      const symptom = dailySymptoms[dateStr];
      const bbt = symptom?.bbt;
      
      data.push({
        day: day + 1, // 1-indexed
        dateStr,
        bbt: bbt !== undefined && bbt !== null ? bbt : null
      });
    }
    
    return data;
  }, [latestPeriod, dailySymptoms, averageCycleLength]);

  const loggedPoints = useMemo(() => {
    return chartData.filter(d => d.bbt !== null);
  }, [chartData]);

  // Dimension settings for SVG
  const width = 600;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };

  // Calculate dynamic axis scales
  const scales = useMemo(() => {
    if (loggedPoints.length === 0) return null;
    
    const temps = loggedPoints.map(p => p.bbt);
    const minTemp = Math.min(...temps, 36.0) - 0.15;
    const maxTemp = Math.max(...temps, 37.0) + 0.15;
    
    const totalDays = averageCycleLength || 28;
    
    // Map cycle day to X pixel value
    const getX = (day) => {
      const chartWidth = width - padding.left - padding.right;
      return padding.left + ((day - 1) / (totalDays - 1)) * chartWidth;
    };
    
    // Map temperature to Y pixel value
    const getY = (temp) => {
      const chartHeight = height - padding.top - padding.bottom;
      return height - padding.bottom - ((temp - minTemp) / (maxTemp - minTemp)) * chartHeight;
    };
    
    return { getX, getY, minTemp, maxTemp };
  }, [loggedPoints, averageCycleLength]);

  // Generate grid lines
  const gridLines = useMemo(() => {
    if (!scales) return [];
    const { minTemp, maxTemp, getY } = scales;
    
    const lines = [];
    // Generate horizontal grids every 0.2°C
    const startValue = Math.ceil(minTemp * 5) / 5; // round to nearest 0.2
    
    for (let temp = startValue; temp <= maxTemp; temp += 0.2) {
      lines.push({
        y: getY(temp),
        label: `${temp.toFixed(1)}°C`,
        temp
      });
    }
    return lines;
  }, [scales]);

  // Generate X axis tick labels (Day 1, Day 7, Day 14, Day 21, Day 28)
  const xTicks = useMemo(() => {
    const totalDays = averageCycleLength || 28;
    const ticks = [1];
    
    // Distribute ticks reasonably
    const steps = [7, 14, 21, 28].filter(s => s < totalDays);
    ticks.push(...steps);
    if (!ticks.includes(totalDays)) {
      ticks.push(totalDays);
    }
    
    return ticks;
  }, [averageCycleLength]);

  // Generate path data for the line connecting points
  const pathD = useMemo(() => {
    if (!scales || loggedPoints.length < 2) return '';
    const { getX, getY } = scales;
    
    return loggedPoints.reduce((path, p, i) => {
      const x = getX(p.day);
      const y = getY(p.bbt);
      return i === 0 ? `M ${x} ${y}` : `${path} L ${x} ${y}`;
    }, '');
  }, [loggedPoints, scales]);

  if (!latestPeriod) {
    return (
      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 text-center text-slate-400">
        <p className="text-sm font-medium">Log a period cycle to activate symptothermal tracking charts.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
      <div>
        <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Thermometer className="h-4.5 w-4.5 text-rose-500" />
          Basal Body Temperature (BBT) Trend Chart
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Tracking temperature shifts for {cycleIndex && totalCycles ? `Cycle #${cycleIndex} of ${totalCycles} (Started ${parseDate(latestPeriod.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})` : `the cycle starting ${parseDate(latestPeriod.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}.
        </p>
      </div>

      {loggedPoints.length === 0 ? (
        <div className="h-[240px] bg-slate-50/50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 p-6">
          <div className="text-center max-w-xs flex flex-col items-center">
            <Thermometer className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">No Temperature Logs Found</p>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
              Log your daily waking temperature in the form. Once you enter data points, a line chart showing your post-ovulation thermal shift will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px] h-auto overflow-visible select-none">
            {/* Horizontal Grid lines */}
            {gridLines.map((line, idx) => (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={line.y}
                  x2={width - padding.right}
                  y2={line.y}
                  stroke="#f1f5f9"
                  strokeWidth="1.5"
                />
                <text
                  x={padding.left - 8}
                  y={line.y + 4}
                  textAnchor="end"
                  className="text-[10px] font-bold text-slate-400 font-mono"
                >
                  {line.label}
                </text>
              </g>
            ))}

            {/* X-Axis Ticks & Labels */}
            {scales && xTicks.map((day) => {
              const x = scales.getX(day);
              return (
                <g key={day}>
                  <line
                    x1={x}
                    y1={height - padding.bottom}
                    x2={x}
                    y2={height - padding.bottom + 5}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={height - padding.bottom + 18}
                    textAnchor="middle"
                    className="text-[10px] font-bold text-slate-400"
                  >
                    Day {day}
                  </text>
                </g>
              )}
            )}

            {/* Ovulation Prediction Line Indicator */}
            {scales && latestPeriod && (
              (() => {
                // Approximate ovulation day (14 days before start of next cycle, i.e., average length - 14)
                const predictedOvulationDay = (averageCycleLength || 28) - 14;
                const x = scales.getX(predictedOvulationDay);
                return (
                  <g>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={height - padding.bottom}
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <rect
                      x={x - 45}
                      y={padding.top - 4}
                      width="90"
                      height="16"
                      rx="4"
                      fill="#e6f4ea"
                      stroke="#34d399"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={padding.top + 7}
                      textAnchor="middle"
                      className="text-[9px] font-bold text-emerald-800"
                    >
                      Est. Ovulation
                    </text>
                  </g>
                );
              })()
            )}

            {/* The Plot Line connecting logged points */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* The Plot Dots */}
            {scales && loggedPoints.map((p, idx) => {
              const x = scales.getX(p.day);
              const y = scales.getY(p.bbt);
              
              return (
                <g key={idx} className="group cursor-pointer">
                  {/* Dot glow on hover */}
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill="#ffe4e6"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  {/* Actual dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r="4.5"
                    fill="#f43f5e"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="filter drop-shadow-xs"
                  />
                  {/* Temperature label above dot */}
                  <text
                    x={x}
                    y={y - 10}
                    textAnchor="middle"
                    className="text-[9px] font-extrabold text-slate-700 bg-white font-mono opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {p.bbt.toFixed(2)}°
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
