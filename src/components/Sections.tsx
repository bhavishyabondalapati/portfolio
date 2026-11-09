// The plain site's sheets, in order. Everything shown comes from src/content.ts.
import {
  certifications,
  contact,
  coursework,
  earlierWork,
  education,
  experience,
  featured,
  inProgress,
  otherWork,
  person,
  skills,
  srmProject,
  survey,
  type FeaturedProject,
  type SecondaryProject,
} from "@/content";
import { formatCoords } from "@/lib/geo";
import { PlateChart } from "./PlateChart";
import { SketchbookButton, WalkButton } from "./Survey";

const ext = { rel: "noopener noreferrer", target: "_blank" } as const;

/** A section heading set like a map sheet: the plain title, with the sheet number in the margin. */
function SheetHead({ n, label, title, note, id }: { n: string; label: string; title: string; note: string; id: string }) {
  return (
    <header className="sheet-head">
      <h2 id={id} className="sheet-title">
        {title}
      </h2>
      <p className="mono sheet-note">
        <b>Sheet {n} / 06</b>
        <span>{label}</span>
        <span>{note}</span>
      </p>
    </header>
  );
}

/**
 * The details behind a headline, expanded in place. A native <details>: keyboard and screen
 * readers get the expanded/collapsed state for free, and closed content (images too) never loads.
 */
function ReadMore({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <details className="more">
      <summary>
        <span className="more-closed">Read more</span>
        <span className="more-open">Show less</span>
        <span className="sr-only"> about {name}</span>
      </summary>
      <div className="more-body">{children}</div>
    </details>
  );
}

function Plate({ p, n }: { p: FeaturedProject; n: number }) {
  const titleId = `plate-${p.slug}`;
  return (
    <article className="plate" aria-labelledby={titleId}>
      <div className="plate-top mono">
        <span>Project 2.{n}</span>
        <span>{p.field}</span>
      </div>
      <div className="plate-figure">
        <h3 id={titleId}>{p.name}</h3>
        <p className="plate-line">{p.oneLine}</p>
        <p>
          <strong>{p.figure.value}</strong>
          <span>{p.figure.label}</span>
        </p>
      </div>
      <p className="plate-stack mono stack">{p.stack.join(" · ")}</p>
      <ReadMore name={p.name}>
        {p.media.length > 0 && (
          <div className={`plate-media count-${p.media.length}`}>
            {p.media.map((m) => (
              <figure key={m.src}>
                <img src={m.src} alt={m.alt} loading="lazy" decoding="async" />
                {m.caption && <figcaption className="mono">{m.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
        {p.slug === "aerial-change-intelligence" && (
          <p className="ndvi-key mono" aria-hidden="true">
            <span>NDVI 0</span>
            <i />
            <span>0.9</span>
          </p>
        )}
        {p.chart && <PlateChart chart={p.chart} />}
        <div className="plate-body">
          {p.result.length > 1 && (
            <>
              <h4 className="mono">Results</h4>
              <ul>
                {p.result.slice(1).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          )}
          <h4 className="mono">The problem</h4>
          <p>{p.problem}</p>
          <h4 className="mono">What I built</h4>
          <ul>
            {p.built.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <p className="plate-links">
            {p.links.map((l) => (
              <a key={l.href} href={l.href} {...ext}>
                {l.label}
              </a>
            ))}
          </p>
        </div>
      </ReadMore>
    </article>
  );
}

function SmallPlate({ s, n }: { s: SecondaryProject; n: string }) {
  return (
    <article className="small-plate" aria-labelledby={`sp-${s.slug}`}>
      <div className="plate-top mono">
        <span>{n}</span>
        {s.course && <span>{s.course}</span>}
      </div>
      <div className="plate-body">
        <h3 id={`sp-${s.slug}`}>{s.name}</h3>
        <p>{s.oneLine}</p>
        <p className="small-highlight">{s.highlight}</p>
        {s.note && <p className="note">{s.note}</p>}
      </div>
      <div className="plate-foot">
        <span className="mono stack">{s.stack.join(" · ")}</span>
        {s.links.length > 0 && (
          <span className="plate-links">
            {s.links.map((l) => (
              <a key={l.href} href={l.href} {...ext}>
                {l.label}
              </a>
            ))}
          </span>
        )}
      </div>
    </article>
  );
}

export function Sections() {
  const earlier = [...(srmProject ? [srmProject] : []), ...earlierWork];
  // one line per project: earlier work first, then the smaller builds
  const gazetteer = [
    ...earlier.map((e) => ({ name: e.name, oneLine: e.oneLine, href: e.links[0]?.href })),
    ...otherWork.map((o) => ({ name: o.name, oneLine: o.oneLine, href: o.href })),
  ];
  return (
    <>
      <section id="experience" className="sheet" aria-labelledby="experience-title">
        <div className="wrap">
          <SheetHead n="01" label="Experience" title="Experience" id="experience-title" note={`${experience.length} internships · India`} />
          {experience.map((job) => (
            <article key={job.company} className="job" aria-labelledby={`job-${job.company}`}>
              <div className="job-meta mono">
                <p>{job.dates}</p>
                <p>{job.place}</p>
                <p>{formatCoords(job.coords)}</p>
              </div>
              <div>
                <h3 id={`job-${job.company}`}>{job.company}</h3>
                <p className="job-role">{job.role}</p>
                <p className="job-summary">{job.summary}</p>
                <ul>
                  {job.points.slice(0, 2).map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
                <ReadMore name={job.company}>
                  {job.points.length > 2 && (
                    <ul>
                      {job.points.slice(2).map((pt) => (
                        <li key={pt}>{pt}</li>
                      ))}
                    </ul>
                  )}
                  <p className="mono stack chips">{job.stack.join(" · ")}</p>
                </ReadMore>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="projects" className="sheet" aria-labelledby="projects-title">
        <div className="wrap">
          <SheetHead n="02" label="Featured projects" title="Projects" id="projects-title" note={`${featured.length} projects · measured results first`} />
          <div className="plates">
            {featured.map((p, i) => (
              <Plate key={p.slug} p={p} n={i + 1} />
            ))}
          </div>
          {inProgress.length > 0 && (
            <div className="in-progress">
              <h3 className="mono">In progress</h3>
              <ul>
                {inProgress.map((w) => (
                  <li key={w.name}>
                    <a href={w.href} {...ext}>
                      {w.name}
                    </a>{" "}
                    <span>{w.oneLine}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <aside className="invite" aria-labelledby="invite-title">
            <svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 46c10-6 16-2 24-8s14-14 32-10" />
              <path d="M4 55c10-5 18-1 26-6s14-10 30-8" opacity=".45" />
              <path d="M4 35c8-6 14-4 20-10s12-12 36-12" opacity=".45" />
              <circle cx="29" cy="37" r="4" className="invite-pin" />
            </svg>
            <div>
              <h3 id="invite-title">{survey.invite.title}</h3>
              <p>{survey.invite.text}</p>
            </div>
            <div className="invite-actions">
              <WalkButton />
              <SketchbookButton />
            </div>
          </aside>
        </div>
      </section>

      <section id="coursework" className="sheet" aria-labelledby="coursework-title">
        <div className="wrap">
          <SheetHead n="03" label="Course projects" title="Coursework" id="coursework-title" note="Northeastern University" />
          <div className="small-plates">
            {coursework.map((s, i) => (
              <SmallPlate key={s.slug} s={s} n={`Project 3.${i + 1}`} />
            ))}
          </div>
        </div>
      </section>

      <section id="earlier-work" className="sheet" aria-labelledby="earlier-title">
        <div className="wrap">
          <SheetHead
            n="04"
            label="Gazetteer"
            title="Earlier work"
            id="earlier-title"
            note={`${gazetteer.length} entries · one line each`}
          />
          <div className="gazetteer" role="region" aria-labelledby="gazetteer-caption" tabIndex={0}>
            <table>
              <caption id="gazetteer-caption" className="mono">
                Index of earlier and smaller builds
              </caption>
              <thead>
                <tr className="mono">
                  <th scope="col">No.</th>
                  <th scope="col">Name</th>
                  <th scope="col">What it does</th>
                </tr>
              </thead>
              <tbody>
                {gazetteer.map((o, i) => (
                  <tr key={o.name}>
                    <td className="mono">G-{String(i + 1).padStart(2, "0")}</td>
                    <th scope="row">{o.href ? <a href={o.href} {...ext}>{o.name}</a> : o.name}</th>
                    <td>{o.oneLine}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="about" className="sheet" aria-labelledby="about-title">
        <div className="wrap">
          <SheetHead n="05" label="Surveyor" title="About" id="about-title" note={person.location} />
          <div className="about">
            <div className="about-letter">
              <p className="about-lead">{person.intro}</p>
              <p>{person.lookingFor}</p>
            </div>
            <div className="about-facts">
              <h3 className="mono">Education</h3>
              <ul className="edu">
                {education.map((e) => (
                  <li key={e.school}>
                    <strong>{e.school}</strong>
                    <span>{e.degree}</span>
                    <span className="mono">
                      GPA {e.gpa} · {e.dates} · {formatCoords(e.coords, 2)}
                    </span>
                  </li>
                ))}
              </ul>
              <h3 className="mono">Skills</h3>
              <dl className="skills">
                {skills.map((g) => (
                  <div key={g.group}>
                    <dt>{g.group}</dt>
                    <dd>{g.items.join(", ")}</dd>
                  </div>
                ))}
              </dl>
              <h3 className="mono">Certifications</h3>
              <p>{certifications.join(", ")}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="sheet sheet-contact" aria-labelledby="contact-title">
        <div className="wrap">
          <SheetHead n="06" label="Correspondence" title="Contact" id="contact-title" note="Email first" />
          <div className="contact">
            <p className="contact-line">{person.contactLine}</p>
            <a className="contact-email" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
            <p className="contact-links">
              {contact.links.map((l) => (
                <a key={l.href} href={l.href} {...ext}>
                  {l.label}
                </a>
              ))}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
