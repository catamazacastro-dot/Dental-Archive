export interface DriveEntry {
  id: string;
  title: string;
  isFolder: boolean;
  url: string;
  previewUrl: string;
  downloadUrl?: string;
}

export interface DriveLibraryRoot {
  id: string;
  shortName: string;
  title: string;
  subtitle: string;
  driveUrl: string;
  items: DriveEntry[];
}

const makeFolder = (id: string, title: string): DriveEntry => ({
  id,
  title,
  isFolder: true,
  url: `https://drive.google.com/drive/folders/${id}`,
  previewUrl: `https://drive.google.com/embeddedfolderview?id=${id}#list`,
});

const makeFile = (id: string, title: string): DriveEntry => ({
  id,
  title,
  isFolder: false,
  url: `https://drive.google.com/file/d/${id}/view`,
  previewUrl: `https://drive.google.com/file/d/${id}/preview`,
  downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`,
});

export const CURATED_DRIVE_LIBRARIES: DriveLibraryRoot[] = [
  {
    id: '1OiXCvHi_7cALIDY8KaUZHKc3qBRc76Fv',
    shortName: 'FOE Virtual',
    title: 'Biblioteca Virtual FOE',
    subtitle: '21 materias + Diccionario Mosby e Historia Clínica',
    driveUrl:
      'https://drive.google.com/drive/folders/1OiXCvHi_7cALIDY8KaUZHKc3qBRc76Fv?usp=drive_link',
    items: [
      makeFolder('1MgrnGDADc6s6R96VFPmLilm7W0IcXGxL', 'Anatomia'),
      makeFolder('17OMZDq-5hLKzEbJZ1M-gG0SWK_Helcmo', 'Biofisica'),
      makeFolder('1ADpTwSNXt8F7_E2Iz7vSO04bPjL1AxI2', 'Biologia'),
      makeFolder('1q28TtS1Dlfzl9qmuC_r7jJUt1hMH3kSg', 'Biomateriales Dentales'),
      makeFolder('1uRE9CG-itxub_FOXCFnYULJy-Szufziy', 'Bioquimica'),
      makeFolder('171k44XnE12smb6NbpM5KNdb5HWjiM3Nj', 'Bioética'),
      makeFolder('1PsMM3X6vnvwwYdBCG2gavoLIMnt4U_Js', 'Cirugía'),
      makeFolder('1-SwH3axYbuewnJ9UwcizMbuNMMHBtBCE', 'Diagnóstico por Imágenes'),
      makeFolder(
        '1cLyaJitBjvWaURzmxROVoEY0CRkbJnQO',
        'Dimensión Psicológica de la Atención Odontológica'
      ),
      makeFolder('1tIalJWKMd6Q-qf8echT_Xq3iSHbF29wh', 'Endodoncia'),
      makeFolder('1oVgmPqQJi-Jc7z_wajcq5I1bQJi3I94a', 'Farmacología y Terapéutica'),
      makeFolder('1ll0U9S_jq3bM0WxIf68qHw1itltdhr7j', 'Fisiologia'),
      makeFolder('1TE56vW1TbfsaKGd08YO7r31Vo8pCUVlm', 'Histologia'),
      makeFolder('1i8nH6HG58WfSMUSqw6ebfBoVTz14ujOd', 'Microbiologia'),
      makeFolder('10VdmzhnjIXnhzV45Ct-WjEEMS0EB-0Lm', 'Odontología Integral Niños'),
      makeFolder('16SP-UjAGSgftb-0ZXDzYImAfVlDam1HN', 'Odontología Legal y Forense'),
      makeFolder('1U3-mIKP-h9SKdV1Gms4mPhc10SsnqyZw', 'Operatoria Dental'),
      makeFolder('1PohjiV6o70Lw5Ft5deEVjcK76sJMU1xG', 'OPS'),
      makeFolder(
        '1UeNO9YDFuWo3m3f7Dai2oTM5cza0vGOh',
        'Patología y Clínica Estomatológica'
      ),
      makeFolder('1MIbyFadMli1DuXqIXIWLa3fEp8oqZ-_Z', 'Periodoncia'),
      makeFolder('1ouS_Pj9iTqqXhTNkwUPItqHOtONksTok', 'Prótesis'),
      makeFile(
        '1Jk4lhE9g3ShqAotj8Aux1oEpzI4Tn6HV',
        'Foe-Diccionario de Odontología Mosby - (2° Edición).PDF'
      ),
      makeFile(
        '1rP6y0ZK87STwzmxsklnNzNFzmcDH_7at',
        'Foe-HISTORIA CLINICA EN ODONTOLOGIA.pdf'
      ),
    ],
  },
  {
    id: '1rAczoFtXLD3bP-ZaGT77JdgWAKOfs8lc',
    shortName: 'MOI Virtual',
    title: 'MOI Biblioteca Virtual',
    subtitle: '23 carpetas organizadas por cátedra y área clínica',
    driveUrl:
      'https://drive.google.com/drive/folders/1rAczoFtXLD3bP-ZaGT77JdgWAKOfs8lc?usp=drive_link',
    items: [
      makeFolder('1tHrVOqnp7Pwd121SFry4UEZutSwDQJJG', 'Anatomía'),
      makeFolder('17Qdmb8cgrtuynyZBO-jH5A_ogLvSk4G0', 'Biofisica'),
      makeFolder('1rlfcjq3Sf5q_zQ99HI_Uv4BVxysEkQV3', 'Biologia'),
      makeFolder('199y4MQPd0gpzX1kaNHF6BC_p-1XDsB3x', 'Biomateriales Dentales'),
      makeFolder('1D-CDOFLTbA3ieumdvEw_Z5jQp7xTMkFT', 'Bioquimica'),
      makeFolder('1daQbgvc-b0CF5g9LlneMoIG2yd7NTNod', 'Bioética'),
      makeFolder('1dgpZwBhrt9rFbQ6Xb5XHubBpAWiDXf8o', 'CEFALOMETRIA NIÑOS B'),
      makeFolder('1v6D6N0cELfums_ihL492AJwUa3VZu1_-', 'Cirugía'),
      makeFolder('1LGlDe_3BUiY7aptZmFhdVj0dVprG_mYg', 'Diagnostico por imagenes'),
      makeFolder(
        '1yCMMuYYE-aW7dI-6tvjiAIKYfTTMg8C4',
        'Dimensión Psicológica de la Atencion Odontologica'
      ),
      makeFolder('19gboMn492kdn42Ps-bRQToH4G04P5gfZ', 'Endodoncia'),
      makeFolder('1UiOFnGKJTCtuyI14c6AC1MHmDAEjd12F', 'Farmacologia y Terapéutica'),
      makeFolder('1rHvXaYoydtb-xiLRTKy6ny6xPG5a3HHG', 'Fisiologia'),
      makeFolder('1UQyMYGbYmDkwTfgb_uDVEWGLSsECTylJ', 'Histologia'),
      makeFolder('1fyCH7pz2yxJ5kgeGjilbUilj2wrAnXKZ', 'Introduccion a la Odontología'),
      makeFolder('1Noo1Tln-gBq1288B9v-_Yu_AP73FppZd', 'Microbiologia'),
      makeFolder('16Gu0w5W2psoIU2uTjxjMA7UDWzyFvhPN', 'Odontologia Legal y Forense'),
      makeFolder('1Vag_JD2ZrqCNMo_CjwbTdN6NciKSc_Pi', 'Odontologia Preventiva y Social'),
      makeFolder('1o-LQAQCs66OYQKsAUIvQREJuG_FbdyVi', 'Odontología Integral Niños'),
      makeFolder('1oWIgl13hVU6o6HOTFOdYqAiD1UinlOcU', 'Operatoria Dental'),
      makeFolder(
        '1I9OjgnwY7yioGJRfVF1wG6HKcVo_05VG',
        'Patologia y Clinica Estomatólogica'
      ),
      makeFolder('1XdUf_3xc_zEMHGKYsMzzrtiWXdqIIALE', 'Periodoncia'),
      makeFolder('1g_w7FR04xAHZckJSeAcBEMlsOT0MA0aN', 'Protesis'),
    ],
  },
];
