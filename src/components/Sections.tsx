// The content sections. For now they sit on the plain page under the hero; later each one
// gets its own scene in the house. Everything here comes from src/content.ts.
import { certifications, contact, education, experience, featured, otherWork, person, secondary, skills } from "@/content";

export function Sections() {
  return (
    <div className="sections">
      <section id="experience" className="section" aria-labelledby="experience-title">
        <h2 id="experience-title">Experience</h2>
        <div className="jobs">
          {experience.map((job) => (
            <article key={job.company} className="job">
              <h3>{job.company}</h3>
              <p className="meta">
                {job.role}, {job.place}. {job.dates}
              </p>
              <p className="lead">{job.summary}</p>
              <ul>
                {job.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
              <p className="stack">{job.stack.join(", ")}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="projects" className="section" aria-labelledby="projects-title">
        <h2 id="projects-title">Selected projects</h2>
        {featured.map((p) => (
          <article key={p.slug} className="project">
            <div className="project-text">
              <h3>{p.name}</h3>
              <p className="lead">{p.oneLine}</p>
              <h4>The problem</h4>
              <p>{p.problem}</p>
              <h4>What I built</h4>
              <ul>
                {p.built.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <h4>Result</h4>
              <ul>
                {p.result.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="stack">{p.stack.join(", ")}</p>
              <p className="links">
                {p.links.map((l) => (
                  <a key={l.href} href={l.href} rel="noopener noreferrer" target="_blank">
                    {l.label}
                  </a>
                ))}
              </p>
            </div>
            {p.media.length > 0 && (
              <figure className="project-media">
                {p.media.map((m) =>
                  m.kind === "video" ? (
                    <video key={m.src} src={m.src} poster={m.poster} controls muted loop playsInline preload="none" aria-label={m.alt} />
                  ) : (
                    <img key={m.src} src={m.src} alt={m.alt} loading="lazy" />
                  )
                )}
              </figure>
            )}
          </article>
        ))}
      </section>

      <section id="other-work" className="section ledger" aria-labelledby="other-title">
        <div className="ledger-sheet">
          <h2 id="other-title">Other work</h2>
          {secondary.map((s) => (
            <article key={s.slug} className="ledger-row ledger-row-major">
              <div>
                <h3>{s.name}</h3>
                <p>{s.oneLine}</p>
                <p className="stack">{s.stack.join(", ")}</p>
              </div>
              <div className="ledger-right">
                <p>{s.highlight}</p>
                <p className="links">
                  {s.links.map((l) => (
                    <a key={l.href} href={l.href} rel="noopener noreferrer" target="_blank">
                      {l.label}
                    </a>
                  ))}
                  {s.note && <span>{s.note}</span>}
                </p>
              </div>
            </article>
          ))}
          <ul className="ledger-list">
            {otherWork.map((w) => (
              <li key={w.name} className="ledger-row">
                <a href={w.href} rel="noopener noreferrer" target="_blank">
                  {w.name}
                </a>
                <span>{w.oneLine}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="about" className="section" aria-labelledby="about-title">
        <h2 id="about-title">About</h2>
        <div className="about">
          <div>
            <p className="lead">{person.intro}</p>
            <p>{person.lookingFor}</p>
            <h3>Education</h3>
            <ul>
              {education.map((e) => (
                <li key={e.school}>
                  {e.degree}, {e.school}. GPA {e.gpa}. {e.dates}.
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Skills</h3>
            {skills.map((g) => (
              <p key={g.group}>
                <strong>{g.group}:</strong> {g.items.join(", ")}
              </p>
            ))}
            <h3>Certifications</h3>
            <p>{certifications.join(", ")}</p>
          </div>
        </div>
      </section>

      <section id="contact" className="section contact" aria-labelledby="contact-title">
        <h2 id="contact-title">Write to me</h2>
        <p className="lead">{person.lookingFor}</p>
        <p>
          <a className="button" href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
        </p>
        <p className="links">
          {contact.links.map((l) => (
            <a key={l.href} href={l.href} rel="noopener noreferrer" target="_blank">
              {l.label}
            </a>
          ))}
        </p>
      </section>
    </div>
  );
}
