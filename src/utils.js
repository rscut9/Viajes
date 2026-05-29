import { geoContains } from "d3-geo";

export const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

export const continentesMap = {
  Europa: [
    "Albania", "Andorra", "Austria", "Bielorrusia", "Bélgica", "Bosnia y Herzegovina",
    "Bulgaria", "Croacia", "Chipre", "República Checa", "Dinamarca", "Estonia", "Finlandia",
    "Francia", "Alemania", "Grecia", "Hungría", "Islandia", "Irlanda", "Italia",
    "Kosovo", "Letonia", "Liechtenstein", "Lituania", "Luxemburgo", "Malta",
    "Moldavia", "Mónaco", "Montenegro", "Países Bajos", "Macedonia del Norte", "Noruega",
    "Polonia", "Portugal", "Rumanía", "Rusia", "San Marino", "Serbia", "Eslovaquia",
    "Eslovenia", "España", "Suecia", "Suiza", "Ucrania", "Reino Unido", "Ciudad del Vaticano"
  ],
  América: [
    "Antigua y Barbuda", "Argentina", "Bahamas", "Barbados", "Belice", "Bolivia",
    "Brasil", "Canadá", "Chile", "Colombia", "Costa Rica", "Cuba", "Dominica",
    "República Dominicana", "Ecuador", "El Salvador", "Granada", "Guatemala",
    "Guyana", "Haití", "Honduras", "Jamaica", "México", "Nicaragua", "Panamá",
    "Paraguay", "Perú", "San Cristóbal y Nieves", "Santa Lucía",
    "San Vicente y las Granadinas", "Surinam", "Trinidad y Tobago",
    "Estados Unidos", "Uruguay", "Venezuela"
  ],
  Asia: [
    "Afganistán", "Armenia", "Azerbaiyán", "Baréin", "Bangladés", "Bután",
    "Brunéi", "Camboya", "China", "Georgia", "India", "Indonesia", "Irán",
    "Irak", "Israel", "Japón", "Jordania", "Kazajistán", "Kuwait", "Kirguistán",
    "Laos", "Líbano", "Malasia", "Maldivas", "Mongolia", "Birmania", "Nepal",
    "Corea del Norte", "Omán", "Pakistán", "Filipinas", "Catar", "Arabia Saudita",
    "Singapur", "Corea del Sur", "Sri Lanka", "Siria", "Taiwán", "Tayikistán",
    "Tailandia", "Turquía", "Turkmenistán", "Emiratos Árabes Unidos", "Uzbekistán",
    "Vietnam", "Yemen"
  ],
  África: [
    "Argelia", "Angola", "Benín", "Botsuana", "Burkina Faso", "Burundi", "Camerún",
    "Cabo Verde", "República Centroafricana", "Chad", "Comoras", "Congo",
    "República Democrática del Congo", "Yibuti", "Egipto", "Guinea Ecuatorial",
    "Eritrea", "Esuatini", "Etiopía", "Gabón", "Gambia", "Ghana", "Guinea",
    "Guinea-Bisáu", "Costa de Marfil", "Kenia", "Lesoto", "Liberia", "Libia",
    "Madagascar", "Malaui", "Malí", "Mauritania", "Mauricio", "Marruecos",
    "Mozambique", "Namibia", "Níger", "Nigeria", "Ruanda", "Senegal", "Seychelles",
    "Sierra Leona", "Somalia", "Sudáfrica", "Sudán del Sur", "Sudán", "Tanzania",
    "Togo", "Túnez", "Uganda", "Zambia", "Zimbabue"
  ],
  Oceanía: [
    "Australia", "Fiyi", "Kiribati", "Islas Marshall", "Micronesia", "Nauru",
    "Nueva Zelanda", "Palaos", "Papúa Nueva Guinea", "Samoa", "Islas Salomón",
    "Tonga", "Tuvalu", "Vanuatu"
  ]
};

export const aliasPaises = {
  "luxembourg": "Luxemburgo",
  "spain": "España",
  "france": "Francia",
  "germany": "Alemania",
  "italy": "Italia",
  "united kingdom": "Reino Unido",
  "uk": "Reino Unido",
  "united states of america": "Estados Unidos",
  "united states": "Estados Unidos",
  "usa": "Estados Unidos",
  "belgium": "Bélgica",
  "netherlands": "Países Bajos",
  "switzerland": "Suiza",
  "sweden": "Suecia",
  "norway": "Noruega",
  "denmark": "Dinamarca",
  "finland": "Finlandia",
  "poland": "Polonia",
  "portugal": "Portugal",
  "ireland": "Irlanda",
  "russia": "Rusia",
  "greece": "Grecia",
  "turkey": "Turquía",
  "brazil": "Brasil",
  "mexico": "México",
  "canada": "Canadá",
  "argentina": "Argentina",
  "chile": "Chile",
  "colombia": "Colombia",
  "peru": "Perú",
  "venezuela": "Venezuela",
  "ecuador": "Ecuador",
  "bolivia": "Bolivia",
  "paraguay": "Paraguay",
  "uruguay": "Uruguay",
  "japan": "Japón",
  "china": "China",
  "india": "India",
  "south korea": "Corea del Sur",
  "north korea": "Corea del Norte",
  "egypt": "Egipto",
  "morocco": "Marruecos",
  "south africa": "Sudáfrica",
  "australia": "Australia",
  "new zealand": "Nueva Zelanda",
  "romania": "Rumanía",
  "belarus": "Bielorrusia",
  "ukraine": "Ucrania",
  "czechia": "República Checa",
  "czech republic": "República Checa",
  "slovakia": "Eslovaquia",
  "hungary": "Hungría",
  "austria": "Austria",
  "serbia": "Serbia",
  "croatia": "Croacia",
  "bosnia and herz.": "Bosnia y Herzegovina",
  "bosnia and herzegovina": "Bosnia y Herzegovina",
  "albania": "Albania",
  "macedonia": "Macedonia del Norte",
  "north macedonia": "Macedonia del Norte",
  "bulgaria": "Bulgaria",
  "cyprus": "Chipre",
  "iceland": "Islandia",
  "lithuania": "Lituania",
  "latvia": "Letonia",
  "estonia": "Estonia",
  "moldova": "Moldavia",
  "dominican rep.": "República Dominicana",
  "dominican republic": "República Dominicana",
  "côte d'ivoire": "Costa de Marfil",
  "ivory coast": "Costa de Marfil",
  "syria": "Siria",
  "iraq": "Irak",
  "iran": "Irán",
  "saudi arabia": "Arabia Saudita",
  "yemen": "Yemen",
  "oman": "Omán",
  "united arab emirates": "Emiratos Árabes Unidos",
  "afghanistan": "Afganistán",
  "pakistan": "Pakistán",
  "bangladesh": "Bangladés",
  "myanmar": "Birmania",
  "thailand": "Tailandia",
  "vietnam": "Vietnam",
  "malaysia": "Malasia",
  "indonesia": "Indonesia",
  "philippines": "Filipinas",
  "new caledonia": "Nueva Caledonia",
  "greenland": "Groenlandia",
  "andorra": "Andorra",
  "monaco": "Mónaco",
  "vatican": "Ciudad del Vaticano",
  "slovenia": "Eslovenia",
  "antigua and barbuda": "Antigua y Barbuda",
  "belize": "Belice",
  "grenada": "Granada",
  "haiti": "Haití",
  "panama": "Panamá",
  "saint kitts and nevis": "San Cristóbal y Nieves",
  "saint lucia": "Santa Lucía",
  "saint vincent and the grenadines": "San Vicente y las Granadinas",
  "suriname": "Surinam",
  "azerbaijan": "Azerbaiyán",
  "bahrain": "Baréin",
  "bhutan": "Bután",
  "brunei": "Brunéi",
  "cambodia": "Camboya",
  "jordan": "Jordania",
  "kazakhstan": "Kazajistán",
  "kyrgyzstan": "Kirguistán",
  "lebanon": "Líbano",
  "dem. rep. korea": "Corea del Norte",
  "qatar": "Catar",
  "singapore": "Singapur",
  "taiwan": "Taiwán",
  "tajikistan": "Tayikistán",
  "turkmenistan": "Turkmenistán",
  "uzbekistan": "Uzbekistán",
  "algeria": "Argelia",
  "benin": "Benín",
  "botswana": "Botsuana",
  "cameroon": "Camerún",
  "cape verde": "Cabo Verde",
  "central african republic": "República Centroafricana",
  "central african rep.": "República Centroafricana",
  "comoros": "Comoras",
  "democratic republic of the congo": "República Democrática del Congo",
  "dem. rep. congo": "República Democrática del Congo",
  "djibouti": "Yibuti",
  "equatorial guinea": "Guinea Ecuatorial",
  "eswatini": "Esuatini",
  "ethiopia": "Etiopía",
  "gabon": "Gabón",
  "kenya": "Kenia",
  "lesotho": "Lesoto",
  "libya": "Libia",
  "malawi": "Malaui",
  "mali": "Malí",
  "mauritius": "Mauricio",
  "niger": "Níger",
  "rwanda": "Ruanda",
  "seychelles": "Seychelles",
  "south sudan": "Sudán del Sur",
  "sudan": "Sudán",
  "tanzania": "Tanzania",
  "tunisia": "Túnez",
  "zimbabwe": "Zimbabue",
  "fiji": "Fiyi",
  "marshall islands": "Islas Marshall",
  "palau": "Palaos",
  "papua new guinea": "Papúa Nueva Guinea",
  "solomon islands": "Islas Salomón"
};

export const normalizarTexto = (texto = "") =>
  String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .trim()
    .toLowerCase();

export const obtenerNombrePaisCanonico = (nombrePais) => {
  if (!nombrePais) return "";
  const normalizado = normalizarTexto(nombrePais);
  
  if (aliasPaises[normalizado]) return aliasPaises[normalizado];

  for (const paises of Object.values(continentesMap)) {
    const encontrado = paises.find(
      (pais) => normalizarTexto(pais) === normalizado
    );
    if (encontrado) return encontrado;
  }
  return nombrePais;
};

export const obtenerContinente = (nombrePais) => {
  const nombreCanonico = obtenerNombrePaisCanonico(nombrePais);
  const normalizado = normalizarTexto(nombreCanonico);

  for (const [continente, paises] of Object.entries(continentesMap)) {
    const existe = paises.some(
      (pais) => normalizarTexto(pais) === normalizado
    );
    if (existe) return continente;
  }
  return "Otros";
};

export const obtenerNombrePaisDesdeGeo = (geo) =>
  geo?.properties?.name ||
  geo?.properties?.NAME ||
  geo?.properties?.admin ||
  geo?.name ||
  "";

export const obtenerIdPaisDesdeGeo = (geo) =>
  String(
    geo?.rsmKey ||
      geo?.id ||
      geo?.properties?.iso_a3 ||
      geo?.properties?.ISO_A3 ||
      geo?.properties?.name ||
      ""
  );

export const detectarPaisPorDireccion = (direccion = "") => {
  const direccionNormalizada = normalizarTexto(direccion);

  for (const paises of Object.values(continentesMap)) {
    for (const pais of paises) {
      const paisNormalizado = normalizarTexto(pais);
      if (direccionNormalizada.includes(paisNormalizado)) {
        return pais;
      }
    }
  }

  for (const [alias, paisCanonico] of Object.entries(aliasPaises)) {
    if (direccionNormalizada.includes(alias)) {
      return paisCanonico;
    }
  }
  return "";
};

export const detectarPaisPorCoordenadas = (punto, geografiasMapa) => {
  if (!Array.isArray(punto.coordenadas) || punto.coordenadas.length !== 2) {
    return "";
  }
  const geo = geografiasMapa.find((g) => {
    try {
      return geoContains(g, punto.coordenadas);
    } catch {
      return false;
    }
  });
  return geo ? obtenerNombrePaisDesdeGeo(geo) : "";
};

export const detectarNombrePaisPunto = (punto, geografiasMapa) => {
  const porNombre = obtenerNombrePaisCanonico(punto.nombrePais);
  if (porNombre && porNombre !== "Desconocido") return porNombre;

  const porDireccion = detectarPaisPorDireccion(punto.direccion);
  if (porDireccion) return porDireccion;

  const porCoordenadas = detectarPaisPorCoordenadas(punto, geografiasMapa);
  if (porCoordenadas) return obtenerNombrePaisCanonico(porCoordenadas);

  return "Desconocido";
};

export const comprimirImagen = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        let scaleSize = 1;
        if (img.width > MAX_WIDTH) {
          scaleSize = MAX_WIDTH / img.width;
        }
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataUrl);
      };
    };
  });
};