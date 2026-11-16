# Atribución de Modelos 3D Dentarios (Dentición Permanente FDI 11–48)

## Fuente Anatómica Original
- **Base geométrica externa (piezas dentarias y maxilares):** **BodyParts3D**, © The Database Center for Life Science (DBCLS), publicado bajo licencia **Creative Commons Attribution-ShareAlike 2.1 Japan (CC BY-SA 2.1 JP)** (`https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en`).
  - Publicación: Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. *BodyParts3D: 3D structure database for anatomical concepts.* Nucleic Acids Research. 2009;37(Database issue):D782–D785. DOI: `10.1093/nar/gkn613`.
- **Segmentación interna por capas y terceros molares:** **Dental Scope** (`Yoosseph/dental-scope`), derivado de BodyParts3D bajo **CC BY-SA 2.1 Japan** / **CC BY-SA 4.0** (`https://creativecommons.org/licenses/by-sa/4.0/`).
  - Capas anatómicas incluidas por pieza (`tooth-11.glb` a `tooth-48.glb`): esmalte (`enamel`), dentina coronaria (`dentin-coronal`), dentina radicular (`dentin-radicular`), cemento (`cementum`), ligamento periodontal (`pdl`), cámara pulpar (`pulp-chamber`) y conductos radiculares (`canal-*`), además de marcos anatómicos locales (`axis`, `buccal`, `mesial`) y reparos (`cervical-line`, `apex`, `apical-foramen-*`).
  - Los terceros molares (`18, 28, 38, 48`) y las capas pulpares/radiculares internas proceden del modelado anatómico derivado de Dental Scope y se distribuyen bajo los mismos términos Share-Alike.

## Referencias de Datos Anatómicos y Endodónticos
- Figún ME, Garino RR. *Anatomía Odontológica Funcional y Aplicada.* 2ª ed. Buenos Aires: El Ateneo.
- Nelson SJ. *Wheeler's Dental Anatomy, Physiology, and Occlusion.* 11ª ed. Elsevier.
- Vertucci FJ. Root canal anatomy of the human permanent teeth. *Oral Surg Oral Med Oral Pathol.* 1984;58(5):589–599.
- Monsarrat P, et al. Interrelationships in the variability of root canal anatomy among the permanent teeth: a full-mouth approach by cone-beam CT. *PLOS ONE.* 2016;11(10):e0165329 (CC BY).
- Al-Qudah AA, et al. Root and canal morphology of third molars in a Jordanian subpopulation. *Scientific Reports.* 2023 (CC BY 4.0).

## Recurso Faltante (Dentición Temporaria FDI 51–85)
- Ni BodyParts3D ni Dental Scope incluyen mallas 3D segmentadas de dientes deciduos/temporarios. Para visualizar piezas temporarias en 3D con selección interna por capas es necesario incorporar archivos `.glb` o `.gltf` propios o de un atlas abierto compatible con mallas nombradas independientemente (`enamel`, `dentin`, `cementum`, `pulp-chamber`, `canal-*`).
