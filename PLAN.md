# Nightfall Arena — Development Plan

Living roadmap for turning the prototype into a real, shippable game.
Tick items off as they land.

---

## Where we are today

Working and deployed at **https://game3d-eight.vercel.app**
(repo: https://github.com/visheshpandey/NIGHTFALL-ARENA)

- [x] 3D fighting game in three.js — solo campaign vs 5 AI opponents
- [x] Online multiplayer (peer-to-peer, room codes, no server needed)
- [x] Works on PC (keyboard) and mobile (on-screen buttons)
- [x] Shadow Fight-style black silhouette art with horizon glow
- [x] Combo system with on-screen counter
- [x] Two-segment limbs (elbows + knees) for punch/kick/jump
- [x] Upgrades (power / vitality) + coins + campaign progression
- [x] Installable PWA — works fully offline, landscape fullscreen

**What still makes it a prototype:** the fighters are boxes and spheres,
animated by rotating joints in code. That's the gap to close first.

---

## The Unity question — settled

Two things were verified, not assumed:

1. **You do NOT need Unity for the Play Store.** A PWA wrapped as a TWA
   produces a real `.aab` and a real store listing. That groundwork is done.
2. **Web CAN do realistic human animation.** Checked directly inside
   `vendor/three.core.js` — it already contains `AnimationMixer`,
   `SkinnedMesh`, `Skeleton`, `Bone`, `AnimationAction`, `AnimationClip`,
   `KeyframeTrack`.

Animation quality comes from the **motion-capture data + rigged model**, not
the engine. Mixamo gives free mocap of real human fighters — the same kind of
source data Shadow Fight used. Three.js plays that identical data.

**Decision rule:** Milestone 0 below is a one-day throwaway test so you can
*look at it on your phone* and decide with evidence instead of taking my word.

---

## Milestone 0 — The decision spike ✅ DONE — VERDICT: GO

Live at **https://game3d-eight.vercel.app/spike.html**

- [x] Used three.js sample rigged characters (Soldier, Xbot) — free, zero setup,
      skipped the Mixamo/Blender step for the spike itself (still needed for
      real fight clips in M4)
- [x] Vendored `GLTFLoader` + `SkeletonUtils` + `BufferGeometryUtils`
- [x] Built **`spike.html`** — throwaway, separate from the game
- [x] Two character instances, flat-black silhouette + colored accent bands
      (headband/wrist/ankle, bone-attached — same visual language as the
      game's existing trim boxes)
- [x] Reused the game's exact fog/light/camera values
- [x] Deployed, tested on the real target phone

**Result: 58 FPS minimum on-device**, with two skinned mocap characters,
shadows, and accents. Reads as real fighters, not a demo.

**Verdict: GO. Web is the answer — no Unity switch.**

Two real bugs found and fixed while building this (kept here since M2–M4 will
hit the same traps):
1. Measuring a model's height for auto-scaling must call
   `model.updateMatrixWorld(true)` first, or `Box3.setFromObject` uses a
   stale identity matrix and returns a garbage size.
2. A plain mesh attached to a bone renders **microscopic** unless you counter-
   scale it — glTF hierarchies often bake a large internal scale (e.g. 0.01)
   into an ancestor node, which silently shrinks anything parented to a bone.
   Fix: decompose the bone's `matrixWorld` for its world scale, then set
   `child.scale.setScalar(1 / worldScale)` before sizing/positioning it.

Also fixed along the way (applies to the real game too, not just the spike):
**landscape lock.** `manifest.json`'s `orientation: landscape` only works for
an *installed* PWA — opening the link directly in a browser tab ignored it.
Added a portrait-mode "Rotate your phone" overlay with a "Enable landscape"
button (Fullscreen + Screen Orientation API) to both `spike.html` and
`index.html`.

**Bonus, done in parallel while M0 was in progress:** full audio pass —
layered hit/block/whoosh/jump/land/KO sounds, a combo-escalation tick, UI
clicks, and a low ambient arena drone, all synthesized (no asset files), plus
a mute toggle that persists to the save. Replaces the single old beep.
Live in `index.html` now.

---

## Milestone 1 — Loader + boot

- [x] Vendor `GLTFLoader`, `SkeletonUtils`, `BufferGeometryUtils` into
      `vendor/jsm/` (done in M0, already proven working)
- [ ] Add async load gate + loading screen to `index.html`
      (the game currently boots synchronously inside one `try{}` at L346;
      loading a model is async, so without a gate it starts with no fighters)

## Milestone 2 — Animation state machine

- [ ] Replace `animateFighter()` (L1180–1250) with an `AnimationMixer` system
- [ ] Clip selector, a pure function of state already on the fighter:
      `hp<=0 → ko | stun>0 → hit_react | attack → punch/kick | y>0 → jump |
       blocking → block | move*facing>0 → walk_f | move → walk_b | → idle`
- [ ] Crossfade 0.12s, but 0.05s into punch/kick/hit_react so it stays snappy

> Every field the selector reads is **already** in `snapshotFighter()`
> (L782–790), so multiplayer keeps working with no change to the wire format.

## Milestone 3 — Combat timing (decides whether it still feels good)

Mocap clips are ~1.1s; our punch is 0.34s. **Keep `attack.time` authoritative
and make the clip follow it** — never let a clip decide when a hit lands.
Anchor the clip's contact frame to `spec.impact`:

```js
u = attack.time < spec.impact
  ? (attack.time / spec.impact) * CONTACT
  : CONTACT + ((attack.time - spec.impact) / (spec.duration - spec.impact))
              * (clipLen - CONTACT);
action.time = u;   // action.paused = true
```

- [ ] Implement the remap (hit detection stays byte-identical to today)
- [ ] Trim each attack clip in Blender to windup→contact→recovery
      (Mixamo pads clips with idle lead-in; untrimmed = twitchy at 3x speed)
- [ ] Only if it still feels twitchy, nudge specs to
      `punch{duration:0.42, impact:0.17}` / `kick{duration:0.62, impact:0.29}`

## Milestone 4 — Retune for a human body

Human proportions differ from the box figure. Retune:

- [ ] `attacks.reach` (1.42 / 1.95) — measure real hand position at the
      contact frame in Blender, don't guess
- [ ] `separateFighters` gap 0.85 and its `>1.2` y-check
- [ ] Move speed 3.5 / 1.3, gravity 17, jump `vy`, arena clamp ±8
- [ ] Camera `y 3.8`, `lookAt(_,1.4,_)`, the `0.72` framing divisor
- [ ] `sparks(..., y+1.5)`, knockback 0.36 / 0.12, shadow camera bounds

## Milestone 5 — Full clip set + mobile performance

- [ ] All 9 clips: idle, walk_f, walk_b, punch, kick, block, hit_react, jump, ko
- [ ] Add the `.glb` to `sw.js` precache so offline still works
- [ ] Perf pass — if FPS dips on mobile, swap skinned shadows for a blob
      shadow (the single biggest win)

### Art style — keep our identity
Override every loaded `SkinnedMesh` material with
`MeshBasicMaterial({color:0x030405})` (skinning works fine with it). Two black
humans look identical, so replace the colored trim boxes with a **rim shell**:
a cloned SkinnedMesh bound to the *same* skeleton, `BackSide`, slightly
inflated, in the player's color. It deforms with the animation.

### Asset pipeline (all free)
Mixamo → FBX Binary 30fps, *Without Skin* per clip + one *With Skin* T-pose →
import all onto one character in Blender → name each Action → export **glTF
Binary (.glb)** with *Materials: No export* (kills textures, most of the size)
→ optional `npx @gltf-transform/cli prune resample draco`.
Target **one ~1.5MB `.glb`**, loaded once, instanced twice.
Mixamo's license allows royalty-free commercial use including Play Store; you
may not redistribute the raw assets. Re-check terms before charging money.

---

## After animation — the rest of the list

**Character building** — needs M1–M5 first. Cheapest real version: pick body +
color + starting stat build.

**Story & fighting styles** — the roster (`ASH, VIPER, IRON MONK, WRAITH,
THE REGENT`, L354) is currently just *names* with no per-opponent stats. AI
difficulty is a single `aiLevel` number inlined at L1158–1165. Moving that to a
per-opponent table (aggressive / defensive / ranged) makes fights feel authored
instead of just scaled. High impact, low effort.

**Security** — real gaps today:
- Saves are plain `localStorage` → trivially edited
- Multiplayer `hello` trusts the peer's claimed upgrades (clamped 0–8, so
  bounded, but can be unearned)
- Host-authoritative P2P → the host can cheat
- No accounts

Proper fix = a backend (Supabase/Firebase free tier) for accounts + server-side
saves. Worth doing *before* leaderboards, pointless before you have players.

**Engagement** — an instant-play web link is the biggest advantage; don't trade
it away. Highest leverage, in order:
1. Real audio (currently one oscillator beep — cheapest huge win)
2. Leaderboards
3. Daily / progression hooks

---

## What I need from you

Everything else I can do. These need you:

| Needed | When |
|---|---|
| Adobe/Mixamo account (free) — I can't create accounts | M0 |
| Pick which character model you like (taste call) | M0 |
| Blender installed (free) — one-time conversion step | M0 |
| **Your verdict after the M0 spike** — does it clear your bar? | M0 |
| Story / personality ideas for the 5 opponents (or I draft, you approve) | later |
| $25 + Play Store account | when publishing |

I don't need money or a subscription to keep working on this.

---

## How we verify each step

- **M0:** deploy, open on the real target phone, judge look + frame rate.
  That one's your call, not something I can test for you.
- **M2–M3:** automated browser checks — boots with no console errors, solo
  match reaches "ROUND 1", punches land and deal damage, combo counter climbs.
- **Multiplayer regression:** two browser contexts, host + join by code, both
  reach "ROUND 1" together and the joining player sees correct animations.
  (This is the main risk in M2 — the client must derive the same clip from the
  snapshot.)
- **Offline/PWA:** reload with network disabled, game still boots from cache.
- Deploy to Vercel every milestone so you can play it on your phone as it grows.
