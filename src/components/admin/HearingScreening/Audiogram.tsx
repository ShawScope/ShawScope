import { useState, useEffect } from 'react';
import { ThresholdResult, CLASSIFICATION_BANDS, STANDARD_FREQUENCIES, Ear } from './types';

interface CurrentMarker {
  ear: Ear;
  frequency_hz: number;
  estimated_dbhl: number;
}

interface AudiogramProps {
  leftThresholds: ThresholdResult[];
  rightThresholds: ThresholdResult[];
  compact?: boolean;
  frequencies?: number[];
  currentMarker?: CurrentMarker | null;
}

const Audiogram = ({ leftThresholds, rightThresholds, compact = false, frequencies, currentMarker }: AudiogramProps) => {
  const freqs = frequencies || STANDARD_FREQUENCIES;
  const isWide = freqs.length > 6;

  // Last-played fading marker
  const [lastPlayed, setLastPlayed] = useState<CurrentMarker | null>(null);
  const [lastPlayedOpacity, setLastPlayedOpacity] = useState(0);

  useEffect(() => {
    if (currentMarker) {
      setLastPlayed({ ...currentMarker });
      setLastPlayedOpacity(0.5);
      const timer = setTimeout(() => setLastPlayedOpacity(0), 2500);
      return () => clearTimeout(timer);
    }
  }, [currentMarker?.frequency_hz, currentMarker?.estimated_dbhl, currentMarker?.ear]);

  const width = 360;
  const height = compact ? 200 : 300;
  const margin = compact
    ? { top: 20, right: isWide ? 20 : 28, bottom: 30, left: 38 }
    : { top: 30, right: 30, bottom: 45, left: 55 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const dbRange = [-10, 100];

  const logMin = Math.log2(freqs[0]);
  const logMax = Math.log2(freqs[freqs.length - 1]);
  const xScale = (freq: number) => {
    const logF = Math.log2(freq);
    const ratio = (logF - logMin) / (logMax - logMin);
    return margin.left + ratio * plotW;
  };

  const yScale = (db: number) => {
    const ratio = (db - dbRange[0]) / (dbRange[1] - dbRange[0]);
    return margin.top + ratio * plotH;
  };

  const fontSize = compact ? (isWide ? 6 : 7) : (isWide ? 8 : 10);
  const labelFontSize = compact ? 6 : 9;

  const formatFreq = (f: number) => {
    if (f >= 1000) return `${f / 1000}k`;
    return String(f);
  };

  const markerSize = compact ? 3.5 : 6;

  return (
    <div className="w-full">
      {!compact && (
        <p className="text-xs text-muted-foreground mb-1 text-center font-medium">
          Hearing Level (dB HL – Screening Estimate)
        </p>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Background bands */}
        {CLASSIFICATION_BANDS.map(band => {
          const y1 = yScale(Math.max(band.min, dbRange[0]));
          const y2 = yScale(Math.min(band.max, dbRange[1]));
          return (
            <g key={band.key}>
              <rect x={margin.left} y={y1} width={plotW} height={y2 - y1} fill={band.colour} opacity={0.08} />
              {!compact && (
                <text x={margin.left + plotW + 4} y={(y1 + y2) / 2 + 4} fontSize={6} fill={band.colour} fontWeight="600">
                  {band.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Grid lines */}
        {freqs.map(f => (
          <line key={`vg-${f}`} x1={xScale(f)} y1={margin.top} x2={xScale(f)} y2={margin.top + plotH}
            stroke="#e5e7eb" strokeWidth={0.5} />
        ))}
        {[0, 20, 40, 60, 80, 100].map(db => (
          <line key={`hg-${db}`} x1={margin.left} y1={yScale(db)} x2={margin.left + plotW} y2={yScale(db)}
            stroke="#e5e7eb" strokeWidth={0.5} />
        ))}

        {/* Axes labels */}
        {freqs.map(f => (
          <text key={`xl-${f}`} x={xScale(f)} y={margin.top + plotH + (compact ? 12 : 18)}
            textAnchor="middle" fontSize={fontSize} fill="#6b7280">{formatFreq(f)}</text>
        ))}
        {[0, 20, 40, 60, 80, 100].map(db => (
          <text key={`yl-${db}`} x={margin.left - 6} y={yScale(db) + 3}
            textAnchor="end" fontSize={labelFontSize} fill="#6b7280">{db}</text>
        ))}

        {/* Axis titles */}
        {!compact && (
          <>
            <text x={margin.left + plotW / 2} y={height - 3} textAnchor="middle" fontSize={9} fill="#374151">
              Frequency (Hz)
            </text>
            <text x={10} y={margin.top + plotH / 2} textAnchor="middle" fontSize={9} fill="#374151"
              transform={`rotate(-90, 10, ${margin.top + plotH / 2})`}>
              dB HL (est.)
            </text>
          </>
        )}

        {/* Left ear line + X markers */}
        {leftThresholds.length > 1 && (
          <polyline
            points={leftThresholds.map(t => `${xScale(t.frequency_hz)},${yScale(t.estimated_dbhl)}`).join(' ')}
            fill="none" stroke="#3b82f6" strokeWidth={1.5}
          />
        )}
        {leftThresholds.map(t => {
          const cx = xScale(t.frequency_hz);
          const cy = yScale(t.estimated_dbhl);
          return (
            <g key={`l-${t.frequency_hz}`}>
              <line x1={cx - markerSize} y1={cy - markerSize} x2={cx + markerSize} y2={cy + markerSize} stroke="#3b82f6" strokeWidth={2} />
              <line x1={cx + markerSize} y1={cy - markerSize} x2={cx - markerSize} y2={cy + markerSize} stroke="#3b82f6" strokeWidth={2} />
              {compact && (
                <text x={cx} y={cy - markerSize - 2} textAnchor="middle" fontSize={5} fill="#3b82f6">{t.estimated_dbhl}</text>
              )}
            </g>
          );
        })}

        {/* Right ear line + O markers */}
        {rightThresholds.length > 1 && (
          <polyline
            points={rightThresholds.map(t => `${xScale(t.frequency_hz)},${yScale(t.estimated_dbhl)}`).join(' ')}
            fill="none" stroke="#ef4444" strokeWidth={1.5}
          />
        )}
        {rightThresholds.map(t => {
          const r = markerSize;
          const cx = xScale(t.frequency_hz);
          const cy = yScale(t.estimated_dbhl);
          return (
            <g key={`r-${t.frequency_hz}`}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth={2} />
              {compact && (
                <text x={cx} y={cy - r - 2} textAnchor="middle" fontSize={5} fill="#ef4444">{t.estimated_dbhl}</text>
              )}
            </g>
          );
        })}

        {/* LIVE CURRENT MARKER */}
        {currentMarker && (
          (() => {
            const cx = xScale(currentMarker.frequency_hz);
            const cy = yScale(currentMarker.estimated_dbhl);
            const s = markerSize + 2;
            const isLeft = currentMarker.ear === 'left';
            const color = isLeft ? '#3b82f6' : '#ef4444';
            return (
              <g>
                {/* Pulsing glow */}
                <circle cx={cx} cy={cy} r={s + 4} fill={color} opacity={0.15}>
                  <animate attributeName="r" values={`${s + 2};${s + 6};${s + 2}`} dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.15;0.05;0.15" dur="1.5s" repeatCount="indefinite" />
                </circle>
                {isLeft ? (
                  <>
                    <line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} stroke={color} strokeWidth={1.5} strokeDasharray="3,2" />
                    <line x1={cx + s} y1={cy - s} x2={cx - s} y2={cy + s} stroke={color} strokeWidth={1.5} strokeDasharray="3,2" />
                  </>
                ) : (
                  <circle cx={cx} cy={cy} r={s} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3,2" />
                )}
                <text x={cx + s + 3} y={cy + 3} fontSize={compact ? 5 : 7} fill={color} fontWeight="600">
                  Current
                </text>
              </g>
            );
          })()
        )}

        {/* LAST PLAYED MARKER (fading) */}
        {lastPlayed && lastPlayedOpacity > 0 && (
          (() => {
            const cx = xScale(lastPlayed.frequency_hz);
            const cy = yScale(lastPlayed.estimated_dbhl);
            const color = lastPlayed.ear === 'left' ? '#3b82f6' : '#ef4444';
            return (
              <circle cx={cx} cy={cy} r={markerSize + 1} fill={color} opacity={lastPlayedOpacity * 0.3}
                style={{ transition: 'opacity 2s ease-out' }} />
            );
          })()
        )}

        {/* Legend */}
        <g transform={`translate(${margin.left + 4}, ${margin.top + 4})`}>
          <line x1={0} y1={0} x2={6} y2={6} stroke="#3b82f6" strokeWidth={1.5} />
          <line x1={6} y1={0} x2={0} y2={6} stroke="#3b82f6" strokeWidth={1.5} />
          <text x={12} y={6} fontSize={compact ? 7 : 8} fill="#3b82f6">L</text>
          <circle cx={3} cy={16} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} />
          <text x={12} y={19} fontSize={compact ? 7 : 8} fill="#ef4444">R</text>
        </g>
      </svg>
      {!compact && (
        <p className="text-[9px] text-muted-foreground text-center mt-0.5 italic">
          Estimated values for screening purposes only.
        </p>
      )}
    </div>
  );
};

export default Audiogram;
