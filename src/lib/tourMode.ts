// Decides, before the first paint, whether a visitor gets the 3D tour or the fast page.
// The same function is inlined into <head> as a tiny script, so there is no flash or layout jump.

export type ModeInput = {
  width: number;
  finePointer: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  /** "off" when the visitor pressed Skip the tour, "on" when forced on with ?tour=on. */
  preference: "on" | "off" | null;
};

export type Mode = { mode: "tour" | "fast"; eligible: boolean };

export function decideMode(i: ModeInput): Mode {
  var eligible = i.preference === "on" || (i.width >= 1024 && i.finePointer && !i.reducedMotion && !i.saveData);
  return { mode: eligible && i.preference !== "off" ? "tour" : "fast", eligible: eligible };
}

export const MODE_SCRIPT =
  "(function(){var d=document.documentElement;try{" +
  "var q=location.search,pref=null;try{pref=localStorage.getItem('tour')}catch(e){}" +
  "if(/[?&]tour=off/.test(q))pref='off';if(/[?&]tour=on/.test(q))pref='on';" +
  "var c=navigator.connection;" +
  "var r=(" +
  decideMode.toString() +
  ")({width:window.innerWidth,finePointer:matchMedia('(hover: hover) and (pointer: fine)').matches," +
  "reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,saveData:!!(c&&c.saveData),preference:pref});" +
  "d.dataset.mode=r.mode;d.dataset.eligible=String(r.eligible);if(/[?&]capture=1/.test(q))d.dataset.capture='1';" +
  "}catch(e){d.dataset.mode='fast';d.dataset.eligible='false'}})();";
