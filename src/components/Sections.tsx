// The plain site's sheets, in order. Everything shown comes from src/content.ts.
import {
  certifications,
  contact,
  coursework,
  earlierWork,
  education,
  experience,
  featured,
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
import { FlyButton } from "./Survey";

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

function Plate({ p, n }: { p: FeaturedProject; n: number }) {
  const titleId = `plate-${p.slug}`;
  return (
    <article className="plate" aria-labelledby={titleId}>
      <div className="plate-top mono">
        <span>Plate 2.{n}</span>
        <span>{p.field}</span>
      </div>
      <div className="plate-figure">
        <h3 id={titleId}>{p.name}</h3>
        <p>
          <strong>{p.figure.value}</strong>
          <span>{p.figure.label}</span>
        </p>
      </div>
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
        <p className="plate-line">{p.oneLine}</p>
        {p.result.length > 1 && (
          <ul>
            {p.result.slice(1).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        <details>
          <summary>
            Problem and what I built<span className="sr-only">: {p.name}</span>
          </summary>
          <p>{p.problem}</p>
          <ul>
            {p.built.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </details>
      </div>
      <div className="plate-foot">
        <span className="mono stack">{p.stack.join(" · ")}</span>
        <span className="plate-links">
          {p.links.map((l) => (
            <a key={l.href} href={l.href} {...ext}>
              {l.label}
            </a>
          ))}
        </span>
      </div>
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
                  {job.points.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
                <p className="mono stack chips">{job.stack.join(" · ")}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="projects" className="sheet" aria-labelledby="projects-title">
        <div className="wrap">
          <SheetHead n="02" label="Survey plates" title="Projects" id="projects-title" note={`${featured.length} plates · measured results first`} />
          <div className="plates">
            {featured.map((p, i) => (
              <Plate key={p.slug} p={p} n={i + 1} />
            ))}
          </div>
          <aside className="invite fly-only" aria-labelledby="invite-title">
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
            <FlyButton />
          </aside>
        </div>
      </section>

      <section id="coursework" className="sheet" aria-labelledby="coursework-title">
        <div className="wrap">
          <SheetHead n="03" label="Course projects" title="Coursework" id="coursework-title" note="Northeastern University" />
          <div className="small-plates">
            {coursework.map((s, i) => (
              <SmallPlate key={s.slug} s={s} n={`Plate 3.${i + 1}`} />
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
            note={`${earlier.length + otherWork.length} entries`}
          />
          <div className="small-plates">
            {earlier.map((s, i) => (
              <SmallPlate key={s.slug} s={s} n={`Plate 4.${i + 1}`} />
            ))}
          </div>
          <div className="gazetteer" role="region" aria-labelledby="gazetteer-caption" tabIndex={0}>
            <table>
              <caption id="gazetteer-caption" className="mono">
                Index of smaller builds
              </caption>
              <thead>
                <tr className="mono">
                  <th scope="col">No.</th>
                  <th scope="col">Name</th>
                  <th scope="col">What it does</th>
                  <th scope="col">Stack</th>
                </tr>
              </thead>
              <tbody>
                {otherWork.map((o, i) => (
                  <tr key={o.name}>
                    <td className="mono">G-{String(i + 1).padStart(2, "0")}</td>
                    <th scope="row">
                      <a href={o.href} {...ext}>
                        {o.name}
                      </a>
                    </th>
                    <td>{o.oneLine}</td>
                    <td className="mono stack">{o.stack.join(" · ")}</td>
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
