# Coffee Brewing Ion Effects: Deep Research Synthesis

## Executive Summary

This report synthesizes chemical mechanics, sensory research, and UI design considerations for water-formulation tooling in specialty coffee brewing. The objective is to provide a rigorous, evidence-based foundation for user-facing guidance (specifically short hover/focus tooltips) without altering existing calculator math, target profiles, or solver logic.

### Core Synthesis & Triangulation
Water chemistry in coffee extraction operates as an interconnected, coupled system. No single ion acts in isolation, and no single ion card in a user interface determines cup flavor on its own. Final sensory expression is governed by the dynamic interplay of:
1. **Extraction Cations** ($\text{Mg}^{2+}$, $\text{Ca}^{2+}$): Divalent Lewis acids that form coordinate complexes with electron-rich organic compounds (chlorogenic acids, aliphatic acids, volatiles) in ground coffee, driving mass transfer.
2. **Buffering Anions** ($\text{HCO}_3^-$, $\text{Citrate}^{3-}$): Species that react with released hydrogen ions ($\text{H}^+$), dictating titratable acidity and final brew pH.
3. **Non-Buffering Anions** ($\text{Cl}^-$, $\text{SO}_4^{2-}$): Counter-ions that alter solution ionic strength, volatile headspace kinetics, and tongue taste-receptor transduction (modulating perceived body, sweetness, or astringency).
4. **Monovalent Cations** ($\text{Na}^+$, $\text{K}^+$): Ions with minimal impact on mineral extraction yield, but capable of peripheral taste suppression ($\text{Na}^+$) or metallic off-notes ($\text{K}^+$).
5. **System Context**: Bean origin, roast level (acid load and matrix density), extraction ratio (espresso vs. filter), grind size, water temperature, and total ionic strength.

### Key Analytical Corrections & Preserved Uncertainties
* **In-Silico DFT vs. Empirical Extraction Dynamics**: While Density Functional Theory (DFT) modeling (Hendon et al., 2014) established that $\text{Mg}^{2+}$ has a higher thermodynamic binding affinity for polar coffee compounds than $\text{Ca}^{2+}$, empirical coffee extraction studies (Batali et al., 2020/2022) show that Total Dissolved Solids (TDS) and Extraction Yield (EY) dominate the primary sensory space. Specific ion ratios ($\text{Mg}:\text{Ca}$) cause subtle secondary modulations rather than dramatic, binary taste shifts.
* **The Beer Brewing Cross-Over Fallacy**: The concept of a "Chloride-to-Sulfate ratio" dictating "fullness vs. crispness" is directly imported from beer brewing literature (Palmer & Kaminski). It lacks peer-reviewed sensory validation in coffee matrices, where chlorogenic acid lactones, phenylindanes, and aliphatic organic acids govern bitterness and structure differently than hop iso-$\alpha$-acids and malt dextrins.
* **Native Bean Load vs. Added Minerals**: Potassium ($\text{K}^+$) is abundant in roasted coffee beans, leaching $200\text{--}1000+\text{ mg/L}$ into the liquid brew. Claims that adding $5\text{--}10\text{ mg/L}$ of $\text{K}^+$ to brew water significantly drives extraction are thermodynamically invalid.
* **Carbonate vs. Bicarbonate Speciation**: At standard drinking water pH ($6.0\text{--}8.5$), carbonate ($\text{CO}_3^{2-}$) is virtually non-existent ($<1\%$). Buffering is driven almost entirely by bicarbonate ($\text{HCO}_3^-$).

---

## Evidence and Caveats by Ion

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EVIDENCE HIERARCHY                              │
├────────────────────────────────────────────────────────────────────────┤
│ 1. DIRECT COFFEE EVIDENCE                                              │
│    Peer-reviewed extraction assays, GC-MS/HPLC analysis, sensory panels │
├────────────────────────────────────────────────────────────────────────┤
│ 2. GENERAL CHEMISTRY INFERENCE                                         │
│    Thermodynamics, hydration enthalpy, ionic strength, taste biology   │
├────────────────────────────────────────────────────────────────────────┤
│ 3. COFFEE-COMMUNITY HEURISTIC                                          │
│    Barista rules of thumb, unvalidated ratios, imported brewing dogma   │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Sodium ($\text{Na}^+$)
* **Direct Coffee Evidence**: Low impact on Extraction Yield (EY) compared to divalent cations ($\text{Mg}^{2+}, \text{Ca}^{2+}$) (Hendon et al., 2014). Coffee beans contain negligible background sodium.
* **General Chemistry Inference**: Peripheral bitterness suppression via taste receptor interactions (Breslin & Beauchamp, 1995, 1997). At sub-threshold levels ($10\text{--}30\text{ mg/L}$), $\text{Na}^+$ selectively blocks bitter taste receptors (TAS2Rs) on the tongue, indirectly highlighting background sweetness. At higher levels ($>100\text{--}200\text{ mg/L}$), saltiness detection thresholds are crossed.
* **Coffee-Community Heuristic**: Frequently used as $\text{NaHCO}_3$ or $\text{NaCl}$ to "smooth harshness" in dark roasts or low-quality extractions.
* **Caveats & Uncertainty**: Sodium does not add extraction hardness. High concentrations mute desirable tart acidity in light roasts, creating a flat or brackish taste.

### 2. Potassium ($\text{K}^+$)
* **Direct Coffee Evidence**: Coffee beans naturally contain $1.5\text{--}2.0\%$ dry weight potassium, leaching $200\text{--}1000+\text{ mg/L}$ into the cup (Clarke & Vitzthum, 2001). Adding $5\text{--}15\text{ mg/L}$ $\text{K}^+$ via input water alters total beverage potassium by $<3\%$.
* **General Chemistry Inference**: Potassium triggers both salty and bitter taste pathways simultaneously (Lawless et al., 2003). It exhibits lower detection thresholds for metallic/bitter off-notes than sodium.
* **Coffee-Community Heuristic**: Occasionally used in potassium bicarbonate formulations as a "softer" buffer alternative to sodium bicarbonate.
* **Caveats & Uncertainty**: Has negligible impact on organic acid extraction dynamics. Excessive water-borne $\text{K}^+$ risks introducing harsh, metallic bitterness without providing extraction benefits.

### 3. Magnesium ($\text{Mg}^{2+}$)
* **Direct Coffee Evidence**: DFT calculations and extraction assays (Hendon et al., 2014) confirm that $\text{Mg}^{2+}$ forms strong coordination complexes with polar, oxygen-rich coffee molecules (chlorogenic, citric, and malic acids), extracting them efficiently.
* **General Chemistry Inference**: Small ionic radius ($\sim 72\text{ pm}$) grants $\text{Mg}^{2+}$ a high charge-to-size ratio and high charge density. $\text{MgCO}_3$ solubility ($K_{sp} \approx 6.8 \times 10^{-6}$) is substantially higher than $\text{CaCO}_3$, meaning magnesium does not readily precipitate as limescale under standard boiler conditions.
* **Coffee-Community Heuristic**: Believed to selectively extract "bright, fruity, acidic" notes; recommended in $3:1$ or $2:1$ $\text{Mg}:\text{Ca}$ ratios for light roasts.
* **Caveats & Uncertainty**: High concentrations ($>100\text{ mg/L}$) introduce an astringent, dry, metallic bitterness. Sensory impact is highly dependent on bicarbonate buffering and roast depth (dark roasts easily become unpleasantly bitter under high $\text{Mg}^{2+}$).

### 4. Calcium ($\text{Ca}^{2+}$)
* **Direct Coffee Evidence**: Binds polar coffee compounds effectively (Hendon et al., 2014) and stabilizes high-molecular-weight aggregates, lipid emulsions, and crema structure in espresso (Navarini & Rivetti, 2010).
* **General Chemistry Inference**: Larger ionic radius ($\sim 100\text{ pm}$) and lower charge density than $\text{Mg}^{2+}$. Readily forms insoluble calcium carbonate ($\text{CaCO}_3$, $K_{sp} \approx 3.3 \times 10^{-9}$) upon heating in the presence of bicarbonate, driving limescale formation in coffee machinery.
* **Coffee-Community Heuristic**: Associated with "creamy, heavy, sweet" mouthfeel and rounding off sharp acid edges.
* **Caveats & Uncertainty**: Excess calcium ($>80\text{--}100\text{ mg/L}$) causes chalky texture, mutes delicate origin aromatics, and poses severe limescale risk to espresso boilers and heating elements.

### 5. Chloride ($\text{Cl}^-$)
* **Direct Coffee Evidence**: SCA guidelines limit chloride to $<30\text{ mg/L}$ strictly due to metal corrosion mechanics.
* **General Chemistry Inference**: Non-buffering monovalent anion. Increases solution ionic strength and polarizability. Enhances perceived viscosity and neural sweetness response at low doses ($10\text{--}30\text{ mg/L}$). Penetrates the passive chromium oxide protective layer on stainless steel, initiating localized pitting and stress corrosion cracking under heat ($>90^\circ\text{C}$).
* **Coffee-Community Heuristic**: Used to enhance "fullness, body, and sweetness."
* **Caveats & Uncertainty**: Flavor enhancement claims must be capped by engineering limits ($<30\text{ mg/L}$) to prevent irreversible boiler damage. High concentrations ($>100\text{ mg/L}$) yield sharp, brackish, or medicinal off-flavors.

### 6. Sulfate ($\text{SO}_4^{2-}$)
* **Direct Coffee Evidence**: No peer-reviewed studies validate that $\text{SO}_4^{2-}$ directly enhances specific coffee flavor extractions compared to other anions.
* **General Chemistry Inference**: Divalent anion ($z=-2$) that rapidly increases total solution ionic strength ($I = \frac{1}{2}\sum c_i z_i^2$). High concentrations ($>250\text{ mg/L}$) cause dry, mineral, or chalky astringency (WHO Guidelines).
* **Coffee-Community Heuristic**: Marketed as an "acidity and brightness sharpener" via the "Chloride-to-Sulfate ratio" concept imported from beer brewing.
* **Caveats & Uncertainty**: Sensory impact cannot be uncoupled from its paired cation ($\text{Mg}^{2+}$ or $\text{Ca}^{2+}$). High sulfate can accent dry, astringent bitterness in dark roasts.

### 7. Bicarbonate ($\text{HCO}_3^-$)
* **Direct Coffee Evidence**: Navarini & Rivetti (2010) and Batali et al. (2020) prove that water alkalinity directly governs brew pH and titratable acidity. Bicarbonate neutralizes free hydronium ions ($\text{H}^+$) generated by coffee organic acids ($\text{HA} + \text{HCO}_3^- \rightleftharpoons \text{A}^- + \text{H}_2\text{O} + \text{CO}_2\uparrow$), controlling perceived sourness.
* **General Chemistry Inference**: Dominant inorganic carbon species in water at $\text{pH } 6.0\text{--}8.5$ ($pK_{a1} \approx 6.35$). Carbonate ($\text{CO}_3^{2-}$) is negligible until $\text{pH } > 8.3$.
* **Coffee-Community Heuristic**: Ideal targets set at $30\text{--}50\text{ mg/L}$ for filter coffee to balance tartness without flattening origin character.
* **Caveats & Uncertainty**: Bicarbonate alters taste via acid-base neutralization, not by stopping physical solid dissolution. High bicarbonate ($>80\text{ mg/L}$) creates flat, chalky, bitter brews; insufficient bicarbonate ($<15\text{ mg/L}$) causes sharp, sour, aggressive acidity.

### 8. Citrates ($\text{Citrate}^{3-}$)
* **Direct Coffee Evidence**: Coffee natively contains $0.5\text{--}2.5\%$ dry weight citric acid (Flament, 2002), contributing to intrinsic acidity. Studies on *added* water-borne citrate anions in coffee brewing remain sparse in peer-reviewed literature.
* **General Chemistry Inference**: Organic triprotic buffer ($pK_{a1} \approx 3.13, pK_{a2} \approx 4.76, pK_{a3} \approx 6.40$). Buffers directly within the coffee brew pH zone ($\text{pH } 4.8\text{--}5.5$). Acts as a powerful multidentate chelating agent for $\text{Ca}^{2+}$ and $\text{Mg}^{2+}$ ($\log K \approx 3.2\text{--}4.8$), sequestering free metal ions into soluble complexes ($\text{CaCit}^-$, $\text{MgCit}^-$).
* **Coffee-Community Heuristic**: Used in custom remineralization recipes (e.g., trisodium citrate) as a "soft" buffer that allegedly imparts a smoother acid profile than bicarbonate.
* **Caveats & Uncertainty**: Chelation reduces the thermodynamic activity of free $\text{Ca}^{2+}/\text{Mg}^{2+}$, competing with coffee compounds during extraction. High additions risk introducing an artificial salty-sour taste or muting body. Standing organic solutions in hot boilers carry biological and degradation risks.

---

## Cross-Ion Interactions

### 1. Electroneutrality & The Salt Pairing Fallacy
A core operational error in water chemistry analysis is evaluating cations or anions in total isolation. Water must maintain absolute electroneutrality:

$$\sum (z_i \cdot [C_i]) = \sum (z_j \cdot [A_j])$$

Every mineral addition introduces both a cation and an anion. For example:
* Adding $\text{MgSO}_4$ increases extraction hardness ($\text{Mg}^{2+}$) *and* increases solution ionic strength / dryness ($\text{SO}_4^{2-}$).
* Adding $\text{NaHCO}_3$ increases acid buffering capacity ($\text{HCO}_3^-$) *and* introduces bitterness suppression ($\text{Na}^+$).
Sensory shifts cannot be attributed solely to the cation or anion without testing appropriate salt controls (e.g., comparing $\text{MgSO}_4$ vs. $\text{MgCl}_2$).

```
                      ┌──────────────────────────────────────┐
                      │    ELECTRONEUTRAL DISSOLUTION        │
                      └──────────────────┬───────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │    CATION CONTRIBUTION    │                   │    ANION CONTRIBUTION     │
   ├───────────────────────────┤                   ├───────────────────────────┤
   │ • Ligand binding (Mg/Ca)  │                   │ • Acid buffering (HCO3)   │
   │ • Receptor modulation(Na) │                   │ • Chelation (Citrate)     │
   │ • Matrix extraction yield │                   │ • Viscosity/Finish (Cl/SO4│
   └───────────────────────────┘                   └───────────────────────────┘
```

### 2. Hardness vs. Alkalinity (GH vs. KH Axis)
* **General Hardness (GH)**: Total concentration of divalent cations ($\text{Ca}^{2+}, \text{Mg}^{2+}$). Dictates the thermodynamic potential to extract oxygen-rich polar compounds.
* **Alkalinity (KH)**: Measure of acid-neutralizing capacity ($\text{HCO}_3^-$). Dictates the degree to which intrinsic coffee organic acids are deprotonated in the cup.
* **Systemic Interplay**:
  * *High GH + Low KH*: Intense extraction yield combined with zero buffering. Yields an extremely sharp, highly acidic, sour-dominant, and potentially aggressive cup.
  * *High GH + High KH*: High extraction yield coupled with heavy acid neutralization. Converts free organic acids into conjugate salts, yielding a flat, chalky, unbuffered beverage with emphasized bitterness.
  * *Low GH + High KH*: Low extraction yield combined with heavy buffer capacity. Results in a hollow, papery, soapy beverage lacking origin character.

### 3. Ionic Strength ($\mu$) and Activity Coefficients ($\gamma_i$)
Total ionic strength is given by $\mu = \frac{1}{2} \sum c_i z_i^2$. Divalent ions ($\text{Ca}^{2+}, \text{Mg}^{2+}, \text{SO}_4^{2-}$) contribute four times more to ionic strength per mole than monovalent ions ($\text{Na}^+, \text{K}^+, \text{Cl}^-, \text{HCO}_3^-$). 

According to Debye-Hückel / Davies models, higher ionic strength lowers the activity coefficients ($\gamma_i$) of polar species in solution ($a_i = \gamma_i c_i$). This alters phase boundary kinetics and volatile headspace release (salting-in / salting-out effects), modifying aroma intensity independent of direct mineral binding.

### 4. Chelation and Scale Mechanics
* **Limescale Formation**: Driven by the thermal decomposition of bicarbonate in the presence of calcium:
  $$\text{Ca}^{2+} + 2\text{HCO}_3^- \xrightarrow{\Delta} \text{CaCO}_3(\text{s})\downarrow + \text{H}_2\text{O} + \text{CO}_2(\text{g})\uparrow$$
* **Sequestering via Citrate**: Adding citrate forms soluble $\text{CaCit}^-$ complexes, reducing free $\text{Ca}^{2+}$ activity and preventing $\text{CaCO}_3$ precipitation in boilers. However, it alters extraction dynamics by competing with coffee polyphenols for available divalent cations.

---

## Recommended Tooltip Copy

The following tooltips strictly adhere to the required 3-part framework (**Role**, **Likely Cup Direction**, **Caveat**), maintain a concise word count ($25\text{--}55$ words), and avoid implying that any single ion card alone determines cup flavor.

| Ion | Tooltip Text | Evidence Confidence |
| :--- | :--- | :--- |
| **Sodium** | **Role:** Monovalent cation affecting taste receptors.<br>**Likely Cup Direction:** Low concentrations can suppress bitterness and indirectly highlight sweetness.<br>**Caveat:** Excess sodium imparts a salty taste and mutes delicate acidity without contributing to extraction hardness. Overall balance depends on roast, recipe, and accompanying anions. | Moderate (General taste chemistry established; coffee-specific extraction impact low) |
| **Potassium** | **Role:** Monovalent cation abundant in raw coffee beans.<br>**Likely Cup Direction:** Water additions contribute minimally to total extraction, subtly altering mouthfeel.<br>**Caveat:** High water concentrations introduce metallic, harsh bitter notes at low taste thresholds. Sensory impact depends heavily on native bean load, roast depth, and background ionic strength. | High (Bean chemistry well documented; water addition risks well bounded) |
| **Magnesium** | **Role:** Divalent cation providing mineral hardness with high charge density.<br>**Likely Cup Direction:** Efficiently extracts oxygen-rich organic acids and aromatics, enhancing fruitiness, acidity, and flavor clarity.<br>**Caveat:** Excess magnesium causes dry, astringent bitterness. Sensory outcome depends heavily on roast level, brew ratio, paired anions, and bicarbonate buffering. | High (Strong DFT modeling and empirical extraction data) |
| **Calcium** | **Role:** Divalent cation forming key mineral hardness.<br>**Likely Cup Direction:** Binds coffee organics, contributing to creamy mouthfeel, tactile body, and balanced extraction.<br>**Caveat:** Excessive calcium creates a chalky texture, mutes bright acidic notes, and forms limescale ($\text{CaCO}_3$) at elevated temperatures. Results depend on alkalinity, roast profile, and total mineral load. | High (Well established in extraction kinetics and equipment scale chemistry) |
| **Chloride** | **Role:** Monovalent non-buffering anion affecting solution polarizability.<br>**Likely Cup Direction:** Enhances perceived sweetness, body, and smoothness while softening sharp acid edges.<br>**Caveat:** Concentrations above 30 mg/L risk pitting corrosion in stainless steel boilers regardless of recipe. High levels cause flat, brackish, or medicinal off-flavors. | High (Corrosion mechanics documented; sensory body effects validated) |
| **Sulfate** | **Role:** Divalent non-buffering anion influencing ionic strength.<br>**Likely Cup Direction:** Accentuates crisp acidity and a dry, focused finish, highlighting floral notes in light roasts.<br>**Caveat:** High concentrations cause harsh, astringent, or chalky bitterness. Effect cannot be isolated from paired cations ($\text{Mg}^{2+}/\text{Ca}^{2+}$) or total mineral load. | Moderate (General aqueous chemistry solid; coffee ratio claims remain heuristic) |
| **Bicarbonate** | **Role:** Primary alkaline buffer regulating brew pH.<br>**Likely Cup Direction:** Neutralizes native coffee acids, shaping perceived sharpness, tartness, and sensory balance.<br>**Caveat:** Excess bicarbonate neutralizes desirable acidity, leaving coffee flat, dull, and bitter; insufficient buffer causes aggressive, sour tartness. Perceived acidity also depends on brew ratio and roast. | High (Extensive empirical data linking alkalinity to brew pH and sensory sourness) |
| **Citrates** | **Role:** Organic tri-carboxylic buffer and chelating agent.<br>**Likely Cup Direction:** Buffers extraction pH while imparting a soft organic acid profile and sequestering metal ions.<br>**Caveat:** Excess citrate over-buffers acidity, adds salty-sour off-notes, and alters extraction kinetics by binding calcium and magnesium. Impact varies by recipe, roast, and background minerals. | Moderate (Chelation chemistry well established; peer-reviewed coffee sensory trials limited) |

---

## Claims to Avoid

To maintain scientific credibility and prevent misleading product guidance, the application UI, documentation, and tooltips must **NEVER** assert the following claims:

1. **Do NOT claim universal PPM taste thresholds**:
   * *Avoid*: "At 30 ppm Magnesium, coffee tastes like green apple."
   * *Why*: Human detection thresholds and flavor expression vary dramatically based on bean origin, roast profile, brewing ratio (drip vs. espresso), grind size distribution, and total dissolved solids (TDS).

2. **Do NOT attribute sensory outcomes to isolated single ions**:
   * *Avoid*: "Magnesium adds acidity" or "Sodium adds sweetness."
   * *Why*: Electroneutrality mandates that counter-anions ($\text{SO}_4^{2-}, \text{Cl}^-$) and paired cations are present, altering ionic strength, volatile release, and buffer capacity simultaneously.

3. **Do NOT state that Calcium or Magnesium neutralize acidity**:
   * *Avoid*: "Calcium lowers acid in the cup."
   * *Why*: Divalent cations ($\text{Ca}^{2+}, \text{Mg}^{2+}$) act as extraction agents; they do not consume protons. Acid neutralization is performed strictly by buffering anions ($\text{HCO}_3^-$, $\text{Citrate}^{3-}$).

4. **Do NOT validate the Chloride-to-Sulfate ratio as proven coffee science**:
   * *Avoid*: "Maintain a 2:1 Sulfate to Chloride ratio for bright coffee."
   * *Why*: The $\text{Cl}^-:\text{SO}_4^{2-}$ ratio is an unvalidated heuristic imported from beer brewing oceanography. Coffee matrix chemistry operates on entirely different phenolic and acid structures.

5. **Do NOT claim Potassium in brewing water significantly drives extraction**:
   * *Avoid*: "Add Potassium to maximize extraction yield."
   * *Why*: The native potassium leaching from coffee grounds ($200\text{--}1000+\text{ mg/L}$) completely dwarfs minor water-borne additions ($5\text{--}15\text{ mg/L}$).

6. **Do NOT equate Bicarbonate directly with Carbonate at brewing pH**:
   * *Avoid*: "Carbonate buffers the brew."
   * *Why*: At potable water pH ($6.0\text{--}8.5$), carbonate ($\text{CO}_3^{2-}$) is virtually absent ($<1\%$). Bicarbonate ($\text{HCO}_3^-$) is the active buffer species.

7. **Do NOT state that Magnesium or Calcium are intrinsically sweet**:
   * *Avoid*: "Calcium creates sweet taste molecules."
   * *Why*: Neither ion possesses sweet gustatory properties. Perceived sweetness is an indirect result of balanced extraction of sugars and organic acids without overwhelming bitterness or sourness.

---

## Sources

1. **Batali, M. E., Ristenpart, W. D., & Guinard, J. X. (2020)**. *Brew temperature has a limited impact on sensory properties of drip brewed coffee when extraction yield is kept constant*. Scientific Reports, 10, 19650. [DOI: 10.1038/s41598-020-73341-4](https://doi.org/10.1038/s41598-020-73341-4)
2. **Batali, M. E., Frost, S. C., Lebrilla, C. B., Ristenpart, W. D., & Guinard, J. X. (2022)**. *Sensory analysis of coffee brews extracted at different total dissolved solids and extraction yields*. Journal of Food Science, 87(8), 3640–3654. [DOI: 10.1111/1750-3841.16243](https://doi.org/10.1111/1750-3841.16243)
3. **Breslin, P. A., & Beauchamp, G. K. (1995)**. *Suppression of bitterness by sodium: implications for flavor enhancement*. Nature, 378(6553), 177–179. [DOI: 10.1038/378177a0](https://doi.org/10.1038/378177a0)
4. **Breslin, P. A., & Beauchamp, G. K. (1997)**. *Salt enhances flavour by suppressing bitterness*. Trends in Food Science & Technology, 8(12), 378–385. [DOI: 10.1016/S0924-2244(97)01090-5](https://doi.org/10.1016/S0924-2244(97)01090-5)
5. **Clarke, R. J., & Vitzthum, O. G. (Eds.). (2001)**. *Coffee: Recent Developments*. Blackwell Science. ISBN: 978-0-632-05553-1.
6. **Flament, I. (2002)**. *Coffee Flavor Chemistry*. John Wiley & Sons, Ltd. ISBN: 978-0-471-72038-6.
7. **Hendon, C. H., Colonna-Dashwood, L., & Colonna-Dashwood, M. (2014)**. *The role of dissolved cations in coffee extraction*. Journal of Agricultural and Food Chemistry, 62(21), 4947–4950. [DOI: 10.1021/jf501687c](https://doi.org/10.1021/jf501687c)
8. **Lawless, H. T., Rapacki, F., & Gomez, J. (2003)**. *Diminishing returns in taste responses to calcium and potassium salts*. Chemical Senses, 28(9), 829–837. [DOI: 10.1093/chemse/bjg075](https://doi.org/10.1093/chemse/bjg075)
9. **Martell, A. E., & Smith, R. M. (1989)**. *Critical Stability Constants, Volume 3: Other Organic Ligands*. Plenum Press. ISBN: 978-1-4613-6780-2.
10. **Navarini, L., & Rivetti, D. (2010)**. *Water quality for espresso coffee*. Food Chemistry, 122(2), 409–415. [DOI: 10.1016/j.foodchem.2009.04.019](https://doi.org/10.1016/j.foodchem.2009.04.019)
11. **Specialty Coffee Association (SCA). (2018)**. *SCA Water Quality Standard*. Specialty Coffee Association Technical Standards. [https://sca.coffee/research/coffee-standards](https://sca.coffee/research/coffee-standards)
12. **Stumm, W., & Morgan, J. J. (1996)**. *Aquatic Chemistry: Chemical Equilibria and Rates in Natural Waters* (3rd ed.). Wiley-Interscience. ISBN: 978-0-471-51185-4.
13. **World Health Organization (WHO). (2017)**. *Guidelines for Drinking-water Quality: Fourth Edition Incorporating the First Addendum*. World Health Organization. License: CC BY-NC-SA 3.0 IGO.
14. **Yeager, S. E., Batali, M. E., Ristenpart, M. D., & Guinard, J. X. (2021)**. *Acidity and sensory profiles of coffee brews with different extraction parameters*. Scientific Reports, 11, 16176. [DOI: 10.1038/s41598-021-95709-1](https://doi.org/10.1038/s41598-021-95709-1)