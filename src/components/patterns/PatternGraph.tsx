'use client';

/**
 * PatternGraph
 * Network visualization showing domain connections through shared patterns
 */

import { useCallback, useMemo, useState } from 'react';
import type { InvestigationType } from '@/types/database';
import { SCHEMA_METADATA } from '@/schemas';
import type { DetectedPattern } from '@/lib/pattern-matcher';

interface PatternGraphProps {
  patterns: DetectedPattern[];
  onNodeClick?: (domain: InvestigationType) => void;
  onEdgeClick?: (pattern: DetectedPattern) => void;
}

// Node positions (circular layout)
const NODE_POSITIONS: Record<InvestigationType, { x: number; y: number }> = {
  nde: { x: 50, y: 15 },
  ganzfeld: { x: 85, y: 40 },
  stargate: { x: 70, y: 80 },
  crisis_apparition: { x: 30, y: 80 },
  geophysical: { x: 15, y: 40 },
};

interface GraphNode {
  id: InvestigationType;
  x: number;
  y: number;
  patternCount: number;
}

interface GraphEdge {
  source: InvestigationType;
  target: InvestigationType;
  patterns: DetectedPattern[];
  strength: number;
}

export function PatternGraph({ patterns, onNodeClick, onEdgeClick }: PatternGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<InvestigationType | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<DetectedPattern | null>(null);

  // Calculate nodes
  const nodes: GraphNode[] = useMemo(() => {
    const domains: InvestigationType[] = ['nde', 'ganzfeld', 'crisis_apparition', 'stargate', 'geophysical'];
    return domains.map((domain) => {
      const domainPatterns = patterns.filter((p) => p.domains.includes(domain));
      return {
        id: domain,
        ...NODE_POSITIONS[domain],
        patternCount: domainPatterns.length,
      };
    });
  }, [patterns]);

  // Calculate edges
  const edges: GraphEdge[] = useMemo(() => {
    const edgeMap = new Map<string, GraphEdge>();
    const domains: InvestigationType[] = ['nde', 'ganzfeld', 'crisis_apparition', 'stargate', 'geophysical'];

    for (let i = 0; i < domains.length; i++) {
      for (let j = i + 1; j < domains.length; j++) {
        const source = domains[i];
        const target = domains[j];
        const sharedPatterns = patterns.filter(
          (p) => p.domains.includes(source) && p.domains.includes(target)
        );

        if (sharedPatterns.length > 0) {
          const key = `${source}-${target}`;
          const strength = sharedPatterns.reduce((sum, p) => sum + p.confidenceScore, 0);
          edgeMap.set(key, {
            source,
            target,
            patterns: sharedPatterns,
            strength,
          });
        }
      }
    }

    return Array.from(edgeMap.values());
  }, [patterns]);

  const handleNodeClick = useCallback((domain: InvestigationType) => {
    if (onNodeClick) {
      onNodeClick(domain);
    }
  }, [onNodeClick]);

  const handleEdgeClick = useCallback((edge: GraphEdge) => {
    if (edge.patterns.length === 1) {
      setSelectedPattern(edge.patterns[0]);
      if (onEdgeClick) {
        onEdgeClick(edge.patterns[0]);
      }
    } else {
      // Show pattern selector for multiple patterns
      setSelectedPattern(edge.patterns[0]);
    }
  }, [onEdgeClick]);

  // Calculate edge path
  const getEdgePath = (source: InvestigationType, target: InvestigationType): string => {
    const s = NODE_POSITIONS[source];
    const t = NODE_POSITIONS[target];
    return `M ${s.x} ${s.y} L ${t.x} ${t.y}`;
  };

  // Get edge label position (midpoint)
  const getEdgeLabelPosition = (source: InvestigationType, target: InvestigationType) => {
    const s = NODE_POSITIONS[source];
    const t = NODE_POSITIONS[target];
    return {
      x: (s.x + t.x) / 2,
      y: (s.y + t.y) / 2,
    };
  };

  return (
    <div className="relative">
      {/* SVG Graph */}
      <svg
        viewBox="0 0 100 100"
        className="h-[500px] w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background */}
        <rect x="0" y="0" width="100" height="100" fill="transparent" />

        {/* Edges */}
        <g className="edges">
          {edges.map((edge) => {
            const key = `${edge.source}-${edge.target}`;
            const isHovered = hoveredEdge === key ||
              hoveredNode === edge.source ||
              hoveredNode === edge.target;
            const strokeWidth = Math.max(0.5, Math.min(3, edge.strength));
            const opacity = isHovered ? 1 : 0.6;

            return (
              <g key={key}>
                <path
                  d={getEdgePath(edge.source, edge.target)}
                  stroke={isHovered ? '#a78bfa' : '#6b7280'}
                  strokeWidth={strokeWidth}
                  fill="none"
                  opacity={opacity}
                  className="cursor-pointer transition-all hover:stroke-violet-400"
                  onMouseEnter={() => setHoveredEdge(key)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  onClick={() => handleEdgeClick(edge)}
                />
                {/* Edge label */}
                {isHovered && (
                  <g>
                    <circle
                      cx={getEdgeLabelPosition(edge.source, edge.target).x}
                      cy={getEdgeLabelPosition(edge.source, edge.target).y}
                      r="4"
                      fill="#18181b"
                      stroke="#a78bfa"
                      strokeWidth="0.5"
                    />
                    <text
                      x={getEdgeLabelPosition(edge.source, edge.target).x}
                      y={getEdgeLabelPosition(edge.source, edge.target).y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-violet-400 text-[3px] font-bold"
                    >
                      {edge.patterns.length}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Nodes */}
        <g className="nodes">
          {nodes.map((node) => {
            const metadata = SCHEMA_METADATA[node.id];
            const isHovered = hoveredNode === node.id;
            const nodeSize = Math.max(6, Math.min(10, 5 + node.patternCount));

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick(node.id)}
              >
                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeSize}
                  className={`transition-all ${
                    isHovered
                      ? 'fill-violet-500 stroke-violet-300'
                      : 'fill-zinc-700 stroke-zinc-500'
                  }`}
                  strokeWidth="0.5"
                />

                {/* Node icon */}
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[4px]"
                >
                  {metadata.icon}
                </text>

                {/* Node label */}
                <text
                  x={node.x}
                  y={node.y + nodeSize + 3}
                  textAnchor="middle"
                  className={`text-[3px] ${isHovered ? 'fill-zinc-100' : 'fill-zinc-400'}`}
                >
                  {metadata.name.split(' ')[0]}
                </text>

                {/* Pattern count badge */}
                {node.patternCount > 0 && (
                  <g>
                    <circle
                      cx={node.x + nodeSize - 1}
                      cy={node.y - nodeSize + 2}
                      r="2.5"
                      className="fill-violet-600"
                    />
                    <text
                      x={node.x + nodeSize - 1}
                      y={node.y - nodeSize + 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white text-[2px] font-bold"
                    >
                      {node.patternCount}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 rounded-lg border border-zinc-700 bg-zinc-900/90 p-3">
        <h4 className="mb-2 text-xs font-medium text-zinc-300">Legend</h4>
        <div className="space-y-1 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <div className="h-2 w-4 rounded bg-zinc-600" />
            <span>Connection (shared patterns)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border border-zinc-500 bg-zinc-700" />
            <span>Research domain</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-violet-600" />
            <span>Pattern count</span>
          </div>
        </div>
      </div>

      {/* Selected pattern details */}
      {selectedPattern && (
        <div className="absolute right-4 top-4 max-w-xs rounded-lg border border-zinc-700 bg-zinc-900/95 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-medium text-zinc-200">Pattern Details</h4>
            <button
              onClick={() => setSelectedPattern(null)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mb-3 text-sm text-zinc-400">{selectedPattern.description}</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Confidence</span>
              <span className="text-violet-400">
                {(selectedPattern.confidenceScore * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Domains</span>
              <span className="text-zinc-300">{selectedPattern.domains.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Sample Size</span>
              <span className="text-zinc-300">{selectedPattern.sampleSize}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {selectedPattern.domains.map((domain) => {
              const meta = SCHEMA_METADATA[domain];
              return (
                <span
                  key={domain}
                  className={`rounded-full bg-zinc-800 px-2 py-0.5 text-xs ${meta.color}`}
                >
                  {meta.icon} {domain}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
