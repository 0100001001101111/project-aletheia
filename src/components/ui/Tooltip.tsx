'use client';

/**
 * Tooltip Component
 * Reusable tooltip for explaining technical jargon
 */

import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-zinc-700',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-zinc-700',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-zinc-700',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-zinc-700',
  };

  return (
    <span className="relative inline-flex items-center">
      <span
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </span>
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-50 w-64 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 shadow-lg ${positionClasses[position]}`}
        >
          {text}
          <div className={`absolute h-0 w-0 border-4 ${arrowClasses[position]}`} />
        </div>
      )}
    </span>
  );
}

/**
 * Info icon with tooltip
 * Use next to technical terms
 */
interface InfoTooltipProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <span
      title={text}
      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700/50 text-xs text-zinc-400 hover:bg-zinc-600/50 hover:text-zinc-300 cursor-help"
    >
      ?
    </span>
  );
}

/**
 * Pre-defined jargon tooltips
 */
export const JARGON_TOOLTIPS: Record<string, string> = {
  confidence_score: "How certain we are this pattern is real, based on how many domains show it and how consistent the data is. Higher = more certain.",
  p_value: "Probability this result happened by chance. Lower = more likely to be real. Scientists typically want p < 0.05 (less than 5% chance of being random).",
  triage_score: "Quality rating from 0-10 based on methodology, data completeness, and source reliability. 7+ means verified.",
  brier_score: "Measures prediction accuracy. Lower = better predictions. 0 = perfect, 1 = completely wrong.",
  domains: "Research categories: Near-Death Experiences, Ganzfeld, Crisis Apparitions, Remote Viewing, and Geophysical anomalies.",
  pattern_matcher: "AI system that scans all investigations to find correlations that appear across multiple research domains.",
  verified: "This submission passed our 4-stage quality check for methodology, source integrity, and data completeness.",
  provisional: "Awaiting review. Data is included in pattern matching but not yet fully verified.",
};

/**
 * Jargon term with built-in tooltip
 */
interface JargonTermProps {
  term: keyof typeof JARGON_TOOLTIPS;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function JargonTerm({ term, children, position = 'top' }: JargonTermProps) {
  const tooltip = JARGON_TOOLTIPS[term];
  if (!tooltip) {
    return <span>{children || term}</span>;
  }
  return (
    <span className="inline-flex items-center">
      <span>{children || term}</span>
      <InfoTooltip text={tooltip} position={position} />
    </span>
  );
}
