import React, { useState, useEffect, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker
} from "react-simple-maps";
import { geoCentroid, geoArea, geoContains } from "d3-geo";
import { feature } from "topojson-client";
import {
  collection,
  addDoc,
  query,
  onSnapshot
} from "firebase/firestore";
import { db } from "./firebase";

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

const continentesMap = {
  Europa: [
    "Albania",
    "Andorra",
    "Austria",
    "Belarus",
    "Belgium",
    "Bosnia and Herzegovina",
    "Bulgaria",
    "Croatia",
    "Cyprus",
    "Czechia",
    "Denmark",
    "Estonia",
    "Finland",
    "France",
    "Germany",
    "Greece",
    "Hungary",
    "Iceland",
    "Ireland",
    "Italy",
    "Kosovo",
    "Latvia",
    "Liechtenstein",
    "Lithuania",
    "Luxembourg",
    "Malta",
    "Moldova",
    "Monaco",
    "Montenegro",
    "Netherlands",
    "North Macedonia",
    "Norway",
    "Poland",
    "Portugal",
    "Romania",
    "Russia",
    "San Marino",
    "Serbia",
    "Slovakia",
    "Slovenia",
    "Spain",
    "Sweden",
    "Switzerland",
    "Ukraine",
    "United Kingdom",
    "Vatican"
  ],
  América: [
    "Antigua and Barbuda",
    "Argentina",
    "Bahamas",
    "Barbados",
    "Belize",
    "Bolivia",
    "Brazil",
    "Canada",
    "Chile",
    "Colombia",
    "Costa Rica",
    "Cuba",
    "Dominica",
    "Dominican Republic",
    "Ecuador",
    "El Salvador",
    "Grenada",
    "Guatemala",
    "Guyana",
    "Haiti",
    "Honduras",
    "Jamaica",
    "Mexico",
    "Nicaragua",
    "Panama",
    "Paraguay",
    "Peru",
    "Saint Kitts and Nevis",
    "Saint Lucia",
    "Saint Vincent and the Grenadines",
    "Suriname",
    "Trinidad and Tobago",
    "United States of America",
    "Uruguay",
    "Venezuela"
  ],
  Asia: [
    "Afghanistan",
    "Armenia",
    "Azerbaijan",
    "Bahrain",
    "Bangladesh",
    "Bhutan",
    "Brunei",
    "Cambodia",
    "China",
    "Georgia",
    "India",
    "Indonesia",
    "Iran",
    "Iraq",
    "Israel",
    "Japan",
    "Jordan",
    "Kazakhstan",
    "Kuwait",
    "Kyrgyzstan",
    "Laos",
    "Lebanon",
    "Malaysia",
    "Maldives",
    "Mongolia",
    "Myanmar",
    "Nepal",
    "North Korea",
    "Oman",
    "Pakistan",
    "Philippines",
    "Qatar",
    "Saudi Arabia",
    "Singapore",
    "South Korea",
    "Sri Lanka",
    "Syria",
    "Taiwan",
    "Tajikistan",
    "Thailand",
    "Turkey",
    "Turkmenistan",
    "United Arab Emirates",
    "Uzbekistan",
    "Vietnam",
    "Yemen"
  ],
  África: [
    "Algeria",
    "Angola",
    "Benin",
    "Botswana",
    "Burkina Faso",
    "Burundi",
    "Cameroon",
    "Cape Verde",
    "Central African Republic",
    "Chad",
    "Comoros",
    "Congo",
    "Democratic Republic of the Congo",
    "Djibouti",
    "Egypt",
    "Equatorial Guinea",
    "Eritrea",
    "Eswatini",
    "Ethiopia",
    "Gabon",
    "Gambia",
    "Ghana",
    "Guinea",
    "Guinea-Bissau",
    "Ivory Coast",
    "Kenya",
    "Lesotho",
    "Liberia",
    "Libya",
    "Madagascar",
    "Malawi",
    "Mali",
    "Mauritania",
    "Mauritius",
    "Morocco",
    "Mozambique",
    "Namibia",
    "Niger",
    "Nigeria",
    "Rwanda",
    "Senegal",
    "Seychelles",
    "Sierra Leone",
    "Somalia",
    "South Africa",
    "South Sudan",
    "Sudan",
    "Tanzania",
    "Togo",
    "Tunisia",
    "Uganda",
    "Zambia",
    "Zimbabwe"
  ],
  Oceanía: [
    "Australia",
    "Fiji",
    "Kiribati",
    "Marshall Islands",
    "Micronesia",
    "Nauru",
    "New Zealand",
    "Palau",
    "Papua New Guinea",
    "Samoa",
    "Solomon Islands",
    "Tonga",
    "Tuvalu",
    "Vanuatu"
  ]
};

const normalizarTexto = (texto = "") =>
  String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .trim()
    .toLowerCase();

const aliasPaises = {
  portugal: "Portugal",
  "republica portuguesa": "Portugal",
  "portuguese republic": "Portugal",

  espana: "Spain",
  españa: "Spain",
  spain: "Spain",

  francia: "France",
  france: "France",

  alemania: "Germany",
  germany: "Germany",

  italia: "Italy",
  italy: "Italy",

  "reino unido": "United Kingdom",
  "united kingdom": "United Kingdom",

  "estados unidos": "United States of America",
  "united states": "United States of America",
  "united states of america": "United States of America",

  "republica dominicana": "Dominican Republic",
  "dominican republic": "Dominican Republic",
  "dominican rep": "Dominican Republic"
};

const obtenerNombrePaisCanonico = (nombrePais) => {
  if (!nombrePais) return "";

  const normalizado = normalizarTexto(nombrePais);

  if (aliasPaises[normalizado]) {
    return aliasPaises[normalizado];
  }

  for (const paises of Object.values(continentesMap)) {
    const encontrado = paises.find(
      (pais) => normalizarTexto(pais) === normalizado
    );

    if (encontrado) {
      return encontrado;
    }
  }

  return nombrePais;
};

const obtenerContinente = (nombrePais) => {
  const nombreCanonico = obtenerNombrePaisCanonico(nombrePais);
  const normalizado = normalizarTexto(nombreCanonico);

  for (const [continente, paises] of Object.entries(continentesMap)) {
    const existe = paises.some(
      (pais) => normalizarTexto(pais) === normalizado
    );

    if (existe) {
      return continente;
    }
  }

  return "Otros";
};

const obtenerNombrePaisDesdeGeo = (geo) =>
  geo?.properties?.name ||
  geo?.properties?.NAME ||
  geo?.properties?.admin ||
  geo?.name ||
  "";

const obtenerIdPaisDesdeGeo = (geo) =>
  String(
    geo?.rsmKey ||
      geo?.id ||
      geo?.properties?.iso_a3 ||
      geo?.properties?.ISO_A3 ||
      geo?.properties?.name ||
      ""
  );

const detectarPaisPorDireccion = (direccion = "") => {
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

const detectarPaisPorCoordenadas = (punto, geografiasMapa) => {
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

const detectarNombrePaisPunto = (punto, geografiasMapa) => {
  const porNombre = obtenerNombrePaisCanonico(punto.nombrePais);

  if (porNombre && porNombre !== "Desconocido") {
    return porNombre;
  }

  const porDireccion = detectarPaisPorDireccion(punto.direccion);

  if (porDireccion) {
    return porDireccion;
  }

  const porCoordenadas = detectarPaisPorCoordenadas(punto, geografiasMapa);

  if (porCoordenadas) {
    return obtenerNombrePaisCanonico(porCoordenadas);
  }

  return "Desconocido";
};

export default function MapChart() {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 });

  const [puntos, setPuntos] = useState([]);
  const [puntosGlobales, setPuntosGlobales] = useState([]);
  const [geografiasMapa, setGeografiasMapa] = useState([]);

  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  const [vistaSidebar, setVistaSidebar] = useState("menu");
  const [continenteExpandido, setContinenteExpandido] = useState(null);
  const [paisExpandido, setPaisExpandido] = useState(null);

  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [foto, setFoto] = useState("");
  const [comentarios, setComentarios] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(true);

  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetch(geoUrl)
      .then((res) => res.json())
      .then((topology) => {
        const features = feature(
          topology,
          topology.objects.countries
        ).features.map((geo) => ({
          ...geo,
          rsmKey: obtenerIdPaisDesdeGeo(geo)
        }));

        setGeografiasMapa(features);
      })
      .catch((error) => {
        console.error("Error cargando geografías:", error);
      });

    const q = query(collection(db, "puntos_interes"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log("PUNTOS FIRESTORE:", data);

      setPuntosGlobales(data);
    });

    return () => unsubscribe();
  }, []);

  const coincideConPais = (punto, geoPais) => {
    if (!punto || !geoPais) return false;

    const nombrePaisPunto = detectarNombrePaisPunto(punto, geografiasMapa);
    const nombrePaisGeo = obtenerNombrePaisCanonico(
      obtenerNombrePaisDesdeGeo(geoPais)
    );

    if (
      nombrePaisPunto &&
      nombrePaisGeo &&
      normalizarTexto(nombrePaisPunto) === normalizarTexto(nombrePaisGeo)
    ) {
      return true;
    }

    if (Array.isArray(punto.coordenadas) && punto.coordenadas.length === 2) {
      try {
        return geoContains(geoPais, punto.coordenadas);
      } catch {
        return false;
      }
    }

    return false;
  };

  const cargarPuntosPais = (geoPais) => {
    const puntosPais = puntosGlobales
      .map((punto) => {
        const nombrePaisDetectado = detectarNombrePaisPunto(
          punto,
          geografiasMapa
        );

        return {
          ...punto,
          nombrePais: nombrePaisDetectado,
          continente: obtenerContinente(nombrePaisDetectado)
        };
      })
      .filter((punto) => coincideConPais(punto, geoPais));

    setPuntos(puntosPais);
  };

  useEffect(() => {
    if (selectedCountry && geografiasMapa.length > 0) {
      cargarPuntosPais(selectedCountry);
    }
  }, [puntosGlobales, selectedCountry, geografiasMapa]);

  const handleCountryClick = (geo) => {
    const centroid = geoCentroid(geo);
    const area = geoArea(geo);
    const calculatedZoom = Math.max(2, Math.min(30, 0.8 / Math.sqrt(area)));

    const geoFormat = {
      ...geo,
      rsmKey: obtenerIdPaisDesdeGeo(geo)
    };

    setSelectedCountry(geoFormat);
    setPosition({ coordinates: centroid, zoom: calculatedZoom });
    cargarPuntosPais(geoFormat);
    setPanelAbierto(true);
  };

  const handleBack = () => {
    setSelectedCountry(null);
    setPosition({ coordinates: [0, 0], zoom: 1 });
    setPuntos([]);
    setMostrarFormulario(false);
    setPanelAbierto(true);
    setTooltipContent("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nombre || !direccion || !selectedCountry) return;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        direccion
      )}`
    );

    const data = await res.json();

    if (data.length === 0) {
      alert("No se pudo encontrar la ubicación de esa dirección en el mapa.");
      return;
    }

    const coordenadas = [parseFloat(data[0].lon), parseFloat(data[0].lat)];

    const nombrePais =
      detectarPaisPorDireccion(direccion) ||
      obtenerNombrePaisCanonico(obtenerNombrePaisDesdeGeo(selectedCountry));

    const continente = obtenerContinente(nombrePais);

    const nuevoPunto = {
      paisId: obtenerIdPaisDesdeGeo(selectedCountry),
      nombrePais,
      continente,
      nombre,
      direccion,
      foto,
      descripcion: comentarios,
      coordenadas
    };

    await addDoc(collection(db, "puntos_interes"), nuevoPunto);

    setPuntos((prev) => [...prev, nuevoPunto]);

    setNombre("");
    setDireccion("");
    setFoto("");
    setComentarios("");

    const inputFoto = document.getElementById("inputFoto");
    if (inputFoto) inputFoto.value = "";

    setMostrarFormulario(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setFoto(reader.result);
      };

      reader.readAsDataURL(file);
    }
  };

  const handleMarkerClick = (index) => {
    setPanelAbierto(true);

    setTimeout(() => {
      const elemento = document.getElementById(`punto-${index}`);

      if (elemento) {
        elemento.scrollIntoView({ behavior: "smooth", block: "center" });
        elemento.style.backgroundColor = "#fff9c4";

        setTimeout(() => {
          elemento.style.backgroundColor = "#fff";
        }, 1500);
      }
    }, 100);
  };

  const navegarAPunto = (punto) => {
    const nombrePaisPunto = detectarNombrePaisPunto(punto, geografiasMapa);

    const geoPais = geografiasMapa.find((geo) => {
      const nombrePaisGeo = obtenerNombrePaisCanonico(
        obtenerNombrePaisDesdeGeo(geo)
      );

      if (
        normalizarTexto(nombrePaisPunto) === normalizarTexto(nombrePaisGeo)
      ) {
        return true;
      }

      if (Array.isArray(punto.coordenadas) && punto.coordenadas.length === 2) {
        try {
          return geoContains(geo, punto.coordenadas);
        } catch {
          return false;
        }
      }

      return false;
    });

    if (geoPais) {
      const centroid = geoCentroid(geoPais);
      const area = geoArea(geoPais);
      const calculatedZoom = Math.max(2, Math.min(30, 0.8 / Math.sqrt(area)));

      const geoFormat = {
        ...geoPais,
        rsmKey: obtenerIdPaisDesdeGeo(geoPais)
      };

      setSelectedCountry(geoFormat);
      setPosition({ coordinates: centroid, zoom: calculatedZoom });
      cargarPuntosPais(geoFormat);
      setPanelAbierto(true);
      setSidebarAbierta(false);

      setTimeout(() => {
        const puntosPais = puntosGlobales.filter((p) =>
          coincideConPais(p, geoFormat)
        );

        const idx = puntosPais.findIndex((p) => p.id === punto.id);

        if (idx !== -1) {
          handleMarkerClick(idx);
        }
      }, 800);
    }
  };

  const puntosAgrupados = useMemo(() => {
    const agrupados = {};

    for (const [continente, paises] of Object.entries(continentesMap)) {
      agrupados[continente] = {};

      paises.forEach((pais) => {
        agrupados[continente][pais] = [];
      });
    }

    agrupados.Otros = {};

    puntosGlobales.forEach((punto) => {
      const nombrePaisDetectado = detectarNombrePaisPunto(
        punto,
        geografiasMapa
      );

      const nombrePaisCanonico = obtenerNombrePaisCanonico(
        nombrePaisDetectado
      );

      const continente = obtenerContinente(nombrePaisCanonico);

      const puntoNormalizado = {
        ...punto,
        nombrePais: nombrePaisCanonico,
        continente
      };

      if (!agrupados[continente]) {
        agrupados[continente] = {};
      }

      if (!agrupados[continente][nombrePaisCanonico]) {
        agrupados[continente][nombrePaisCanonico] = [];
      }

      agrupados[continente][nombrePaisCanonico].push(puntoNormalizado);
    });

    return agrupados;
  }, [puntosGlobales, geografiasMapa]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#002f5c",
        overflow: "hidden",
        display: "flex",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          left: sidebarAbierta ? 0 : "-350px",
          width: "350px",
          height: "100vh",
          backgroundColor: "#ECEFF1",
          boxShadow: "2px 0 10px rgba(0,0,0,0.5)",
          transition: "left 0.4s ease-in-out",
          zIndex: 50,
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          style={{
            padding: "20px",
            backgroundColor: "#002f5c",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <h2 style={{ margin: 0 }}>Menú</h2>

          <button
            onClick={() => setSidebarAbierta(false)}
            style={{
              background: "none",
              border: "none",
              color: "white",
              fontSize: "20px",
              cursor: "pointer"
            }}
          >
            ✖
          </button>
        </div>

        <div style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
          {vistaSidebar === "menu" ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px"
              }}
            >
              <button
                onClick={() => {
                  setSidebarAbierta(false);
                  handleBack();
                }}
                style={{
                  padding: "15px",
                  textAlign: "left",
                  fontSize: "16px",
                  backgroundColor: "white",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                  cursor: "pointer"
                }}
              >
                🗺️ Mapamundi principal
              </button>

              <button
                onClick={() => setVistaSidebar("puntos")}
                style={{
                  padding: "15px",
                  textAlign: "left",
                  fontSize: "16px",
                  backgroundColor: "white",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                  cursor: "pointer"
                }}
              >
                📍 Puntos de Interés
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setVistaSidebar("menu")}
                style={{
                  marginBottom: "20px",
                  padding: "8px 15px",
                  cursor: "pointer",
                  border: "none",
                  backgroundColor: "#FF5722",
                  color: "white",
                  borderRadius: "5px"
                }}
              >
                ⬅ Volver al menú
              </button>

              <h3 style={{ marginTop: 0 }}>Mis Puntos de Interés</h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }}
              >
                {Object.keys(puntosAgrupados).map((continente) => {
                  const paisesDelContinente = puntosAgrupados[continente];
                  const totalPuntos = Object.values(
                    paisesDelContinente
                  ).flat().length;
                  const isExpanded = continenteExpandido === continente;

                  return (
                    <div
                      key={continente}
                      style={{
                        backgroundColor: "white",
                        border: "1px solid #ccc",
                        borderRadius: "5px",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        onClick={() =>
                          setContinenteExpandido(
                            isExpanded ? null : continente
                          )
                        }
                        style={{
                          padding: "15px",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          backgroundColor: isExpanded ? "#e0e0e0" : "white",
                          fontWeight: "bold"
                        }}
                      >
                        <span>{continente}</span>
                        <span>{totalPuntos}</span>
                      </div>

                      {isExpanded && (
                        <div
                          style={{
                            borderTop: "1px solid #eee",
                            backgroundColor: "#f9f9f9"
                          }}
                        >
                          {Object.keys(paisesDelContinente)
                            .sort((a, b) => a.localeCompare(b))
                            .map((pais) => {
                              const puntosDelPais =
                                paisesDelContinente[pais] || [];
                              const isPaisExpanded = paisExpandido === pais;

                              return (
                                <div key={pais}>
                                  <div
                                    onClick={() =>
                                      setPaisExpandido(
                                        isPaisExpanded ? null : pais
                                      )
                                    }
                                    style={{
                                      padding: "10px 15px 10px 30px",
                                      cursor: "pointer",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      borderBottom: "1px solid #eee",
                                      color:
                                        puntosDelPais.length > 0
                                          ? "#333"
                                          : "#999"
                                    }}
                                  >
                                    <span>{pais}</span>
                                    <span>{puntosDelPais.length}</span>
                                  </div>

                                  {isPaisExpanded && (
                                    <div style={{ backgroundColor: "#fff" }}>
                                      {puntosDelPais.length === 0 ? (
                                        <div
                                          style={{
                                            padding: "10px 15px 10px 50px",
                                            fontSize: "12px",
                                            color: "#888",
                                            borderBottom: "1px solid #f0f0f0"
                                          }}
                                        >
                                          Sin puntos de interés
                                        </div>
                                      ) : (
                                        puntosDelPais.map((punto, idx) => (
                                          <div
                                            key={idx}
                                            onClick={() =>
                                              navegarAPunto(punto)
                                            }
                                            style={{
                                              padding:
                                                "10px 15px 10px 50px",
                                              borderBottom:
                                                "1px solid #f0f0f0",
                                              cursor: "pointer",
                                              transition:
                                                "background-color 0.2s"
                                            }}
                                            onMouseEnter={(e) =>
                                              (e.currentTarget.style.backgroundColor =
                                                "#f0f8ff")
                                            }
                                            onMouseLeave={(e) =>
                                              (e.currentTarget.style.backgroundColor =
                                                "transparent")
                                            }
                                          >
                                            <h5
                                              style={{
                                                margin: "0 0 5px 0",
                                                color: "#002f5c"
                                              }}
                                            >
                                              {punto.nombre}
                                            </h5>

                                            <p
                                              style={{
                                                margin: 0,
                                                fontSize: "12px",
                                                color: "#666"
                                              }}
                                            >
                                              {punto.direccion}
                                            </p>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {!sidebarAbierta && (
        <button
          onClick={() => setSidebarAbierta(true)}
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            padding: "12px",
            cursor: "pointer",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            color: "#002f5c",
            border: "none",
            borderRadius: "5px",
            zIndex: 40,
            fontWeight: "bold",
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
          }}
        >
          ☰ Menú
        </button>
      )}

      <div
        style={{
          flex: 1,
          marginLeft: sidebarAbierta ? "350px" : "0",
          transition: "margin-left 0.4s ease-in-out",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: selectedCountry ? "flex-start" : "center",
          width: "100%",
          position: "relative"
        }}
      >
        {selectedCountry && (
          <button
            onClick={handleBack}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              padding: "10px 20px",
              cursor: "pointer",
              backgroundColor: "#FF5722",
              color: "white",
              border: "none",
              borderRadius: "5px",
              zIndex: 10
            }}
          >
            Volver al mundo
          </button>
        )}

        {tooltipContent && (
          <div
            style={{
              position: "fixed",
              top: tooltipPos.y - 40,
              left: tooltipPos.x,
              transform: "translateX(-50%)",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              color: "white",
              padding: "8px 12px",
              borderRadius: "6px",
              pointerEvents: "none",
              fontSize: "14px",
              fontWeight: "bold",
              zIndex: 100,
              whiteSpace: "nowrap",
              boxShadow: "0px 4px 6px rgba(0,0,0,0.3)"
            }}
          >
            {tooltipContent}

            <div
              style={{
                position: "absolute",
                bottom: "-6px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "0",
                height: "0",
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "6px solid rgba(0, 0, 0, 0.8)"
              }}
            />
          </div>
        )}

        <div
          style={{
            width: "100%",
            height: selectedCountry
              ? panelAbierto
                ? "45vh"
                : "85vh"
              : "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            transition: "height 0.8s ease-in-out"
          }}
        >
          <ComposableMap style={{ width: "100%", height: "100%" }}>
            <ZoomableGroup
              zoom={position.zoom}
              center={position.coordinates}
              maxZoom={50}
              onMoveEnd={(pos) => setPosition(pos)}
              style={{ transition: "transform 0.8s ease-in-out" }}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const geoKey = obtenerIdPaisDesdeGeo(geo);
                    const selectedKey = selectedCountry
                      ? obtenerIdPaisDesdeGeo(selectedCountry)
                      : "";

                    const isSelected = selectedKey === geoKey;

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => handleCountryClick(geo)}
                        style={{
                          default: {
                            fill: isSelected ? "#FFC107" : "#7a9cc6",
                            outline: "none",
                            transition: "fill 0.3s"
                          },
                          hover: {
                            fill: "#FF5722",
                            outline: "none",
                            cursor: "pointer"
                          },
                          pressed: {
                            fill: "#E64A19",
                            outline: "none"
                          }
                        }}
                      />
                    );
                  })
                }
              </Geographies>

              {puntos.map((punto, index) => (
                <Marker key={index} coordinates={punto.coordenadas}>
                  <circle
                    r={4 / position.zoom}
                    fill="#FF5722"
                    stroke="#fff"
                    strokeWidth={1 / position.zoom}
                    style={{
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onClick={() => handleMarkerClick(index)}
                    onMouseEnter={(e) => {
                      setTooltipContent(punto.nombre);
                      setTooltipPos({
                        x: e.clientX,
                        y: e.clientY
                      });
                    }}
                    onMouseLeave={() => setTooltipContent("")}
                    onMouseMove={(e) =>
                      setTooltipPos({
                        x: e.clientX,
                        y: e.clientY
                      })
                    }
                  />
                </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>
        </div>

        {selectedCountry && (
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              backgroundColor: "#ECEFF1",
              color: "black",
              padding: "20px",
              borderRadius: "10px",
              boxSizing: "border-box",
              zIndex: 10,
              marginTop: "10px",
              animation: "fadeIn 0.8s ease-in-out"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <h2 style={{ margin: 0 }}>
                {obtenerNombrePaisCanonico(
                  obtenerNombrePaisDesdeGeo(selectedCountry)
                )}
              </h2>

              <button
                onClick={() => setPanelAbierto(!panelAbierto)}
                style={{
                  padding: "8px 15px",
                  backgroundColor: "#002f5c",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer"
                }}
              >
                {panelAbierto ? "Ocultar panel ▲" : "Mostrar panel ▼"}
              </button>
            </div>

            {panelAbierto && (
              <div
                style={{
                  marginTop: "15px",
                  overflowY: "auto",
                  maxHeight: "40vh",
                  paddingRight: "5px"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "15px"
                  }}
                >
                  <h3 style={{ margin: 0 }}>Puntos de Interés</h3>

                  {!mostrarFormulario && (
                    <button
                      onClick={() => setMostrarFormulario(true)}
                      style={{
                        padding: "8px 15px",
                        backgroundColor: "#2ecc71",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontWeight: "bold"
                      }}
                    >
                      + Añadir punto
                    </button>
                  )}
                </div>

                {puntos.length === 0 ? (
                  <p>No hay puntos de interés.</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {puntos.map((punto, index) => (
                      <li
                        id={`punto-${index}`}
                        key={index}
                        style={{
                          backgroundColor: "#fff",
                          padding: "15px",
                          marginBottom: "10px",
                          borderRadius: "5px",
                          transition: "background-color 0.5s"
                        }}
                      >
                        <h4 style={{ margin: "0 0 5px 0" }}>
                          {punto.nombre}
                        </h4>

                        <p
                          style={{
                            margin: "0 0 10px 0",
                            fontSize: "14px",
                            color: "#666"
                          }}
                        >
                          {punto.direccion}
                        </p>

                        {punto.descripcion && (
                          <p style={{ margin: "0 0 10px 0" }}>
                            {punto.descripcion}
                          </p>
                        )}

                        {punto.foto && (
                          <img
                            src={punto.foto}
                            alt={punto.nombre}
                            style={{
                              width: "100%",
                              maxHeight: "200px",
                              objectFit: "cover",
                              borderRadius: "5px"
                            }}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {mostrarFormulario && (
                  <div
                    style={{
                      backgroundColor: "#fff",
                      padding: "20px",
                      borderRadius: "8px",
                      marginTop: "20px",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                    }}
                  >
                    <h4
                      style={{
                        marginTop: 0,
                        borderBottom: "1px solid #eee",
                        paddingBottom: "10px"
                      }}
                    >
                      Nuevo Punto de Interés
                    </h4>

                    <form
                      onSubmit={handleSubmit}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "15px"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "5px"
                        }}
                      >
                        <label
                          style={{
                            fontWeight: "bold",
                            fontSize: "14px",
                            color: "#333"
                          }}
                        >
                          Nombre *
                        </label>

                        <input
                          type="text"
                          required
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          style={{
                            padding: "10px",
                            borderRadius: "5px",
                            border: "1px solid #ccc"
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "5px"
                        }}
                      >
                        <label
                          style={{
                            fontWeight: "bold",
                            fontSize: "14px",
                            color: "#333"
                          }}
                        >
                          Dirección *
                        </label>

                        <input
                          type="text"
                          required
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          style={{
                            padding: "10px",
                            borderRadius: "5px",
                            border: "1px solid #ccc"
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "5px"
                        }}
                      >
                        <label
                          style={{
                            fontWeight: "bold",
                            fontSize: "14px",
                            color: "#333"
                          }}
                        >
                          Imagen
                        </label>

                        <input
                          id="inputFoto"
                          type="file"
                          accept=".jpg, .jpeg, image/jpeg"
                          onChange={handleFileChange}
                          style={{
                            padding: "10px",
                            borderRadius: "5px",
                            border: "1px solid #ccc",
                            backgroundColor: "#fff"
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "5px"
                        }}
                      >
                        <label
                          style={{
                            fontWeight: "bold",
                            fontSize: "14px",
                            color: "#333"
                          }}
                        >
                          Comentarios
                        </label>

                        <textarea
                          rows="3"
                          value={comentarios}
                          onChange={(e) => setComentarios(e.target.value)}
                          style={{
                            padding: "10px",
                            borderRadius: "5px",
                            border: "1px solid #ccc",
                            resize: "vertical"
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginTop: "10px"
                        }}
                      >
                        <button
                          type="submit"
                          style={{
                            flex: 1,
                            padding: "12px",
                            backgroundColor: "#002f5c",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontWeight: "bold"
                          }}
                        >
                          Guardar
                        </button>

                        <button
                          type="button"
                          onClick={() => setMostrarFormulario(false)}
                          style={{
                            flex: 1,
                            padding: "12px",
                            backgroundColor: "#ccc",
                            color: "#333",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontWeight: "bold"
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}