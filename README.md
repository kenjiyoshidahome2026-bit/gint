# gint (Geospatial Intent Integer)

**An intent-driven 64-bit primitive for ultra-fast, tile-less geospatial rendering.**

---

## 🚀 The Story: Wisdom meets AI
This project is a unique collaboration between a **67-year-old retired engineer**(me)—bringing decades of experience in bit-level optimization and computational geometry—and **Gemini (AI)**. 

By fusing the "soul of craftsmanship" with modern analytical power, we have created **gint**. It is born from a vision to challenge the status quo: **"Why rely on complex server-side tiling when the data itself can carry the intelligence to render itself?"**

## 🌍 What is gint?
`gint` is not just a coordinate; it is a **"Geospatial Intent Integer."** It packs high-precision coordinates, spatial indexing (Morton Order), and rendering logic (VW[Visvalingam-Whyatt] Rank) into a single **64-bit integer (BigUint64)**. 

The data "knows" its own importance. This allows renderers to achieve 60FPS by skipping irrelevant points using simple bitwise operations, potentially eliminating the need for traditional map tiles.

---

## 🛠 Technical Specification

`gint` utilizes a single 64-bit space, alternating its internal structure based on the **Geometric Role** of the point.

### Bit Allocation Map

| Bits | Name | Description |
| :--- | :--- | :--- |
| **63** | `TERMINAL_BIT` | **L1/L2 Flag**. `1` for L1 (Terminal Node), `0` for L2 (Intermediate Node). |
| **6 - 62** | `Morton Payload` | Interleaved Longitude/Latitude in Z-order (Morton space). |
| **0 - 5** | `VW Rank` | **The Will**. Used in L2 for resolution-based culling (0-63). |

---

### 💎 The Duality of L1 and L2

`gint` maintains topological integrity while maximizing rendering efficiency by distinguishing between the "Skeleton" and the "Shape."

#### **L1: Terminal Node (Nodes/Endpoints)**
- **Role**: The start and end of an Arc, or a junction where polygons meet.
- **Precision**: Guarantees **10⁻⁷ degree (approx. 1cm)** absolute precision.
- **Behavior**: The `TERMINAL_BIT` is always set to `1`. These points are **always rendered** regardless of zoom level. This prevents gaps ("cracks") between polygons even at low resolutions.

#### **L2: Intermediate Node (Vertices)**
- **Role**: Points that define the detailed curvature and shape of a line.
- **Precision**: Quantized to **10⁻⁶ degree (approx. 11cm)** using an 8-unit grid.
- **Behavior**: The lower 6 bits are reclaimed to store the **VW Rank (0-63)**. These points are dynamically culled based on the screen's physical pixel resolution.

> **The "8-unit Quantized" Trick:**
> By rounding coordinates to the nearest 8 units ($2^3$), we effectively clear the bottom 3 bits of both $x$ and $y$. In a Morton-encoded space where bits are interleaved, this creates a **6-bit "empty lot"** at the bottom of the 64-bit integer. `gint` reclaims this space to store the rendering rank, allowing the point to carry its own "visibility intent" without increasing memory footprint.

---

## 📏 Mathematical Foundation

### The Physical Rank Formula
The rank is derived from the Visvalingam-Whyatt effective area ($Area$) in $10^{-7}$ units. It is logically mapped to the physical zoom level where the point becomes "1-pixel significant":

$$Rank = \text{clamp}( \lfloor 1.5 \cdot \log_2(Area) - 8.2365 \rfloor, 0, 63 )$$

### Zero-Overhead Rendering
The renderer calculates a single threshold based on the current zoom level $z$:
$$Threshold = \max(0, \lfloor (21 - z) \cdot 3 \rfloor)$$

**Culling Logic:**
```javascript
// High-speed skip: If not a terminal node AND rank is below threshold
if ((p >> 63n) === 0n && Number(p & 0x3Fn) < threshold) continue;
```

## 📜 License: MIT  
This project is licensed under the MIT License.

Copyright (c) 2026 (Kenji Yoshida / "The Veteran Engineer")
