import { HouseTour } from "@/components/HouseTour";
import { Sections } from "@/components/Sections";
import { SkipTourButton } from "@/components/SkipTourButton";
import { contact, person, tour } from "@/content";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#experience">
        Skip to content
      </a>
      <header className="topbar">
        <a className="wordmark" href="#top">
          {person.name}
        </a>
        <nav aria-label="Sections">
          <a href="#experience">Experience</a>
          <a href="#projects">Projects</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
        <SkipTourButton />
        <span className="tour-progress" aria-hidden="true" />
      </header>

      <main>
        <section id="top" className="hero" aria-labelledby="hero-title">
          <div className="hero-sticky">
            <picture className="hero-still">
              <source media="(max-width: 1023px) and (prefers-color-scheme: dark)" srcSet="/stills/hero-dusk-mobile.webp" />
              <source media="(prefers-color-scheme: dark)" srcSet="/stills/hero-dusk.webp" />
              <source media="(max-width: 1023px)" srcSet="/stills/hero-mobile.webp" />
              <img src="/stills/hero.webp" alt={tour.sceneAlt.hero} width={1600} height={1000} fetchPriority="high" />
            </picture>
            <div className="hero-panel">
              <h1 id="hero-title">{person.name}</h1>
              <p className="hero-role">{person.role}</p>
              <p>{person.heroLine}</p>
              <div className="hero-actions">
                <a className="button" href={person.heroAction.href}>
                  {person.heroAction.label}
                </a>
                <SkipTourButton />
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
          </div>
        </section>
        <HouseTour />
        <Sections />
      </main>

      <footer className="footer">
        <p className="footer-name">{person.name}</p>
        <p>Built with Next.js and Three.js. The house is generated in code; scene techniques adapted from ThreeUI Community (MIT).</p>
      </footer>
    </>
  );
}
