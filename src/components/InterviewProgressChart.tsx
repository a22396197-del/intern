import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TrendingUp, Award, Play, Target } from 'lucide-react';
import type { MockInterviewSession, InterviewProgressPoint } from '../types.ts';
import { buildInterviewProgressSeries } from '../utils/logic.ts';

interface InterviewProgressChartProps {
  sessions: MockInterviewSession[];
  onSelectSessionToReview?: (session: MockInterviewSession) => void;
}

export const InterviewProgressChart: React.FC<InterviewProgressChartProps> = ({
  sessions,
  onSelectSessionToReview,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [metricView, setMetricView] = useState<'both' | 'confidence' | 'progress'>('both');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(760);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const availableCategories = useMemo(() => {
    const unique = Array.from(new Set((sessions || []).map((s) => s.category).filter(Boolean)));
    return ['All', ...unique];
  }, [sessions]);

  const summary = useMemo(
    () => buildInterviewProgressSeries(sessions, categoryFilter),
    [sessions, categoryFilter]
  );

  const activePoint: InterviewProgressPoint | null = useMemo(() => {
    if (summary.points.length === 0) return null;
    if (selectedSessionId) {
      const found = summary.points.find((p) => p.sessionId === selectedSessionId);
      if (found) return found;
    }
    return summary.points[summary.points.length - 1];
  }, [summary.points, selectedSessionId]);

  // Observe responsive container width
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const updateWidth = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 240) {
        setContainerWidth(Math.floor(rect.width));
      }
    };
    updateWidth();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateWidth());
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, []);

  // Render D3 Line Chart whenever points, metricView, activePoint, or containerWidth change
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const points = summary.points;
    if (points.length === 0) return;

    const isCompact = containerWidth < 520;
    const width = Math.max(300, containerWidth);
    const height = isCompact ? 250 : 290;
    const margin = {
      top: 26,
      right: isCompact ? 22 : 34,
      bottom: 44,
      left: isCompact ? 38 : 48,
    };
    const innerWidth = Math.max(180, width - margin.left - margin.right);
    const innerHeight = Math.max(140, height - margin.top - margin.bottom);

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height);

    // Definitions for subtle area gradients
    const defs = svg.append('defs');

    const confGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-confidence-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    confGrad.append('stop').attr('offset', '0%').attr('stop-color', '#2A9D8F').attr('stop-opacity', 0.22);
    confGrad.append('stop').attr('offset', '100%').attr('stop-color', '#2A9D8F').attr('stop-opacity', 0.01);

    const progGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-progress-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    progGrad.append('stop').attr('offset', '0%').attr('stop-color', '#6554C0').attr('stop-opacity', 0.18);
    progGrad.append('stop').attr('offset', '100%').attr('stop-color', '#6554C0').attr('stop-opacity', 0.01);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xLabels = points.map((d) => d.sessionLabel);
    const xScale = d3
      .scalePoint<string>()
      .domain(xLabels)
      .range([0, innerWidth])
      .padding(points.length === 1 ? 0.5 : 0.18);

    const yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    const getX = (d: InterviewProgressPoint) => xScale(d.sessionLabel) ?? innerWidth / 2;

    // Horizontal grid lines (0, 25, 50, 75, 100)
    const yTicks = [0, 25, 50, 75, 100];
    g.selectAll('.grid-line')
      .data(yTicks)
      .join('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#E8E5EF')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', (d) => (d === 0 ? 'none' : '3,3'));

    // Target Readiness Benchmark line at 75%
    const benchmarkY = yScale(75);
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', benchmarkY)
      .attr('y2', benchmarkY)
      .attr('stroke', '#2A9D8F')
      .attr('stroke-width', 1.25)
      .attr('stroke-dasharray', '5,4')
      .attr('opacity', 0.65);

    const benchLabelText = isCompact ? '75% Target Benchmark' : '75% Interview Readiness Benchmark';
    const benchBgWidth = isCompact ? 118 : 196;
    g.append('rect')
      .attr('x', 6)
      .attr('y', benchmarkY - 17)
      .attr('width', benchBgWidth)
      .attr('height', 14)
      .attr('rx', 4)
      .attr('fill', '#FAF9F6')
      .attr('opacity', 0.92);

    g.append('text')
      .attr('x', 10)
      .attr('y', benchmarkY - 7)
      .attr('text-anchor', 'start')
      .attr('fill', '#2A9D8F')
      .attr('font-size', isCompact ? '9px' : '10px')
      .attr('font-weight', '600')
      .text(benchLabelText);

    // Y-Axis labels
    const yAxis = d3
      .axisLeft(yScale)
      .tickValues(yTicks)
      .tickFormat((d) => `${d}%`)
      .tickSize(0)
      .tickPadding(8);

    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').remove();
    yAxisGroup
      .selectAll('text')
      .attr('fill', '#747484')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');

    // X-Axis labels (S1 · Oct 03, etc.)
    const labelBySession: Record<string, string> = {};
    for (const pt of points) {
      labelBySession[pt.sessionLabel] = isCompact
        ? pt.sessionLabel
        : `${pt.sessionLabel} (${pt.dateLabel})`;
    }

    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((d) => labelBySession[d] || d)
      .tickSize(0)
      .tickPadding(14);

    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);
    xAxisGroup.select('.domain').attr('stroke', '#E8E5EF');
    xAxisGroup
      .selectAll('text')
      .attr('fill', '#292344')
      .attr('font-size', isCompact ? '10px' : '11px')
      .attr('font-weight', '600')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');

    // Highlight vertical guide for active session
    if (activePoint) {
      const activeX = getX(activePoint);
      g.append('line')
        .attr('x1', activeX)
        .attr('x2', activeX)
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#6554C0')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '2,3')
        .attr('opacity', 0.45);
    }

    // 1. Technical Progress Score Area + Line (#6554C0)
    if (metricView === 'both' || metricView === 'progress') {
      if (points.length > 1) {
        const progressArea = d3
          .area<InterviewProgressPoint>()
          .x((d) => getX(d))
          .y0(innerHeight)
          .y1((d) => yScale(d.progressScore))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(points)
          .attr('fill', 'url(#d3-progress-gradient)')
          .attr('d', progressArea);

        const progressLine = d3
          .line<InterviewProgressPoint>()
          .x((d) => getX(d))
          .y((d) => yScale(d.progressScore))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(points)
          .attr('fill', 'none')
          .attr('stroke', '#6554C0')
          .attr('stroke-width', 2.5)
          .attr('d', progressLine);
      }
    }

    // 2. Confidence & Readiness Score Area + Line (#2A9D8F)
    if (metricView === 'both' || metricView === 'confidence') {
      if (points.length > 1) {
        const confidenceArea = d3
          .area<InterviewProgressPoint>()
          .x((d) => getX(d))
          .y0(innerHeight)
          .y1((d) => yScale(d.confidenceScore))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(points)
          .attr('fill', 'url(#d3-confidence-gradient)')
          .attr('d', confidenceArea);

        const confidenceLine = d3
          .line<InterviewProgressPoint>()
          .x((d) => getX(d))
          .y((d) => yScale(d.confidenceScore))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(points)
          .attr('fill', 'none')
          .attr('stroke', '#2A9D8F')
          .attr('stroke-width', 3)
          .attr('d', confidenceLine);
      }
    }

    // Interactive Data Nodes for Progress Score
    if (metricView === 'both' || metricView === 'progress') {
      const progNodes = g
        .selectAll('.progress-node')
        .data(points)
        .join('g')
        .attr('class', 'progress-node')
        .attr('transform', (d) => `translate(${getX(d)},${yScale(d.progressScore)})`)
        .style('cursor', 'pointer')
        .on('click', (_event, d) => {
          setSelectedSessionId(d.sessionId);
        });

      progNodes
        .append('circle')
        .attr('r', (d) => (activePoint?.sessionId === d.sessionId ? 6.5 : 4.5))
        .attr('fill', (d) => (activePoint?.sessionId === d.sessionId ? '#6554C0' : '#FFFFFF'))
        .attr('stroke', '#6554C0')
        .attr('stroke-width', 2.25);

      progNodes
        .append('text')
        .attr('y', (d) =>
          metricView === 'both' && d.confidenceScore >= d.progressScore ? 15 : -10
        )
        .attr('text-anchor', 'middle')
        .attr('fill', '#6554C0')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .text((d) => `${d.progressScore}%`);
    }

    // Interactive Data Nodes for Confidence Score
    if (metricView === 'both' || metricView === 'confidence') {
      const confNodes = g
        .selectAll('.confidence-node')
        .data(points)
        .join('g')
        .attr('class', 'confidence-node')
        .attr('transform', (d) => `translate(${getX(d)},${yScale(d.confidenceScore)})`)
        .style('cursor', 'pointer')
        .on('click', (_event, d) => {
          setSelectedSessionId(d.sessionId);
        });

      confNodes
        .append('circle')
        .attr('r', (d) => (activePoint?.sessionId === d.sessionId ? 7 : 5))
        .attr('fill', (d) => (activePoint?.sessionId === d.sessionId ? '#2A9D8F' : '#FFFFFF'))
        .attr('stroke', '#2A9D8F')
        .attr('stroke-width', 2.5);

      confNodes
        .append('text')
        .attr('y', -11)
        .attr('text-anchor', 'middle')
        .attr('fill', '#2A9D8F')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .text((d) => `${d.confidenceScore}%`);
    }
  }, [summary.points, metricView, activePoint, containerWidth]);

  const activeFullSession = useMemo(() => {
    if (!activePoint) return null;
    return sessions.find((s) => s.id === activePoint.sessionId) || null;
  }, [activePoint, sessions]);

  return (
    <div
      data-testid="interview-progress-chart-section"
      className="pt-4 border-t border-[#E8E5EF] space-y-4"
    >
      {/* Header + Category & Metric Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#2A9D8F] shrink-0" />
            <h2 className="text-sm font-bold text-[#292344]">
              Interview Progress & Confidence Score Trajectory (D3 Analytics)
            </h2>
          </div>
          <p className="text-xs text-[#747484]">
            Tracks your consecutive mock interview sessions from earliest (S1) to latest, comparing technical rubric scores against communication & key-point confidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Series Selector */}
          <div
            role="group"
            aria-label="Chart Metric Series"
            className="inline-flex items-center p-1 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF]"
          >
            <button
              type="button"
              onClick={() => setMetricView('both')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricView === 'both'
                  ? 'bg-[#292344] text-[#FFFFFF]'
                  : 'text-[#747484] hover:text-[#292344]'
              }`}
            >
              Both Series
            </button>
            <button
              type="button"
              onClick={() => setMetricView('confidence')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricView === 'confidence'
                  ? 'bg-[#2A9D8F] text-[#FFFFFF]'
                  : 'text-[#747484] hover:text-[#292344]'
              }`}
            >
              Confidence Score
            </button>
            <button
              type="button"
              onClick={() => setMetricView('progress')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricView === 'progress'
                  ? 'bg-[#6554C0] text-[#FFFFFF]'
                  : 'text-[#747484] hover:text-[#292344]'
              }`}
            >
              Progress Score
            </button>
          </div>

          {/* Category Filter */}
          {availableCategories.length > 2 && (
            <div
              role="group"
              aria-label="Filter Sessions by Role Category"
              className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF]"
            >
              {availableCategories.map((cat) => {
                const shortCat =
                  cat === 'All'
                    ? 'All Categories'
                    : cat.replace(' Development', '');
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-[#EEE9FF] text-[#6554C0]'
                        : 'text-[#747484] hover:text-[#292344]'
                    }`}
                  >
                    {shortCat}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top 4 Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-0.5">
          <p className="text-[11px] text-[#747484]">Latest Confidence Score</p>
          <p className="text-lg font-mono font-bold text-[#2A9D8F] tabular-nums">
            {summary.latestConfidenceScore}%
            {summary.totalSessions > 1 && (
              <span className="ml-2 text-xs font-semibold text-[#2A9D8F]">
                {summary.confidenceImprovement >= 0
                  ? `+${summary.confidenceImprovement}% vs S1`
                  : `${summary.confidenceImprovement}% vs S1`}
              </span>
            )}
          </p>
          <p className="text-[11px] text-[#747484] tabular-nums">
            Peak readiness: {summary.peakConfidenceScore}%
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-0.5">
          <p className="text-[11px] text-[#747484]">Latest Technical Progress</p>
          <p className="text-lg font-mono font-bold text-[#6554C0] tabular-nums">
            {summary.latestProgressScore}%
            {summary.totalSessions > 1 && (
              <span className="ml-2 text-xs font-semibold text-[#6554C0]">
                {summary.progressImprovement >= 0
                  ? `+${summary.progressImprovement}% vs S1`
                  : `${summary.progressImprovement}% vs S1`}
              </span>
            )}
          </p>
          <p className="text-[11px] text-[#747484] tabular-nums">
            Average across sessions: {summary.averageProgressScore}%
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-0.5">
          <p className="text-[11px] text-[#747484]">Consecutive Sessions Logged</p>
          <p className="text-lg font-mono font-bold text-[#292344] tabular-nums">
            {summary.totalSessions} Sessions
          </p>
          <p className="text-[11px] text-[#747484] tabular-nums">
            Improvement streak: {summary.consecutiveImprovementStreak} consecutive gains
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-0.5">
          <p className="text-[11px] text-[#747484]">Readiness Status (75% Target)</p>
          <p className="text-sm font-bold text-[#292344] pt-0.5">
            {summary.latestConfidenceScore >= 75
              ? 'Benchmark Achieved — Ready for Live Interviews'
              : `${75 - summary.latestConfidenceScore}% to Reach 75% Benchmark`}
          </p>
          <p className="text-[11px] text-[#747484] tabular-nums">
            Avg confidence: {summary.averageConfidenceScore}%
          </p>
        </div>
      </div>

      {/* Main D3 Line Chart Canvas + Interactive Session Inspector */}
      {summary.points.length === 0 ? (
        <div className="p-6 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] text-center space-y-2">
          <p className="text-sm font-bold text-[#292344]">
            No Mock Interview Sessions Recorded for {categoryFilter} Yet
          </p>
          <p className="text-xs text-[#747484]">
            Select a category in Step 1 above and complete a 15-question session to plot your progress and confidence trajectory.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left 8 Cols: D3 SVG Chart + Consecutive Session Selector Strip */}
          <div
            ref={wrapperRef}
            className="lg:col-span-8 p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] flex flex-col justify-between space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#292344]">
                  <span className="w-3 h-0.5 bg-[#2A9D8F] inline-block" />
                  <span>Confidence & Readiness Score (%)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#292344]">
                  <span className="w-3 h-0.5 bg-[#6554C0] inline-block" />
                  <span>Technical Progress Score (%)</span>
                </span>
              </div>
              <span className="text-[11px] text-[#747484]">
                Click any session node to inspect details
              </span>
            </div>

            <div className="w-full overflow-hidden">
              <svg
                ref={svgRef}
                data-testid="d3-interview-progress-svg"
                role="img"
                aria-label="D3 line chart showing interview progress score and confidence score improvements across consecutive sessions"
                className="w-full block select-none"
              />
            </div>

            {/* Accessible Session Node Strip for Keyboard & Screen Reader Selection */}
            <div
              role="group"
              aria-label="Select Consecutive Interview Session"
              className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E8E5EF]"
            >
              {summary.points.map((pt) => {
                const isSelected = activePoint?.sessionId === pt.sessionId;
                return (
                  <button
                    key={pt.sessionId}
                    type="button"
                    onClick={() => setSelectedSessionId(pt.sessionId)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-[#292344] text-[#FFFFFF] font-bold'
                        : 'bg-[#FFFFFF] text-[#292936] border border-[#E8E5EF] hover:border-[#6554C0]'
                    }`}
                  >
                    {pt.sessionLabel} · {pt.dateLabel} ({pt.confidenceScore}%)
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right 4 Cols: Selected Consecutive Session Breakdown & Action */}
          {activePoint && (
            <div className="lg:col-span-4 p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] flex flex-col justify-between space-y-3 text-xs">
              <div className="space-y-3">
                <div className="border-b border-[#E8E5EF] pb-2.5 space-y-1">
                  <p className="text-[11px] font-mono font-semibold text-[#6554C0] tabular-nums">
                    Session {activePoint.sessionIndex} of {summary.totalSessions} ({activePoint.sessionLabel}) · {activePoint.dateLabel} · {activePoint.mode}
                  </p>
                  <h3 className="text-sm font-bold text-[#292344]">
                    {activePoint.category} — {activePoint.targetRole}
                  </h3>
                  {activePoint.targetInternshipTitle && (
                    <p className="text-[11px] text-[#747484]">
                      Target Listing: {activePoint.targetInternshipTitle}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#E8E5EF]">
                    <p className="text-[11px] text-[#747484]">Confidence Score</p>
                    <p className="text-base font-mono font-bold text-[#2A9D8F] tabular-nums">
                      {activePoint.confidenceScore}/100
                    </p>
                    <p className="text-[11px] font-mono text-[#747484] tabular-nums">
                      {activePoint.sessionIndex === 1
                        ? 'Baseline session'
                        : activePoint.confidenceDelta >= 0
                        ? `+${activePoint.confidenceDelta}% vs S${activePoint.sessionIndex - 1}`
                        : `${activePoint.confidenceDelta}% vs S${activePoint.sessionIndex - 1}`}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#E8E5EF]">
                    <p className="text-[11px] text-[#747484]">Progress Score</p>
                    <p className="text-base font-mono font-bold text-[#6554C0] tabular-nums">
                      {activePoint.progressScore}/100
                    </p>
                    <p className="text-[11px] font-mono text-[#747484] tabular-nums">
                      {activePoint.sessionIndex === 1
                        ? 'Baseline session'
                        : activePoint.progressDelta >= 0
                        ? `+${activePoint.progressDelta}% vs S${activePoint.sessionIndex - 1}`
                        : `${activePoint.progressDelta}% vs S${activePoint.sessionIndex - 1}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[#292936] tabular-nums">
                    <strong className="text-[#292344]">Completion:</strong>{' '}
                    {activePoint.questionsAnswered} / {activePoint.totalQuestions} Questions Answered
                  </p>
                  <p className="text-[#292936]">
                    <strong className="text-[#292344]">Demonstrated Strength:</strong>{' '}
                    {activePoint.topStrength}
                  </p>
                  <p className="text-[#292936]">
                    <strong className="text-[#292344]">Focus Area for Next Session:</strong>{' '}
                    {activePoint.keyFocusArea}
                  </p>
                </div>
              </div>

              {activeFullSession && onSelectSessionToReview && (
                <button
                  type="button"
                  onClick={() => onSelectSessionToReview(activeFullSession)}
                  className="w-full h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Review {activePoint.sessionLabel} Questions & Feedback</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
