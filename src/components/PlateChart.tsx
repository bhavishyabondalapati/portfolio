// Small figures drawn from a project's own numbers, for plates that have no picture.
// Plain HTML and CSS, so they stay sharp, theme with the page and read well with a screen reader.
import type { PlateChart as Chart } from "@/content";

export function PlateChart({ chart }: { chart: Chart }) {
  if (chart.kind === "bars") {
    const max = Math.max(...chart.rows.map((r) => r.value));
    return (
      <figure className="chart chart-bars">
        <figcaption className="mono">
          {chart.caption} <span>({chart.unit})</span>
        </figcaption>
        <dl>
          {chart.rows.map((r, i) => (
            <div key={r.label} className="bar-row">
              <dt>{r.label}</dt>
              <dd>
                {/* linear scale on purpose: the fast bar is meant to look almost empty */}
                <span className={`bar-fill${i === 0 ? " is-accent" : ""}`} style={{ width: `max(3px, ${(r.value / max) * 100}%)` }} />
                <span className="bar-value">
                  {r.value}
                  {chart.suffix ? ` ${chart.suffix}` : ""}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </figure>
    );
  }
  return (
    <figure className="chart chart-steps">
      <figcaption className="mono">{chart.caption}</figcaption>
      <ol>
        {chart.steps.map((s) => (
          <li key={s} className={s.startsWith("You confirm") ? "is-accent" : undefined}>
            {s}
          </li>
        ))}
      </ol>
    </figure>
  );
}
