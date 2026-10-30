# Phase 1b: cinematic house and kitten guide

Status: **waiting for your approval.** Replaces the split-stage proposal in `phase-1-art-direction.md`. No site code yet.

## 1. What I saw in your references, and what I'll take from each

| Reference | What I see | What I'll use |
|---|---|---|
| **KAGE** (in the reel and the carousel) | Night scene, blood-red moon, a pagoda gate. The giant letters K A G E stand *inside* the scene: the hill and grass sit in front of the letters, the temple behind them. Small chapter label, four-word nav, an FPS counter. | **The giant word between depth layers.** In the hero, "bhavishya" stands between the house facade (behind) and the thinnai pillars and jasmine creeper (in front). The scene is the page, full screen. I'm leaving out the "CHAPTER 00 —" labels (an eyebrow label with an em dash, both on your avoid list) and the FPS counter. |
| **Curated.Media** hummingbird | A live 3D bird composited over an AI-generated meadow, overlapping the headline area, with motion smear on the wings. Whole page is purple. | **A live 3D creature on top of generated art**: exactly the kitten-over-house idea. Not the purple. |
| **Blender 4.2 splash** (painted fish) | Painterly underwater scene, light shafts from above, specks floating in the beams, strong foreground/background separation. | **Dust drifting in the courtyard's light shafts**, and the painterly finish (not glossy CGI) for the scene art. |
| **Forest gazebo** (vertical) | Painterly realism, warm haze, sun rays through trees, a clear near/mid/far depth stack, vertical framing. | **The morning haze for scene A**, and the proof that one picture can carry three parallax layers. Also my guide for the phone crops. |
| **Green-pillar corridor** | Faceted green pillars with yellow capitals and painted bases (pineapple and flower motifs), teak beams overhead, glossy Athangudi floor reflecting the pillars, a window with wooden bars. | **Scene C, the corridor**, almost directly: the repeating pillars become the "rooms" for projects, and the floor reflections are what make it feel expensive. |
| **Old hall with carved ceiling** | Stepped, carved teak ceiling brackets; turned teak pillars on blue bases; teal-painted granite pillars; a doorway that frames the next courtyard, then another doorway beyond (rooms seen through rooms). | **The door-through-door depth** for the move from scene A into B, and the carved teak ceiling as a foreground layer. |
| **Courtyard with lamps and swings** | Teak beams with brass rosettes, green glass bell lamps, two oonjal swings on chains, yellow-medallion Athangudi floor, blue tile dados, potted shrubs, courtyards in a line. | **Scene B, the noon courtyard.** The oonjal swing is where the kitten naps when you go idle. |
| **Lotus Palace facade at dusk** | Red, blue and yellow painted facade, arched windows with coloured-glass fanlights, uplit gate pillars, stucco figures on the parapet, clay tile roof. | **The house front in scene A** (colours, arches, fanlights) and **the uplighting in scene D**. Not the hotel's name board, and no deity figures, so the house reads as yours and not a real hotel. |
| **Knight kitten** (3 shots) | A fluffy cream kitten in steel plate armour and chain mail, a long sword held upright, a cream cape blowing in the wind, a pink bow, foggy meadow, leaves flying. | **The spirit only**: a small, very serious kitten holding a sword far too big for it. That contrast is the joke, and it's what makes it relatable. Your kitten will be **original** (see section 4). |
| **Meng To** (reel) | Cream paper, an ink-and-watercolour sketch inside an open book, quiet serif type. | **The look of the fast version's kitten:** a hand-drawn ink-and-wash kitten illustration for phones and reduced motion, so the fast version feels designed rather than stripped. |
| **"$5,000 designer" carousel** | Grid of AI-designed sites: a pear tree framing a headline, KAGE, a drink can on a sunset table, a dark data site. | **Foreground framing:** a jasmine creeper hanging into the top of the hero frame, like the pear branches. |

**Two cautions about the references:**
- The photographs and the kitten image belong to other people. Use them as **mood boards only**: describe what you like in words in your prompts, and don't upload them to an AI tool as the starting image for your final art. That way the final art is yours. I've added `docs/references/` to `.gitignore` so they never reach your public repo (one screenshot also shows a stranger's face).
- The kitten photo is a well-known viral image. Copying its look (steel armour, cream cape, pink bow) would make your mascot read as the meme. An original design that rhymes with it will read as yours.

## 2. How the site works

**One full-screen world, and the page scrolls through it.** Every scene has two parts:

1. **A move**: a numbered frame sequence (like Apple's product pages) drawn to a canvas as you scroll. The camera walks.
2. **A hold**: the camera stops, the content panel slides up, and the scene comes alive with parallax layers, particles and the kitten. You read here.

The last frame of each move and the hold's layers come from the **same picture**: you generate the end frame, then separate it into layers. That makes the handover invisible.

**Layer order, back to front:**
1. Scene canvas (frames during moves; background and midground layers during holds)
2. The giant name (hero only), between midground and foreground
3. Foreground layer (pillars, creeper, carved beams)
4. Particles (petals, dust, flames), a light 2D canvas
5. The kitten, in its own transparent 3D canvas
6. Content panels and the kitten's speech bubble (plain HTML, always on top, so text is never covered)
7. Top bar: your name, Experience, Projects, About, Contact, **Skip the tour**

**Panels:** solid lime-white paper panels with indigo text, square corners, no glass blur and no drop shadow. Solid is what makes contrast pass on *any* art you generate later. The kitten always stands on the side of the screen away from the panel.

**Type and palette:** as before: STIX Two Text, lime-white, indigo, ochre for the one main action, red oxide and teak. I'm adding **verdigris green `#3E6B5A`** from your corridor pillars, used only in the art direction and the kitten's cape border, never for text. In dark mode the panels turn night-teak with lime-white text. The scene art stays the same in both modes (dusk is already dark).

## 3. Storyboard

Scroll lengths are starting values; I'll tune them in the browser.

### First frame (before any art loads)
Plain HTML on a flat dawn-sky colour: the top bar with **Skip the tour**, and the hero panel with **Bhavishya Bondalapati**, "ML systems and backend engineer. MS Computer Science at Northeastern, GPA 3.9, graduating May 2027." and **See the work**. The first scene's opening image is preloaded at high priority and fades in behind them within about a second on a normal connection.

### A. Hero: the thinnai at morning (about 3 screens of scroll)
- **Visitor sees:** the house front in morning haze. Painted facade, arched windows, the raised thinnai with its pillars, the carved teak door closed. "bhavishya" stands huge in the middle of the scene: behind the thinnai pillars, in front of the facade. Jasmine petals drift from a creeper at the top edge. Moving the mouse shifts the three layers at different speeds.
- **Kitten:** sits on the thinnai step, tail twitching, head and eyes following your cursor. Click it and it swings the sword.
- **Speech:** "Hi. I'm the house cat. Scroll and I'll show you around."
- **Scroll:** first third is the hold. Then the move: the camera walks up the steps, the door swings open, and through it you glimpse the bright courtyard beyond (the door-through-door depth). The kitten hops up the steps and trots through the door ahead of you.
- **Easter egg:** a small brass lamp (kuthu vilakku) on the thinnai is a real button ("Brass lamp"). Press it three times: every lamp in the house lights early, the kitten raises its sword in salute, and the petals turn into a shower. Speech: "You found the lamp. Bhavishya owes you a coffee."

### B. Experience: the courtyard at noon (about 3 screens)
- **Move:** through the door into the open-to-sky courtyard. Sun straight overhead, light shafts with dust drifting in them.
- **Hold:** sky (back), far colonnade and swings (middle), near pillars and a carved beam (front).
- **Panel:** Experience. JC Biotech, then Mouri Tech: role, dates, one-line summary, bullets with your real numbers, stack.
- **Kitten:** walks to the patch of sunlight in the middle and sits.
- **Speech:** "Two internships. Six AI agents. Zero naps."

### C. Featured projects: the pillared corridor (about 6 screens, 4 stops)
- **Move:** the camera walks along the green-pillared corridor, its reflection sliding across the glossy tiles. It stops four times, once at each doorway between pillars: one project per doorway.
- **Hold at each stop:** a gentle mouse sway on the frame, plus one shared foreground pillar layer sliding past. (That means you don't need a full layer set per stop.)
- **Panel per project:** name, one line, problem, what I built, result, stack, links, and the project's own figure or video (Godavari NDVI map, robot-arm clip).
- **Kitten:** trots to each doorway as you scroll. Hover a project panel and it turns, ears up, and says that project's line:
  - Aerial Change Intelligence: "It checks every number the AI writes. I check every box that arrives."
  - LLM Gateway: "3,085 requests a second. I can manage about two."
  - Robot Arm Simulation: "46 of 50 pickups. I'm 0 for 50 against the laser dot."
  - Excel Copilot: "It has an undo button. I've asked for one for naps."

### D. Other work: the end of the corridor (about 1.5 screens)
- **Hold:** the corridor ends at an old teak accountant's desk. No new frames needed (it's the last frame of C).
- **Panel:** the ledger. Kambaz LMS (live link), Document Intelligence Chatbot, Calendar app ("code available on request"), then the compact list of the other repos.
- **Kitten:** jumps onto the desk and sits on the ledger.
- **Speech:** "The ledger. Smaller builds, same habit: test everything."

### E. About: the back of the house at dusk (about 3 screens)
- **Move:** through to the rear courtyard. The sky goes from gold to dusk, and the oil lamps light one by one along the wall (flames are code particles, so they flicker for real).
- **Panel:** About. A short first-person paragraph (I'll draft it from facts for you to rewrite), education, skills, certifications.
- **Kitten:** sits beside the first lamp, tail curled.
- **Speech:** "Golden hour. Good time for the backstory."

### F. Contact (about 1.5 screens)
- **Hold:** all lamps lit.
- **Panel:** "Write to me". Your email as the main button, a copy-email button, LinkedIn, GitHub. No phone, no form.
- **Kitten:** waves.
- **Speech:** "That's the tour. Bhavishya answers email faster than I answer to my name."

### Footer
Your full name across the bottom of the dusk scene, then image and model credits and one small line. The kitten curls up and falls asleep.

### Always on
- **Idle 20 seconds:** the kitten yawns, curls up and sleeps (a few "z" letters in the bubble, no emoji). Move the mouse and it stretches awake.
- **Speech bubbles** are decoration: hidden from screen readers so they don't chatter, never covering a panel, and every line lives in `src/content.ts` so you can rewrite them.

## 4. The kitten

### Character (original, needs your OK)
A small ginger-and-cream kitten standing upright, slightly round, big serious eyes. Instead of steel knight armour: a **brass breastplate** (the same brass as the house's lamps), and a **lime-white cape with a red oxide and ochre border**, like a silk border. A short curved sword. No bow. Same joke as the meme (tiny, solemn, over-armed), but clearly a Chettinad house cat.

### Placeholder (what I build now)
A kitten made from simple shapes in code: rounded body, head, ears, tail, cape and sword. Because I build it myself, there's **no licence question at all**. It gets every behaviour: cursor-following head and eyes, hop, walk, sword swing, sit, sleep, wave, react. When your model arrives, it slots in behind the same controller, so the behaviours don't change.

### What to give me later
One **GLB file** (`public/kitten/kitten.glb`):

| Item | Spec |
|---|---|
| Rig | Humanoid-style skeleton (it stands upright) plus 2 or 3 tail bones. Bones named `Head`, `Neck`, `Hand_R`; eyes as separate meshes `Eye_L` and `Eye_R`, or eye bones, so I can aim them at the cursor in code |
| Animations, clips named exactly | `idle`, `walk`, `hop`, `sword_swing`, `sit`, `sleep` (a loop), `wake`, `wave`, `react` |
| Size | Under 15,000 triangles, 1 material, textures 1024px or smaller, under 2 MB after compression |
| Orientation | Origin at the feet, facing +Z, about 0.35 units tall |
| Sword | A separate mesh parented to `Hand_R` |

### Where to get or make it (licences checked 30 Oct 2026)
1. **Design it in 2D first:** generate a character turnaround sheet (front, side, back, three-quarter) with your image tool. I'll put the prompt in the asset guide.
2. **Image to 3D:**
   - **Meshy** ([licensing FAQ](https://help.meshy.ai/en/articles/9992001-can-i-use-my-generated-assets-for-commercial-projects)): a paid plan means you own the output outright. The free plan gives you a CC BY 4.0 licence, which is fine for a portfolio as long as the footer says "Model created with Meshy, CC BY 4.0". It also has auto-rigging.
   - **Tripo:** sources disagree on whether free-plan output can be used commercially, and I couldn't open their terms page (it blocked automated access). I'd only use it on a paid plan.
   - **Microsoft TRELLIS:** MIT licence per its [model card](https://huggingface.co/JeffreyXiang/TRELLIS-image-large/blob/main/README.md), but it needs a 24 GB NVIDIA GPU, so not on your Mac; only through a hosted demo.
3. **Rig and animate:**
   - **Blender with Rigify** (free, no licence strings). Best control, and the only route that gives a proper tail. My recommendation.
   - **Mixamo**: free with an Adobe ID, and royalty-free for commercial work ([Adobe FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html)). But its auto-rigger only handles human-shaped characters, and its terms forbid redistributing the raw files. A GLB on a website can be downloaded by anyone, so this is a grey area. Fine for testing; for the final version, use Blender.
4. **Ready-made models:** I didn't find a free rigged cat with a clean licence. Quaternius's packs now use the [Quaternius Asset License](https://quaternius.com/license.html), which is worded around games and bans redistributing the files; an older Quaternius pack on OpenGameArt with a cat is listed as CC0, but I couldn't open the page to verify it. Either way, a stock cat wouldn't be *your* character, so I'd skip this route.

## 5. Fast version (Skip the tour, phones, reduced motion)

Same sections, same panels, same text, normal page flow:
- One still per scene: the hold image, flattened (about 1600px wide on desktop, 800px on phones, AVIF/WebP, phone stills under 80 KB).
- The kitten as the ink-and-wash illustration (a small image per section, in a few poses). On phones without reduced motion, a gentle two-frame tail flick in CSS. No WebGL.
- Speech lines shown as small captions beside the kitten.
- No frame sequences, no particles.

**When the full tour runs:** screen 1024px or wider, a mouse or trackpad, no reduced-motion setting, no Data Saver, WebGL available, and the visitor hasn't pressed Skip. Everyone else, tablets included, gets the fast version. "Skip the tour" is remembered for the next visit.

## 6. Performance

- **First paint is HTML.** The first image of scene A is the largest image on screen, preloaded at high priority.
- **Frames stream in order of need:** scene A first, and within a scene every fourth frame first, then the gaps, so scrubbing works early and gets smoother. The next scene loads while you read the current hold.
- **Memory:** a decoded 1920×1080 frame takes about 8 MB of memory, so 360 decoded frames would be close to 3 GB. So frames are kept compressed, and only the frames near your scroll position are decoded (about 30 at a time, released as you move on). Moving frames are 1280px wide, because motion hides softness; holds use sharp 2560px layers.
- **Download, honestly:** the full desktop tour is roughly 15 to 20 MB of images over the whole scroll, streamed in the background. The fast version is about 1 MB. Lighthouse tests the phone version, so 85+ is realistic.
- **Kitten:** loaded only after scene A's first image shows and the browser is idle. Pixel ratio capped at 1.5, and it stops rendering when the tab is hidden or the kitten is asleep.
- **Frame tool:** AI video tools give you MP4s, so I'll add a script that slices a video into numbered frames at the right size. It needs ffmpeg (`brew install ffmpeg`), which isn't installed yet.

## 7. Asset folders and config

```
public/scenes/<scene>/frames/0001.webp ... (move, 1280×720)
public/scenes/<scene>/layers/bg.webp, mid.webp, fg.webp (hold, 2560×1440, transparent)
public/scenes/<scene>/still.webp, still-mobile.webp (fast version)
public/kitten/kitten.glb, public/kitten/fast/<pose>.webp
```

`src/content.ts` gets a `scenes` list: per scene the frame count, file pattern, layers with their depth, particle type, kitten anchor positions, speech lines and alt text. You drop files in and change a count; no component code.

`docs/ASSET-GUIDE.md` (written right after you approve this) covers every file: sizes, frame counts, aspect ratios (16:9 for desktop frames and layers, 4:5 for phone stills), which objects go on which layer, each camera move in words, and example prompts with one shared style block so all four scenes match. Starting frame budget: A 72, B 72, C 120 (four stops), E 96.

## 8. Hero vertical slice (step 2, after approval)

Next.js static export, TypeScript, React Three Fiber with drei, Motion; exact versions pinned. I'll render placeholder art myself (a flat drawn facade and a door that opens over 72 frames, plus three layers), clearly marked as placeholder. Then the scrub engine, the parallax, the petals, the giant name between layers, the shape-built kitten with cursor tracking and sword swing, the hero panel, and Skip the tour. Screenshots with Playwright at 1440, 768 and 375, plus the fast version, then a commit, then I stop for your review.

## 9. Design-skill notes

Where the KAGE style clashes with the installed design skills, I've kept the skills' rule wherever it doesn't weaken your brief: no "CHAPTER 00" labels or index numbers, no tiny letter-spaced capitals, no glass panels, no gradients in the interface. The atmosphere comes from the art itself, as in KAGE.
