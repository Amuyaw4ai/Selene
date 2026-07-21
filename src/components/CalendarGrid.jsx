import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Thermometer, Droplet, Star } from 'lucide-react';
import { getDayClassification } from '../utils/cycleEngine.js';
import { addDays, parseDate, getDaysBetween } from '../utils/dateHelpers.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarGrid({
  currentMonth,
  currentYear,
  onMonthChange,
  selectedDate,
  onSelectDate,
  analyzedCycles,
  projectedCycles,
  dailySymptoms,
  todayStr,
  calendarMode = 'gregorian',
  onCalendarModeChange,
  averageCycleLength,
  periods
}) {
  // Helper to determine the start date of the cycle containing the selectedDate
  const selectedCycleStart = useMemo(() => {
    if (calendarMode !== 'cycle' || !selectedDate || !analyzedCycles || analyzedCycles.length === 0) return null;
    
    // 1. Check analyzed cycles
    for (let i = 0; i < analyzedCycles.length; i++) {
      const cycle = analyzedCycles[i];
      const isLast = i === analyzedCycles.length - 1;
      if (isLast) {
        if (selectedDate >= cycle.startDate) return cycle.startDate;
      } else {
        const nextCycle = analyzedCycles[i + 1];
        if (selectedDate >= cycle.startDate && selectedDate < nextCycle.startDate) {
          return cycle.startDate;
        }
      }
    }
    
    // 2. Check projected cycles
    for (let i = 0; i < projectedCycles.length; i++) {
      const proj = projectedCycles[i];
      const isLast = i === projectedCycles.length - 1;
      if (isLast) {
        if (selectedDate >= proj.startDate) return proj.startDate;
      } else {
        const nextProj = projectedCycles[i + 1];
        if (selectedDate >= proj.startDate && selectedDate < nextProj.startDate) {
          return proj.startDate;
        }
      }
    }
    
    // Fallback to first logged cycle start
    if (analyzedCycles.length > 0) {
      return analyzedCycles[0].startDate;
    }
    return null;
  }, [calendarMode, selectedDate, analyzedCycles, projectedCycles]);

  // Determine actual cycle length to display in cycle mode grid
  const cycleGridLength = useMemo(() => {
    if (!selectedCycleStart) return 28;
    
    // Find the cycle corresponding to this start date
    const cycle = analyzedCycles.find(c => c.startDate === selectedCycleStart);
    if (cycle) {
      if (cycle.cycleLength) {
        return cycle.cycleLength; // Exact length for completed historical cycles (e.g. 26 days)
      }
      if (cycle.isOngoing) {
        const daysElapsed = getDaysBetween(selectedCycleStart, todayStr) + 1;
        return Math.max(averageCycleLength || 28, daysElapsed); // For ongoing, show at least average length or days elapsed
      }
    }
    
    // For projected cycles
    return averageCycleLength || 28;
  }, [selectedCycleStart, analyzedCycles, averageCycleLength, todayStr]);

  // Merge analyzed and projected cycles into a single chronological timeline
  const allCyclesList = useMemo(() => {
    const list = [];
    
    // Add analyzed cycles
    if (analyzedCycles) {
      analyzedCycles.forEach(c => {
        list.push({
          startDate: c.startDate,
          endDate: c.endDate,
          isOngoing: c.isOngoing,
          isProjection: false
        });
      });
    }
    
    // Add projected cycles
    if (projectedCycles) {
      projectedCycles.forEach(p => {
        list.push({
          startDate: p.startDate,
          endDate: p.endDate,
          isOngoing: false,
          isProjection: true
        });
      });
    }
    
    // Sort chronologically by start date
    return list.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [analyzedCycles, projectedCycles]);

  // Find the index of the currently displayed cycle start date in the merged list
  const currentCycleIndex = useMemo(() => {
    if (!selectedCycleStart || allCyclesList.length === 0) return -1;
    return allCyclesList.findIndex(c => c.startDate === selectedCycleStart);
  }, [selectedCycleStart, allCyclesList]);

  // Determine previous and next cycle start dates for navigation chevrons
  const prevCycleStart = useMemo(() => {
    if (currentCycleIndex <= 0) return null;
    return allCyclesList[currentCycleIndex - 1].startDate;
  }, [currentCycleIndex, allCyclesList]);

  const nextCycleStart = useMemo(() => {
    if (currentCycleIndex === -1 || currentCycleIndex >= allCyclesList.length - 1) return null;
    return allCyclesList[currentCycleIndex + 1].startDate;
  }, [currentCycleIndex, allCyclesList]);

  // Resolve first period start and min boundary dates
  const firstPeriodStart = useMemo(() => {
    if (!periods || periods.length === 0) return null;
    return periods.reduce((min, p) => p.startDate < min ? p.startDate : min, periods[0].startDate);
  }, [periods]);

  const minYear = useMemo(() => {
    if (!firstPeriodStart) return 2026;
    const date = parseDate(firstPeriodStart);
    return date ? date.getFullYear() : 2026;
  }, [firstPeriodStart]);

  const minMonth = useMemo(() => {
    if (!firstPeriodStart) return 3; // April (3)
    const date = parseDate(firstPeriodStart);
    return date ? date.getMonth() : 3;
  }, [firstPeriodStart]);

  const displayMonth = useMemo(() => {
    if (!selectedCycleStart) return currentMonth;
    const date = parseDate(selectedCycleStart);
    return date ? date.getMonth() : currentMonth;
  }, [selectedCycleStart, currentMonth]);

  const displayYear = useMemo(() => {
    if (!selectedCycleStart) return currentYear;
    const date = parseDate(selectedCycleStart);
    return date ? date.getFullYear() : currentYear;
  }, [selectedCycleStart, currentYear]);

  const findCycleForMonth = (month, year) => {
    if (allCyclesList.length === 0) return null;
    
    const targetMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    // 1. Find if a cycle starts in this month
    const startInMonth = allCyclesList.find(c => c.startDate.startsWith(targetMonthStr));
    if (startInMonth) {
      return startInMonth.startDate;
    }
    
    // 2. Otherwise, find the cycle active on the 1st of this month
    const targetDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    let bestCycle = null;
    for (const c of allCyclesList) {
      if (c.startDate <= targetDate) {
        bestCycle = c;
      } else {
        break;
      }
    }
    if (bestCycle) {
      return bestCycle.startDate;
    }
    
    // 3. Fallback: first cycle
    return allCyclesList[0].startDate;
  };

  const handleCycleMonthYearChange = (newMonth, newYear) => {
    const targetStart = findCycleForMonth(newMonth, newYear);
    if (targetStart) {
      onSelectDate(targetStart);
    }
  };

  // Generate the cells representing the calendar grid
  const gridCells = useMemo(() => {
    if (calendarMode === 'cycle' && selectedCycleStart) {
      // Find the biological cycle start and day number for any date in the timeline
      const getCycleDayInfo = (dateStr) => {
        if (!allCyclesList || allCyclesList.length === 0) return null;
        for (let idx = 0; idx < allCyclesList.length; idx++) {
          const c = allCyclesList[idx];
          const isLast = idx === allCyclesList.length - 1;
          if (isLast) {
            if (dateStr >= c.startDate) {
              return { cycleStart: c.startDate, dayIndex: getDaysBetween(c.startDate, dateStr) + 1 };
            }
          } else {
            const nextC = allCyclesList[idx + 1];
            if (dateStr >= c.startDate && dateStr < nextC.startDate) {
              return { cycleStart: c.startDate, dayIndex: getDaysBetween(c.startDate, dateStr) + 1 };
            }
          }
        }
        return null;
      };

      const startDayOfWeek = parseDate(selectedCycleStart).getDay(); // Sunday=0, Saturday=6
      const len = startDayOfWeek + cycleGridLength;
      const totalCells = Math.ceil(Math.max(len, 28) / 7) * 7;
      
      const cells = [];
      for (let i = 0; i < totalCells; i++) {
        const dateStr = addDays(selectedCycleStart, i - startDayOfWeek);
        const dateObj = parseDate(dateStr);
        const gregorianDay = dateObj ? dateObj.getDate() : '';
        const gregorianMonth = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short' }) : '';
        
        // Resolve cycle info
        const info = getCycleDayInfo(dateStr);
        const isCurrentCycle = info && info.cycleStart === selectedCycleStart;
        const cycleDay = info ? info.dayIndex : '';
        
        let label = cycleDay ? `Day ${cycleDay}` : '';
        if (cycleDay && !isCurrentCycle) {
          const isBefore = dateStr < selectedCycleStart;
          label = isBefore ? `Prev · Day ${cycleDay}` : `Next · Day ${cycleDay}`;
        } else if (cycleDay && (gregorianDay === 1 || i === startDayOfWeek)) {
          label = `${gregorianMonth} · Day ${cycleDay}`;
        }
        
        cells.push({
          dateStr,
          day: gregorianDay,
          subLabel: label,
          isCurrentMonth: isCurrentCycle
        });
      }
      return cells;
    }

    // Gregorian mode
    const cells = [];
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = startOfMonth.getDay();
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const totalDays = endOfMonth.getDate();
    
    const prevMonthEnd = new Date(currentYear, currentMonth, 0);
    const prevMonthTotalDays = prevMonthEnd.getDate();
    
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, day: d, isCurrentMonth: false });
    }
    
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, day: d, isCurrentMonth: true });
    }
    
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, day: d, isCurrentMonth: false });
    }
    
    return cells;
  }, [calendarMode, selectedCycleStart, cycleGridLength, currentMonth, currentYear]);

  // Navigate to previous month
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      onMonthChange(11, currentYear - 1);
    } else {
      onMonthChange(currentMonth - 1, currentYear);
    }
  };

  // Navigate to next month
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      onMonthChange(0, currentYear + 1);
    } else {
      onMonthChange(currentMonth + 1, currentYear);
    }
  };

  // Helper to resolve CSS classes based on classification
  const getCellStyles = (classification, isCurrentMonth, isSelected) => {
    const base = "relative p-1 px-1.5 flex flex-col justify-between transition-all duration-200 border cursor-pointer select-none h-10 sm:h-11 ";
    let colorClasses = "";
    
    // Select border highlight
    const selectBorder = isSelected 
      ? "ring-2 ring-indigo-500 z-10 scale-[1.02] shadow-xs rounded-lg" 
      : "border-slate-100 hover:border-slate-300 rounded-lg";

    // Faded opacity for non-current month
    const opacity = isCurrentMonth ? "opacity-100" : "opacity-40 hover:opacity-70";

    switch (classification.type) {
      case 'PERIOD':
        colorClasses = "bg-rose-500 text-white font-semibold shadow-2xs border-rose-500";
        break;
      case 'OVULATION':
        colorClasses = "bg-emerald-500 text-white font-bold shadow-2xs border-emerald-500 animate-pulse-slow";
        break;
      case 'UNSAFE':
        colorClasses = "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200/90";
        break;
      case 'PREDICTED_PERIOD':
        colorClasses = "bg-rose-50/70 border-rose-300 border border-dashed text-rose-800 hover:bg-rose-100/80";
        break;
      case 'PREDICTED_OVULATION':
        colorClasses = "bg-emerald-50/70 border-emerald-300 border border-dashed text-emerald-800 hover:bg-emerald-100/80";
        break;
      case 'PREDICTED_UNSAFE':
        colorClasses = "bg-amber-50/70 border-amber-200 border border-dashed text-amber-700 hover:bg-amber-100/70";
        break;
      case 'SAFE':
      default:
        colorClasses = "bg-white text-slate-800 hover:bg-slate-50 border-slate-100";
        break;
    }

    return `${base} ${colorClasses} ${selectBorder} ${opacity}`;
  };


  return (
    <div className="flex flex-col gap-3">
      {/* Month Navigation Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-sm font-bold text-slate-900 leading-none">Symptothermal Calendar Grid</h2>
          <span className="text-[10px] text-slate-400 mt-1 block">Select a day to review prediction details or log daily parameters</span>
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap sm:flex-nowrap">
          {/* View Toggle */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-inner">
            <button
              onClick={() => onCalendarModeChange('gregorian')}
              className={`px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all select-none cursor-pointer ${
                calendarMode === 'gregorian' 
                  ? 'bg-white text-slate-800 shadow-3xs border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Gregorian
            </button>
            <button
              onClick={() => onCalendarModeChange('cycle')}
              disabled={!periods || periods.length === 0}
              className={`px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all select-none cursor-pointer ${
                calendarMode === 'cycle'
                  ? 'bg-rose-500 text-white shadow-3xs'
                  : 'text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              title={(!periods || periods.length === 0) ? 'Log a period to enable cycle view' : ''}
            >
              Cycle View
            </button>
          </div>

          {/* Today Button */}
          <button
            onClick={() => onSelectDate(todayStr)}
            className="px-2.5 py-1 text-[9px] font-extrabold uppercase bg-indigo-50 text-indigo-600 hover:bg-indigo-100/80 border border-indigo-200/50 shadow-3xs cursor-pointer select-none transition-all rounded-md active:scale-95 py-1.5"
            title="Jump to today's date"
          >
            Today
          </button>

          {/* Month/Cycle Select controls */}
          {calendarMode === 'gregorian' ? (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-inner">
              <button 
                onClick={handlePrevMonth}
                className="p-1 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-600 transition-all active:scale-95 shadow-2xs cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-0.5 justify-center">
                <select
                  value={currentMonth}
                  onChange={(e) => onMonthChange(parseInt(e.target.value), currentYear)}
                  className="bg-transparent text-[10px] font-bold text-slate-700 uppercase tracking-wider cursor-pointer focus:outline-hidden py-0.5 select-none"
                  style={{ textAlignLast: 'center' }}
                >
                  {MONTHS.map((m, idx) => (
                    <option key={m} value={idx}>{m.slice(0, 3)}</option>
                  ))}
                </select>
                <select
                  value={currentYear}
                  onChange={(e) => onMonthChange(currentMonth, parseInt(e.target.value))}
                  className="bg-transparent text-[10px] font-bold text-slate-700 uppercase tracking-wider cursor-pointer focus:outline-hidden py-0.5 select-none ml-1"
                  style={{ textAlignLast: 'center' }}
                >
                  {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleNextMonth}
                className="p-1 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-600 transition-all active:scale-95 shadow-2xs cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-inner">
              <button 
                onClick={() => prevCycleStart && onSelectDate(prevCycleStart)}
                disabled={!prevCycleStart}
                className="p-1 hover:bg-white hover:text-rose-600 rounded-lg text-slate-600 transition-all active:scale-95 shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-600 cursor-pointer"
                aria-label="Previous cycle"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-0.5 justify-center">
                <select
                  value={displayMonth}
                  onChange={(e) => handleCycleMonthYearChange(parseInt(e.target.value), displayYear)}
                  className="bg-transparent text-[10px] font-bold text-slate-700 uppercase tracking-wider cursor-pointer focus:outline-hidden py-0.5 select-none"
                  style={{ textAlignLast: 'center' }}
                >
                  {MONTHS.map((m, idx) => {
                    const isHidden = displayYear === minYear && idx < minMonth;
                    if (isHidden) return null;
                    return (
                      <option key={m} value={idx}>{m.slice(0, 3)}</option>
                    );
                  })}
                </select>
                <select
                  value={displayYear}
                  onChange={(e) => handleCycleMonthYearChange(displayMonth, parseInt(e.target.value))}
                  className="bg-transparent text-[10px] font-bold text-slate-700 uppercase tracking-wider cursor-pointer focus:outline-hidden py-0.5 select-none ml-1"
                  style={{ textAlignLast: 'center' }}
                >
                  {Array.from({ length: 2030 - minYear + 1 }, (_, i) => minYear + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                      ))}
                </select>
              </div>
              <button 
                onClick={() => nextCycleStart && onSelectDate(nextCycleStart)}
                disabled={!nextCycleStart}
                className="p-1 hover:bg-white hover:text-rose-600 rounded-lg text-slate-600 transition-all active:scale-95 shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-600 cursor-pointer"
                aria-label="Next cycle"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cycle Mode Sub-banner */}
      {calendarMode === 'cycle' && (
        <div className="bg-rose-50/70 border border-rose-200/60 p-2 rounded-xl flex items-center justify-between text-xs font-semibold text-rose-900">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Cycle #{currentCycleIndex + 1} of {allCyclesList.length}</span>
            <span className="text-[10px] text-rose-600 font-medium">({analyzedCycles?.length || 0} Logged Cycles Total)</span>
          </div>
          {selectedCycleStart && (
            <span className="text-[10px] font-bold font-mono text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
              Starts {parseDate(selectedCycleStart)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
      )}

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {WEEKDAYS.map(w => (
          <div key={w} className="py-0.5">{w}</div>
        ))}
      </div>

      {/* Grid Day Cells */}
      <div className="grid grid-cols-7 gap-1">
        {gridCells.map(({ dateStr, day, subLabel, isCurrentMonth }) => {
          const isSelected = selectedDate === dateStr;
          const classification = getDayClassification(dateStr, analyzedCycles, projectedCycles, todayStr);
          const symptoms = dailySymptoms[dateStr];
          
          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={getCellStyles(classification, isCurrentMonth, isSelected)}
            >
              {/* Day Number */}
              <div className="flex justify-between items-start w-full leading-none">
                <span className="text-[10px] font-bold">{day}</span>
                {/* Visual marker if it's the current selected date */}
                {isSelected && (
                  <span className="h-1 w-1 bg-indigo-500 rounded-full"></span>
                )}
              </div>

              {/* Sub-label for Cycle Days */}
              {subLabel && (
                <span className={`text-[7px] font-extrabold uppercase tracking-tight block leading-none mt-0.5 select-none ${
                  classification.type === 'PERIOD' || classification.type === 'OVULATION'
                    ? 'text-rose-100/90'
                    : 'text-slate-450'
                }`}>
                  {subLabel}
                </span>
              )}

              {/* Symptothermal Indicator Icons */}
              {symptoms && (
                <div className="flex items-center gap-0.5 mt-auto self-end leading-none">
                  {symptoms.bbt && (
                    <Thermometer 
                      className={`h-2.5 w-2.5 shrink-0 ${
                        classification.type === 'PERIOD' || classification.type === 'OVULATION' 
                          ? 'text-white' 
                          : 'text-rose-500'
                      }`} 
                    />
                  )}
                  {(symptoms.mucus || symptoms.mucusTexture) && (
                    <Droplet 
                      className={`h-2.5 w-2.5 shrink-0 ${
                        classification.type === 'PERIOD' || classification.type === 'OVULATION' 
                          ? 'text-white' 
                          : 'text-indigo-500'
                      }`} 
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid Color Key Legend */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Calendar Legend</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-rose-500 border border-rose-600 rounded-md shrink-0"></span>
            <span className="text-slate-600 font-medium">Bleeding Days</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-emerald-500 border border-emerald-600 rounded-md shrink-0"></span>
            <span className="text-slate-600 font-medium">Ovulation Day</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-amber-100 border border-amber-300 rounded-md shrink-0"></span>
            <span className="text-slate-600 font-medium">Unsafe (Fertile) Window</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-white border border-slate-200 rounded-md shrink-0"></span>
            <span className="text-slate-600 font-medium">Safe Day</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-rose-50/50 border border-rose-300 border-dashed rounded-md shrink-0"></span>
            <span className="text-slate-600 font-medium">Predicted Period</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-emerald-50/50 border border-emerald-300 border-dashed rounded-md shrink-0"></span>
            <span className="text-slate-600 font-medium">Predicted Ovulation</span>
          </div>
          <div className="flex items-center gap-2 flex-span-2">
            <span className="w-4 h-4 bg-amber-50/50 border border-amber-200 border-dashed rounded-md shrink-0"></span>
            <span className="text-slate-600 font-medium">Predicted Fertile Window</span>
          </div>
        </div>
      </div>
    </div>
  );
}
