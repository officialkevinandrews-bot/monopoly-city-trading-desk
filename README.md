# Monopoly City Trading Desk

Build a Monopoly City Trading Unit replica and interactive game companion web app so players can play Monopoly City when their physical electronic unit is broken.

Key features and specifications:

1. Physical Trading Unit Replica (Main Tab / Hero View):
- Realistic tactile hardware interface styled like the iconic Monopoly City electronic unit (sleek metallic/silver chassis, beveled edges, realistic pressable buttons).
- Digital 7-Segment Red LED Display with glowing segments:
  * In standby: shows ready state or idle dash/animation.
  * When BUILD is pressed: displays spinning segment animation with fast audio clicks, then stops randomly on 1, 2, 3, or a Railroad Train icon (displays "r" / train glyph with train sound, indicating free railroad placement).
  * When AUCTION is pressed: triggers the Authentic Mystery Timer (unpredictable duration between 30 and 50 seconds). The LED pulses red with ticking audio; at exactly 5 seconds left, sound shifts to rapid urgent warning beeps and LED flashes rapidly, ending on a loud buzzer/gavel chime when the auction closes.
  * Stop / Cancel button if an auction needs to be aborted.
- 1-Hour Game Session Timer:
  * Toggleable background match timer.
  * Alerts players with periodic audio beeps when approaching 60 minutes (as specified in official Monopoly City rules for timed games). Option to reset for another hour or end the match.
- Web Audio API Sound System:
  * Pure client-side synthesized retro arcade beeps, clicks, ticking clocks, train horns, warning beeps, and end-of-auction buzzers (no external audio file dependencies so it works instantly with zero latency and works offline).
  * Sound mute / volume toggle.

2. Smart Rent & Hazard Calculator Tab:
- Allows players to quickly calculate exact rent without manual math disputes:
  * Select or search district / street from the 22 Monopoly City districts with their base values and color groups.
  * Block counters: add Residential blocks and Industrial blocks (max 8 blocks per district).
  * Hazard toggle: Rubbish Dump (2 blocks), Sewage Plant (3 blocks), Power Station (3 blocks), Prison (4 blocks).
  * Bonus Building toggle: School, Water Tower, Wind Farm, Park.
  * Hazard logic: If hazard is active and no bonus building protects the district, Residential blocks count as 0, but Industrial blocks retain full value.
  * Multipliers: Skyscraper (2x for color group) and Monopoly Tower (2x for all districts).
  * Rule enforcement: Strictly enforces the official rule that Skyscraper + Monopoly Tower do NOT stack/quadruple (rent doubles at most once).
  * Displays current Mortgage value (which in Monopoly City equals current rent value!).
  * Shows demolition cost to clear hazard (500k per block).

3. End-Game Net Worth Tally Tab:
- Add 2 to 6 players.
- Enter cash on hand + automatically sum owned district rent values to instantly determine the richest player and declare the winner according to official rules.

4. "Monopoly City Referee" (Searchable Rules & Quick Clarifier Tab):
- Searchable quick-reference cards explaining every confusing rule:
  * Planning Permission (build bonus building on own/unowned, or hazard on opponent/unowned).
  * Hazard block sizes & removal fees (500k per block).
  * Railroad jumping & the rule that rent must be paid before teleporting away.
  * Free Parking & the Rent Dodge card "theft" rule (must surrender if someone lands on Free Parking before you use it).
  * Stadium rules (only 2 in game, 2m cost, pays 1m bonus wages on GO, 0 district rent).
  * Jail actions (can still collect rent and build while in jail).
  * Deals & Mortgages.

Design & Polish:
- High quality mobile-first responsive design, works smoothly on phones placed beside the board or tablets/desktops.
- Crisp dark-themed high-tech aesthetic with neon red LED glow, realistic shadow and button depression states.
- Friendly navigation tabs: "Trading Unit", "Rent Calculator", "Scoreboard", and "Rules / Referee".

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://monopoly-city-trading-desk.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/114465d0-5c5d-4993-b24c-397b03fd4528).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
