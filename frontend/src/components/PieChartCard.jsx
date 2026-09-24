// src/components/PieChartCard.jsx — Reusable donut/pie chart card (recharts)
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * PieChartCard
 * Renders a donut chart + a color-keyed legend list inside a standard `.card`.
 *
 * Props:
 *  - title:      string           card heading text
 *  - icon:       ReactNode        small icon rendered before the title
 *  - data:       [{ label, value, color }]  slice data (values > 0 are kept)
 *  - fmt:        (n) => string    currency/number formatter for tooltip + legend
 *  - emptyText:  string           message shown when there's no data
 *  - height:     number           chart height in px (default 200)
 *  - headerRight: ReactNode       optional node rendered on the right of the header
 */
export default function PieChartCard({
  title,
  icon,
  data = [],
  fmt = (n) => n,
  emptyText = 'No data yet',
  height = 200,
  headerRight = null,
}) {
  const slices = (data || []).filter((d) => (d.value || 0) > 0);
  const total = slices.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          {icon && (
            <div className="card-title-icon" style={{ background: 'rgba(37,99,235,.10)', color: 'var(--royal, var(--primary))' }}>
              {icon}
            </div>
          )}
          {title}
        </div>
        {headerRight}
      </div>

      {slices.length === 0 ? (
        <div style={{ color: 'var(--text-3, var(--muted))', fontSize: 12.5, textAlign: 'center', padding: '28px 0' }}>
          {emptyText}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 160, height, flexShrink: 0, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="92%"
                  paddingAngle={2}
                  stroke="var(--bg-card, #fff)"
                  strokeWidth={2}
                  isAnimationActive={true}
                >
                  {slices.map((s, i) => (
                    <Cell key={i} fill={s.color || '#2563EB'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [fmt(value), name]}
                  contentStyle={{
                    background: 'var(--bg-card, #fff)',
                    border: '1px solid var(--border, #e5e7eb)',
                    borderRadius: 10,
                    fontSize: 12,
                    fontFamily: "'Inter', sans-serif",
                    boxShadow: '0 8px 24px rgba(0,0,0,.12)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center total label */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-3, var(--muted))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Total
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text, var(--gray-900))', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(total)}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ flex: '1 1 160px', minWidth: 160, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slices
              .slice()
              .sort((a, b) => (b.value || 0) - (a.value || 0))
              .map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color || '#2563EB', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-2, var(--gray-700))', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                  <span style={{ color: 'var(--text-3, var(--muted))', fontWeight: 700, fontSize: 11 }}>
                    {total > 0 ? `${Math.round((s.value / total) * 100)}%` : '0%'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
