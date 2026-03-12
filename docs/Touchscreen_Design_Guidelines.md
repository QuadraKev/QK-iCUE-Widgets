# Guidelines for Designing Touch Screen User Interfaces

> Based on ESA Automation White Paper N.4 (2017)

---

## 1. Indications on Methodology — Good Design Outlines

When defining the characteristics of a new user interface for controlling industrial production machinery, the design must be guided by clear principles that enhance usability. Usability is connected to three criteria:

- **Efficacy** — the degree of orientation to the task and the activity.
- **Efficiency** — ease of learning, ease of remembering, reduced number of errors, and safe use.
- **Satisfaction** — compatibility with user needs and the level of pleasantness derived from use.

### 1.1 Principles of Good Design (Norman, 1988)

**Visibility** — A mnemonic reference for what one can do with a product. All functional parts must be visible and convey the proper message on what can be done. The number of available functions should not greatly exceed the number of controls that can be used.

**Mapping** — Good mapping requires an explicit relationship between controls, their operation, and the results in the external world. When mapping is natural, physical analogies and cultural models are exploited for immediate, unambiguous understanding.

**Affordance and Constraints** — Affordance is the real and perceived properties of an object that encourage a certain method of use, making it clearly perceivable. Constraints are functions that force the user to use the instrument in a certain way. Together, affordance and constraints guide the interaction between the object and its user.

**Feedback** — Information that tells the user which action has been carried out and which result has been achieved. Lack of clear feedback may lead the user to make a mistake.

**Conceptual Model** — The conceptual image of the system must provide basic information to understand its structure and operation. The overall picture must be self-explanatory: the theoretical model presumed by the design engineer must be as close as possible to the mental model created by the user during interaction.

### 1.2 User-Centred Design (UCD)

UCD requires the final user's active participation in the practices and activities that lead to the realisation of a new product. Its basic principles are:

- **User-centric methodology** — placing the user at the centre of the design process.
- **Test-design iteration** — verify in itinere that the project meets user needs.
- **Re-design** — modify the realised system based on experimental feedback obtained from user tests.

UCD requires in-depth knowledge of the common and peculiar characteristics of the final user. Both the characteristics of their cognitive system and the characteristics of their activity must be understood, along with their attitudes and expectations.

The design must have a truly cyclic nature: **design → test → re-define → re-design**. Process phases are repeated multiple times in a cyclic, iterative trend, validating design assumptions against real user behavior at each cycle.

### 1.3 Benefits of UCD

For users: easy use and learning, complete efficacy and efficiency, pleasant use, safeguarding of existing skills, and reduced training costs.

For the organisation: compliance with the user's real requisites, identification of new needs and market opportunities, reduced acceptance time on the market, and reduced development, maintenance, and training costs.

---

## 2. Guidelines for Redesigning

General indications for developing interface elements and creating the layout:

**1. Consistency** — The entire interface shall be consistent. All graphically identical elements shall convey the same navigation method or action.

**2. Minimalism** — There must be uniformity in graphics and style, with an approach as minimalist as possible. Avoid distractions, focus the operator's attention on possible actions or displayed information, and prevent errors to improve machine efficiency.

**3. Rational Space Organisation** — The interface space shall be organised rationally, allocating specific functional areas to defined tasks. Always-visible functional areas shall be proportional to their relative importance to focus attention and avoid conveying non-pertinent information.

**4. Differentiate Key Types** — Navigation keys (switching between sections/menus), in-page surfing keys (scroll, page turning), and function keys (conveying an action) should be distinguished by shape and colour. This makes it possible to predict the consequences of operations and limit errors.

**5. Visible Architecture** — Make the interface structure and functional architecture always visible, minimising the number of operations needed to switch between sections. This can be achieved with first-level menu surfing buttons always visible, arranged vertically on one side of the screen or at the bottom. A bottom menu avoids covering screen parts for both left- and right-handed users.

**6. Toggle Controls** — For ever-present menu items, use toggle controls where the made selection is always visible (active interface area) as well as the current operating mode. Toggle controls have two states (active/inactive, on/off), and reversing the state is done by a single press regardless of the current state.

**7. Breadcrumbs** — To help users navigate, assign titles to pages with breadcrumbs — a navigating tool that shows the page hierarchy from the homepage to the current location using graphic and text elements.

**8. Ergonomic Spacing** — Each control must be spaced out based on ergonomic guidelines to allow proper identification, pointing, and pressing. This minimises chances for pressing errors.

**9. Keep the Operator Informed** — Always keep the operator informed about machine operations and state, whether during automatic/semi-automatic procedures, production, or alarms. For automatic procedures, indicate the various passages along with their satisfaction and progress status for longer procedures.

**10. Labels vs. Icons** — Decide early whether to use text labels, icon labels, or a mix. All solutions have strengths and weaknesses that must be considered in light of reference markets. Where icons convey a clear and univocal meaning, they can be used completely for main controls and menus. Note: different languages may significantly vary in text length and character sets, affecting space organisation and text fields.

**11. Consistency of Values** — Maintain consistency and uniformity of measures and values (including technical ones) across all interface screens. Uniformity should also apply to the methods for changing or setting these values.

**12. Status Bar** — Keep the machine status always visible in a dedicated section (status area or bar) to provide clear, immediate, and identifiable information about the machine status and supplementary data (warnings, time, etc.). This can be positioned vertically or horizontally.

---

## 3. Graphic User Interface Design Indications

### 3.1 Premise

Before beginning design, identify an accurate and precise HMI interaction philosophy. This should define:

- Which areas are sensitive (interactive) and which are not
- Normative constraints, user needs/desires, and producer/operator/engineer needs
- What happens after a finger press on the screen in various conditions (of the finger, machine, and display)
- When the "event" is transmitted to the system (e.g., upon release)
- The overall conceptual model of the system and how it is presented through the UI
- The functional areas of the interface and how they are set up
- Action controls vs. navigation controls, definable in different statuses
- Display fields vs. editing fields
- A subset of graphic components or composing elements
- Colour codes (functional, regulatory, or otherwise dictated)

### 3.2 High-Level Guidelines

- **Conceptual model** — Supply a general system for how users may think about the UI (the mental projection of how the software works and interacts with the machine).
- **User-interface structure** — Design screens according to a logical hierarchy that considers how people differently approach frequent, urgent, and critical operations.
- **Interaction style** — Establish an interaction model that makes tasks easier, embraces user abilities, and understands their needs.
- **Screen subdivision** — Organise information so users can quickly identify specific elements and make appropriate associations, minimising attribution errors.
- **Legibility** — Textual and graphic information must be clear in dimension, colour, contrast, and character type so users can read and discriminate important details.
- **Aesthetics** — Present information attractively to avoid intimidating new users and positively affect application performance.
- **Data entry** — Establish precise rules for entering data or carrying out selections through the interface.
- **Colour** — Use colours to contribute to making information clear and focus attention on important elements. Pay attention to codes and redundancies.
- **Dynamic display** — Use active or dynamic graphic/text elements (e.g., short animations) to convey information more effectively than static presentations.
- **Special interactive mechanisms** — Provide clear information about less common controls such as soft keys or on-screen keyboards. These touch-screen controls are not always obvious and identifiable.
- **Support to the users** — Provide useful information and help at the right time and in the proper format to help users carry out tasks safely, quickly, and effectively.
- **Consistency** — Provide the same type of checks and feedback when possible, both in interaction and in Look & Feel.

### 3.3 Physical Characteristics: Sizing of Commands on GUI

Source: US DoD, MIL-STD-1472G (2012)

Keys on a touch-screen display should have a **regular shape, symmetrical and tendentially equilateral**.

#### Alphanumerical / Numerical Keyboards

| | Entering Area (A) | Separation (S) | Resistance |
|---|---|---|---|
| **Minimum** | — | 0 | 250 mN |
| **Optimal** | 13 × 13 mm | — | — |
| **Maximum** | — | 6 mm | 1.5 N |

#### Other Applications

| | Editing Area (A) | Separation (S) | Resistance |
|---|---|---|---|
| **Minimum** | 16 × 16 mm | 3 mm | 250 mN |
| **Maximum** | 38 × 38 mm | 6 mm | 1.5 N |

### 3.4 Dimension of Alphanumerical Characters and Symbols

Source: US DoD, MIL-STD-1472G (2012)

#### Minimum Character Height by Viewing Distance

| View Distance (mm) | Minimum Character Height (mm) |
|---|---|
| < 500 | 2.3 |
| 500 – 1000 | 4.7 |
| 1000 – 2000 | 9.4 |
| 2000 – 4000 | 19 |
| 4000 – 8000 | 38 |

#### Readability Notes

- Larger characters within larger button areas are more readable than small characters in large areas.
- Characters with defined edges/borders are more readable than those without.
- Symbols must comply with EEC Directive 78/316 and ISO 2575 where applicable.

#### Visual Angle Specifications

The visual angle formula is: **α = 3438 × AS / DU** (where AS = actual size, DU = distance from user)

- Minimum symbol-to-background contrast: **3:1**
- Minimum visual angle for symbol legibility: **41 arcmin (0.69°)** — approximately 10 mm at 850 mm distance
- Optimal visual angle for symbol recognisability: **85 arcmin (1.43°)**
- Minimum visual angle for text labels: **16 arcmin (0.27°)**
- Optimal visual angle for text labels: **24 arcmin (0.40°)**

### 3.5 Colour Code, Polarity, and Combinations

Colour plays a significant role in the stylistic Look & Feel of the interface. If a colour code is used, it should be made redundant by another identification method (positioning, dimension, etc.). **Colour alone should never be used as the sole identifying element.**

#### Polarity

- **Positive polarity** (dark symbols on light background) — Recommended for non-shielded displays; helps reduce visibility of reflections.
- **Negative polarity** (light symbols on dark background) — Use at night.

#### Minimum Luminance Ratios (Characters to Background)

| Condition | Minimum Ratio |
|---|---|
| Night | 5:1 |
| Day (cloudy) | 3:1 |
| Day (sunny) | 2:1 |

#### Colour Combination Matrix

Rating key: **++** Excellent (preferred) · **+** Good (recommended) · **o** Sufficient (acceptable with large saturation differences) · **−** Insufficient (not recommended)

| Background ↓ / Symbol → | White | Yellow | Orange | Red/Crimson | Green/Cyan | Blue/Purple | Black |
|---|---|---|---|---|---|---|---|
| **White** | | − | o | + | + | ++ | ++ |
| **Yellow** | − | | − | o | o | + | ++ |
| **Orange** | o | − | | − | − | o | + |
| **Red/Crimson** | + | o | − | | − | − | + |
| **Green/Cyan** | + | o | − | − | | − | + |
| **Blue/Purple** | ++ | + | o | − | − | | − |
| **Black** | ++ | ++ | + | + | + | − | |

---

## 4. Reference Standards for Touch-Screen UI Design

| Standard | Title | Main Indications |
|---|---|---|
| **ISO 9241-110 (2006)** | Ergonomics of human-system interaction — Part 110: Dialogue principles | Cornerstones of HMI; basis for assessment heuristics of user interfaces in the scope of human factors |
| **ISO 11064-4** | Ergonomic design of control centres | Legibility aspects in designing workstations, with emphasis on layout and sizing |
| **MIL-STD-1472G (2012)** | Department of Defense design criteria standard: Human engineering | Criteria and human factors for engineering design; optimise system performance considering human abilities and limitations |
| **ANSI/HFES 100 (2007)** | Human Factors Engineering of Computer Workstations | Criteria, guidelines, and specifications for workstation design; general guidelines for posture and accessibility |
| **ANSI/AAMI HE75:2009** | Human Factors engineering — Design for medical devices | Criteria, guidelines, and regulations for HMI design from the standpoint of ergonomics |
| **Zwahlen et al. (1988)** | Safety aspects of CRT touch panel controls in automobiles | Impact on safety of touch-screen devices; observations and guidelines from automotive domain applicable to other domains |

---

*Source: ESA Automation (2017). Guidelines for designing touch-screen user interfaces. White Paper N.4. www.esa-automation.com*
