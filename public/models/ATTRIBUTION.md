# Atribución del Modelo Anatómico 3D — Cráneo Humano

## Fuente Anatómica Original
- **Proyecto:** BodyParts3D (release 3.0)
- **Titular / Institución:** © The Database Center for Life Science (DBCLS)
- **Publicación científica:** Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. *BodyParts3D: 3D structure database for anatomical concepts.* Nucleic Acids Research. 2009;37(Database issue):D782–D785. DOI: `10.1093/nar/gkn613`.
- **Licencia:** Creative Commons Attribution-ShareAlike 2.1 Japan (CC BY-SA 2.1 JP)
  - https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en

## Adaptación y Segmentación
1. **OrganUI (`skeleton-3d`):** Soldado de vértices duplicados, simplificación geométrica con `meshoptimizer`, normalización al sistema de coordenadas Y-up, recálculo de normales suaves y etiquetado FMA (`Foundational Model of Anatomy`) mediante `glTF-Transform v4.5.0`.
2. **Dental Archive (`craneo-humano.glb`):** Extracción exclusiva de los 22 nodos óseos individuales del cráneo humano (neurocráneo y viscerocráneo), centrados en el origen y normalizados proporcionalmente en formato glTF 2.0 binario estándar (`.glb`), manteniendo los identificadores `structureId` y `fma` originales en `extras` para su selección individual.

## Estructuras Óseas Incluidas (22 mallas independientes)
- `frontal-bone` (FMA52734)
- `right-parietal-bone` (FMA52788), `left-parietal-bone` (FMA52789)
- `occipital-bone` (FMA52735)
- `right-temporal-bone` (FMA52738), `left-temporal-bone` (FMA52739)
- `sphenoid-bone` (FMA52736)
- `ethmoid-bone` (FMA52740)
- `right-nasal-bone` (FMA53647), `left-nasal-bone` (FMA53648)
- `right-lacrimal-bone` (FMA53645), `left-lacrimal-bone` (FMA53646)
- `right-zygomatic-bone` (FMA52892), `left-zygomatic-bone` (FMA52893)
- `right-maxilla` (FMA53649), `left-maxilla` (FMA53650)
- `right-palatine-bone` (FMA53655), `left-palatine-bone` (FMA53656)
- `right-inferior-nasal-concha` (FMA54737), `left-inferior-nasal-concha` (FMA54738)
- `vomer` (FMA9710)
- `mandible` (FMA52748)
