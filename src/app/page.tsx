import { Sections } from "@/components/Sections";
import { FlyButton, SurveyController, ThemeToggle } from "@/components/Survey";
import { contact, featured, person, survey } from "@/content";
import { formatCoords } from "@/lib/geo";

const nav = [
  ["experience", "Experience"],
  ["projects", "Projects"],
  ["coursework", "Coursework"],
  ["earlier-work", "Earlier work"],
  ["about", "About"],
  ["contact", "Contact"],
];

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#experience">
        Skip to content
      </a>
      <header className="bar">
        <div className="wrap bar-inner">
          <a className="wordmark" href="#top">
            {person.name}
          </a>
          <nav aria-label="Sections">
            {nav.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main>
        <section id="top" className="hero" aria-labelledby="hero-title">
          <div className="wrap hero-grid">
            <div className="hero-name">
              <p className="mono sheet-label">
                <span>
                  <b>Sheet 00</b> · Survey of work
                </span>
                <span>{formatCoords(person.station)}</span>
              </p>
              <h1 id="hero-title">
                {person.name.split(" ").map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </h1>
            </div>
            <div className="hero-text">
              <p className="hero-role">{person.role}</p>
              <p className="hero-lede">{person.heroLine}</p>
              <div className="hero-actions">
                <a className="btn btn-primary" href={person.heroAction.href}>
                  {person.heroAction.label}
                </a>
                <FlyButton />
              </div>
              <p className="hero-links">
                <a href={`mailto:${contact.email}`}>Email</a>
                {contact.links.map((l) => (
                  <a key={l.href} href={l.href} rel="noopener noreferrer" target="_blank">
                    {l.label}
                  </a>
                ))}
              </p>
            </div>
            <aside className="legend" aria-label="At a glance">
              <p className="legend-head mono">
                <span>Legend</span>
                <span>Rev. {survey.revised}</span>
              </p>
              <dl>
                {survey.legend.map((row) => (
                  <div key={row.key}>
                    <dt className="mono">{row.key}</dt>
                    <dd className={row.key === "Status" ? "status" : undefined}>{row.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="legend-scale mono">
                <i aria-hidden="true" />
                Sheets 01 to 06 · {featured.length} plates
              </p>
            </aside>
          </div>
        </section>
        <Sections />
      </main>

      <footer className="footer">
        <div className="wrap footer-inner mono">
          <span>
            Compiled {survey.revised} · {person.location}
          </span>
          <span>Datum WGS 84 · Set in Archivo and IBM Plex Mono</span>
        </div>
      </footer>
      <SurveyController />
    </>
  );
}
