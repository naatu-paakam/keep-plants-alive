# Keep Your Plants Alive — Storefront Concept

**Tagline:** The tools your plants need to survive and thrive.

## The Idea

A curated e-commerce storefront selling practical, hands-on tools for home gardeners and plant enthusiasts who want to keep their plants alive with minimal effort. Not seeds. Not décor. Just the functional hardware and gadgets that solve real problems: underwatering, overwatering, frost damage, pest exposure, and neglect.

## Problem We Solve

Most plant deaths are preventable. The root causes are almost always:
- Inconsistent watering (too much or too little)
- Cold snaps and frost damage
- No feedback loop (owner doesn't know what the plant needs)
- Pests and birds getting to seedlings

Our store sells solutions to each of those problems — not advice, not subscriptions, actual tools.

## Target Customer

- Home gardeners with raised beds or container gardens
- Apartment balcony growers
- People who travel and can't water every day
- New plant owners who kill plants and want to stop

## Product Philosophy

1. **Functional over decorative** — every item has a job to do
2. **Practical price point** — under $50 for most items; starter kits under $100
3. **Beginner-friendly** — clear descriptions of what problem each tool solves
4. **Curated, not exhaustive** — fewer SKUs, better picks

---

## Product Categories

### 1. Watering & Drip Irrigation
The biggest kill driver is inconsistent water. Drip tools fix that.

| Product | Example | Problem Solved |
|---|---|---|
| Watering stakes (ceramic/clay) | DripDepot 8" stakes | Slow-release into root zone |
| Drip irrigation kits | Raindrip, DIG | Automate watering for beds |
| Self-watering inserts | Santino Wick | Reservoir bottom-watering |
| Soaker hose | Swan, Melnor | Even bed watering without runoff |
| Drip emitters + tubing | DripDepot, Orbit | Custom drip layout |
| Plant watering globes | Aqua Globe-style | 2-week vacation watering |

### 2. Plant Protection Covers
Frost, birds, and sun scorch kill more plants than most owners realize.

| Product | Example | Problem Solved |
|---|---|---|
| Pop-up garden cloches | Gardener's Supply | Frost protection, individual plants |
| Floating row cover fabric | Agribon AG-19 | Frost + pest barrier for beds |
| Cold frames (collapsible) | Palram, Juliana | Season extension |
| Garden netting (bird/insect) | Dalen, Tenax | Pest/bird exclusion |
| Frost blankets | DeWitt | Overnight freeze protection |
| Shade cloth | Various | Sun scorch on seedlings |

### 3. Irrigation Controllers & Timers
Make watering automatic so it actually happens.

| Product | Example | Problem Solved |
|---|---|---|
| Hose-end timer (mechanical) | Orbit 56854 | Simple schedule, no app required |
| Smart WiFi timer | Rachio, Orbit B-hyve | Remote control + weather skip |
| 4-zone drip controller | DIG, Orbit | Multi-zone garden automation |
| Indoor plant auto-waterer | Blumat, Sustee | Potted plant automation |
| Rain sensor shutoff | Hunter, Orbit | Prevents watering during rain |

### 4. Soil & Root Monitoring
Know before your plant tells you (by dying).

| Product | Example | Problem Solved |
|---|---|---|
| Soil moisture meter (analog) | XLUX, Gouevn | Instant root-zone check |
| 3-in-1 meter (moisture/light/pH) | Dr.meter | Full soil snapshot |
| Smart sensor (Bluetooth) | Xiaomi Flora, Parrot | Continuous monitoring via app |
| pH test strips/kit | Rapitest | Verify soil chemistry |
| Thermometer probe | Reotemp | Track soil temp for planting |

### 5. Plant Nutrition & Feeding Tools
Correct delivery of nutrients matters as much as the nutrients themselves.

| Product | Example | Problem Solved |
|---|---|---|
| Fertilizer stakes/spikes | Jobe's | Slow-release, no mess |
| Root feeder + cartridges | Miracle-Gro Root Feeder | Deep root delivery |
| Hose-end sprayer | Ortho Dial N Spray | Even foliar or soil feeding |
| Compost tea brewer kit | Various | Organic soil biology boost |

### 6. Plant Support & Structure
Unstaked plants break, sprawl, and die young.

| Product | Example | Problem Solved |
|---|---|---|
| Bamboo/metal stakes | Various | Vertical support for tall plants |
| Tomato cages (heavy gauge) | Gardener's Supply Mega | Strong cage for fruiting plants |
| Grow bags (fabric) | Bootstrap Farmer | Drainage, air pruning |
| Soft plant ties / velcro | Grower's Edge | Gentle tie-in without wire cuts |
| Trellis netting | Melonfarm | Climbing plant support |

### 7. Seed Starting & Propagation
Starting strong reduces mortality from day 1.

| Product | Example | Problem Solved |
|---|---|---|
| Heat mat | Vivosun, iPower | Germination speed + rate |
| Humidity dome | Bootstrap Farmer | Moisture retention for seedlings |
| Plug trays (72/128 cell) | Bootstrap Farmer | Uniform cell starts |
| Grow lights (small) | Spider Farmer SE1000 | Indoor / window supplement |
| Root hormone gel | Clonex | Cutting propagation success |

---

## Store Structure (Draft)

```
keep-plants-live.com
├── Shop
│   ├── Watering & Irrigation
│   ├── Plant Protection
│   ├── Controllers & Timers
│   ├── Sensors & Monitoring
│   ├── Nutrition & Feeding
│   ├── Plant Support
│   └── Seed Starting
├── Starter Kits
│   ├── The Vacation Kit (drip + timer)
│   ├── The Frost Fighter Kit (covers + cloche)
│   └── The Seed Starter Kit
├── By Problem
│   ├── My plant keeps dying from drought
│   ├── Frost is killing my seedlings
│   └── I can't tell if I'm overwatering
└── Learn (short guides, no fluff)
```

---

## Business Model Options

| Model | Notes |
|---|---|
| **Dropship** | Low risk, lower margin. Source from US wholesale distributors (DripDepot, Greenhouse Megastore). Fast to launch. |
| **Buy + resell** | Higher margin, need inventory. Good for high-turn SKUs like stakes, row cover. |
| **Private label** | Best margin, highest risk. Start only after validating 2–3 top SKUs. Chinese OEM via Alibaba for stakes, covers. |
| **Affiliate only (v0)** | Zero inventory, zero fulfillment. Link to Amazon/DripDepot. Validate demand before investing. |

**Recommended path:** Start affiliate (4–8 weeks to validate), then add dropship for the top 5 SKUs, then private label year 2.

---

## Tech Stack (Storefront)

- **Shopify** — fastest path to a working store
- **Alternatively:** Static site (Astro/Next.js) + Stripe + manual fulfillment for MVP
- Domain idea: `keepplantsalive.com`, `plantkeep.store`, `naatupaakam.store`

---

## Next Steps

1. [ ] Validate demand — check Google Trends for key terms (drip stakes, frost cover, plant timer)
2. [ ] Identify 3–5 US wholesale suppliers (see `suppliers/` folder)
3. [ ] Pick top 10 SKUs to launch with
4. [ ] Register domain + set up Shopify or static storefront
5. [ ] Build product pages with problem-first descriptions
6. [ ] SEO: target "how to keep plants alive while on vacation", "frost protection garden" etc.
