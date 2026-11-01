// Decides, before the first paint, the theme, whether the 3D flyover is offered, and which mode to open.
// The plain site is the default for everyone. The flyover is only offered on devices that can run it,
// and only opens by itself if the visitor chose it last time. The same function is inlined into <head>.

export type FlyInput = {
  width: number;
  finePointer: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  cores: number;
  /** What the visitor chose last time: "fun", "plain", or nothing yet. */
  preference: string | null;
};

export type FlyDecision = { offer: boolean; mode: "plain" | "fun" };

export function decideFlyover(i: FlyInput): FlyDecision {
  var offer = i.width >= 1024 && i.finePointer && !i.reducedMotion && !i.saveData && i.cores >= 4;
  return { offer: offer, mode: offer && i.preference === "fun" ? "fun" : "plain" };
}

export const MODE_KEY = "survey-mode";
export const THEME_KEY = "survey-theme";

export const SURVEY_SCRIPT =
  "(function(){var d=document.documentElement;try{" +
  "var q=location.search,pref=null,theme=null;try{pref=localStorage.getItem('" + MODE_KEY + "');theme=localStorage.getItem('" + THEME_KEY + "')}catch(e){}" +
  "var t=/[?&]theme=(light|dark)/.exec(q);if(t)theme=t[1];" +
  "d.dataset.theme=theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');" +
  "var c=navigator.connection;" +
  "var r=(" + decideFlyover.toString() + ")({width:innerWidth,finePointer:matchMedia('(hover: hover) and (pointer: fine)').matches," +
  "reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,saveData:!!(c&&c.saveData)," +
  "cores:navigator.hardwareConcurrency||0,preference:pref});" +
  "d.dataset.fly=r.offer?'yes':'no';d.dataset.mode=r.mode;" +
  "}catch(e){d.dataset.fly='no';d.dataset.mode='plain'}})();";
