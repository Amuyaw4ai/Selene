import React, { useMemo } from 'react';
import { X, HelpCircle, Calendar, ShieldCheck } from 'lucide-react';
import { parseDate } from '../utils/dateHelpers.js';

export default function DeductionModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  classification, 
  analyzedCycles,
  averageCycleLength,
  averagePeriodDuration
}) {
  if (!isOpen) return null;

  const formattedDate = useMemo(() => {
    const d = parseDate(selectedDate);
    if (!d) return '';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, [selectedDate]);

  // Determine explanation details
  const details = useMemo(() => {
    const { type, cycle, projection } = classification;
    
    switch (type) {
      case 'PERIOD': {
        const isOngoing = cycle?.isOngoing;
        const start = cycle?.startDate;
        const end = isOngoing ? 'Present (Ongoing)' : cycle?.endDate;
        return {
          title: 'Logged Menstrual Period',
          icon: <span className="h-2 w-2 rounded-full bg-rose-500 ring-4 ring-rose-100"></span>,
          bgClass: 'bg-rose-50 border-rose-150',
          textColor: 'text-rose-900',
          desc: 'This day is logged as a menstrual bleeding day in your cycle records.',
          formula: 'Active bleeding dates are stored directly from your period logs.',
          mathSteps: [
            { label: 'Bleeding Start Date', value: start },
            { label: 'Bleeding End Date', value: end },
            { label: 'Status', value: isOngoing ? 'Ongoing / Live' : 'Completed Log' }
          ]
        };
      }
      
      case 'OVULATION': {
        const start = cycle?.startDate;
        const ovDate = cycle?.ovulationDate;
        // Find next cycle start
        const cycleIndex = analyzedCycles.findIndex(c => c.id === cycle.id);
        const nextCycle = cycleIndex !== -1 && cycleIndex < analyzedCycles.length - 1 ? analyzedCycles[cycleIndex + 1] : null;
        
        const nextStart = nextCycle?.startDate;
        const length = cycle?.cycleLength;

        if (nextStart) {
          return {
            title: 'Peak Ovulation (Confirmed Cycle)',
            icon: <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>,
            bgClass: 'bg-emerald-50 border-emerald-150',
            textColor: 'text-emerald-950',
            desc: 'Ovulation represents the release of an egg from the ovary. Standard clinical guidelines calculate the exact ovulation date retrospectively as 14 days before the start of the subsequent period.',
            formula: 'Next Cycle Start Date - 14 Days = Ovulation Day',
            mathSteps: [
              { label: 'This Cycle Start', value: start },
              { label: 'Subsequent Cycle Start', value: nextStart },
              { label: 'Confirmed Cycle Length', value: `${length} Days` },
              { label: 'Formula', value: `${nextStart} - 14 Days` },
              { label: 'Resulting Ovulation Day', value: ovDate }
            ]
          };
        } else {
          // Latest cycle (ongoing)
          return {
            title: 'Peak Ovulation (Current Cycle Prediction)',
            icon: <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>,
            bgClass: 'bg-emerald-50 border-emerald-150',
            textColor: 'text-emerald-950',
            desc: 'This is the calculated ovulation day for your current cycle. Because this cycle is ongoing, ovulation is predicted using your average cycle length.',
            formula: 'Cycle Start Date + (Average Cycle Length - 14 Days) = Ovulation Day',
            mathSteps: [
              { label: 'Current Cycle Start', value: start },
              { label: 'Your Average Cycle Length', value: `${averageCycleLength} Days` },
              { label: 'Formula Offset', value: `${averageCycleLength} - 14 = ${averageCycleLength - 14} Days` },
              { label: 'Formula', value: `${start} + ${averageCycleLength - 14} Days` },
              { label: 'Predicted Ovulation Day', value: ovDate }
            ]
          };
        }
      }
      
      case 'PREDICTED_OVULATION': {
        const start = projection?.startDate;
        const ovDate = projection?.ovulationDate;
        return {
          title: 'Predicted Ovulation (Future Projection)',
          icon: <span className="h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-100 animate-pulse"></span>,
          bgClass: 'bg-emerald-50/50 border-emerald-100 border-dashed',
          textColor: 'text-emerald-900',
          desc: 'This is the projected ovulation day for a future cycle. Projections are computed forward based on your historic cycle parameters.',
          formula: 'Predicted Cycle Start Date + (Average Cycle Length - 14 Days) = Ovulation Day',
          mathSteps: [
            { label: 'Projected Cycle Start', value: start },
            { label: 'Average Cycle Length', value: `${averageCycleLength} Days` },
            { label: 'Formula Offset', value: `${averageCycleLength} - 14 = ${averageCycleLength - 14} Days` },
            { label: 'Formula', value: `${start} + ${averageCycleLength - 14} Days` },
            { label: 'Projected Ovulation Day', value: ovDate }
          ]
        };
      }
      
      case 'UNSAFE': {
        const start = cycle?.startDate;
        const ovDate = cycle?.ovulationDate;
        const fertileStart = cycle?.unsafeWindow?.start;
        const fertileEnd = cycle?.unsafeWindow?.end;
        return {
          title: 'High Fertility Window (Confirmed Cycle)',
          icon: <span className="h-2 w-2 rounded-full bg-amber-400 ring-4 ring-amber-100"></span>,
          bgClass: 'bg-amber-50 border-amber-150',
          textColor: 'text-amber-950',
          desc: 'This day is within your fertile window. Sperm can survive in supportive cervical mucus for up to 5 days, and the egg remains viable for 24 hours after release. Thus, the high fertility window opens 5 days before ovulation and closes 1 day after.',
          formula: '[Ovulation Day - 5 Days] to [Ovulation Day + 1 Day]',
          mathSteps: [
            { label: 'Ovulation Day', value: ovDate },
            { label: 'Fertile Window Opens', value: `${ovDate} - 5 Days = ${fertileStart}` },
            { label: 'Fertile Window Closes', value: `${ovDate} + 1 Day = ${fertileEnd}` },
            { label: 'Active Fertile Range', value: `${fertileStart} to ${fertileEnd}` }
          ]
        };
      }
      
      case 'PREDICTED_UNSAFE': {
        const start = projection?.startDate;
        const ovDate = projection?.ovulationDate;
        const fertileStart = projection?.unsafeWindow?.start;
        const fertileEnd = projection?.unsafeWindow?.end;
        return {
          title: 'Predicted High Fertility (Future Projection)',
          icon: <span className="h-2 w-2 rounded-full bg-amber-400 ring-4 ring-amber-100 animate-pulse"></span>,
          bgClass: 'bg-amber-50/50 border-amber-100 border-dashed',
          textColor: 'text-amber-900',
          desc: 'Predicted high fertility day. It is calculated by applying the sperm survival window (5 days) and egg viability window (1 day) to your predicted ovulation date.',
          formula: '[Predicted Ovulation - 5 Days] to [Predicted Ovulation + 1 Day]',
          mathSteps: [
            { label: 'Predicted Ovulation Day', value: ovDate },
            { label: 'Fertile Window Opens', value: `${ovDate} - 5 Days = ${fertileStart}` },
            { label: 'Fertile Window Closes', value: `${ovDate} + 1 Day = ${fertileEnd}` },
            { label: 'Projected Fertile Range', value: `${fertileStart} to ${fertileEnd}` }
          ]
        };
      }
      
      case 'PREDICTED_PERIOD': {
        const start = projection?.startDate;
        const end = projection?.endDate;
        return {
          title: 'Predicted Menstrual Period',
          icon: <span className="h-2 w-2 rounded-full bg-rose-450 ring-4 ring-rose-100 animate-pulse"></span>,
          bgClass: 'bg-rose-50/50 border-rose-100 border-dashed',
          textColor: 'text-rose-900',
          desc: 'This day is projected to be a menstrual bleeding day in an upcoming cycle based on your cycle averages.',
          formula: 'Previous Cycle Start + Average Cycle Length = Predicted Cycle Start',
          mathSteps: [
            { label: 'Average Period Duration', value: `${averagePeriodDuration} Days` },
            { label: 'Projected Period Start', value: start },
            { label: 'Projected Period End', value: end },
            { label: 'Range', value: `${start} to ${end}` }
          ]
        };
      }
      
      case 'SAFE':
      default: {
        return {
          title: 'Low Fertility Day (Safe Day)',
          icon: <span className="h-2 w-2 rounded-full bg-slate-450 ring-4 ring-slate-100"></span>,
          bgClass: 'bg-slate-50 border-slate-205',
          textColor: 'text-slate-900',
          desc: 'This day is classified as a low fertility safe day because it does not overlap with any active bleeding days or high fertility unsafe windows.',
          formula: 'Outside of Bleeding Days AND Outside of Fertile Windows',
          mathSteps: [
            { label: 'Menstruation Check', value: 'Negative (Not bleeding)' },
            { label: 'Fertility Window Check', value: 'Negative (No active ovulation proximity)' },
            { label: 'Status', value: 'Biologically Low Conception Probability' }
          ]
        };
      }
    }
  }, [classification, analyzedCycles, averageCycleLength, averagePeriodDuration]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Calculation Review</h2>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{formattedDate}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {/* Classification Badge Card */}
          <div className={`p-4 border rounded-2xl flex items-center gap-3 ${details.bgClass}`}>
            {details.icon}
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider font-bold">Classification</span>
              <span className={`text-sm font-extrabold ${details.textColor}`}>{details.title}</span>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
              Biological Basis
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {details.desc}
            </p>
          </div>

          {/* Simple Calculation Block */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Mathematical Formula
            </h3>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-[11px] leading-relaxed shadow-inner border border-slate-800">
              <span className="text-indigo-400">// Clinical Calculation</span>
              <div className="text-slate-200 mt-1 font-bold">{details.formula}</div>
            </div>
          </div>

          {/* Step-by-Step Values */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Cycle Variables Used
            </h3>
            <div className="border border-slate-150 rounded-2xl overflow-hidden divide-y divide-slate-100">
              <div className="flex items-center justify-between p-3 text-[11px] bg-slate-50/70 font-semibold text-slate-600">
                <span>Total Logged Cycles</span>
                <span className="font-bold text-indigo-700 font-mono bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  {analyzedCycles.length} Cycles ({analyzedCycles.filter(c => c.cycleLength !== null).length} Completed)
                </span>
              </div>
              {details.mathSteps.map((step, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 text-[11px] hover:bg-slate-50/50 transition-colors">
                  <span className="font-semibold text-slate-500">{step.label}</span>
                  <span className="font-bold text-slate-800 font-mono bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                    {step.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 text-white hover:bg-slate-700 transition-colors rounded-xl text-xs font-bold shadow-xs cursor-pointer select-none"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );
}
