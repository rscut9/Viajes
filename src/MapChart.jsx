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
  doc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot
} from "firebase/firestore";
import { db } from "./firebase";
import {
  geoUrl,
  continentesMap,
  obtenerIdPaisDesdeGeo,
  obtenerNombrePaisDesdeGeo,
  obtenerNombrePaisCanonico,
  obtenerContinente,
  detectarPaisPorDireccion,
  detectarNombrePaisPunto,
  normalizarTexto,
  comprimirImagen
} from "./utils";

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
  const [tipo, setTipo] = useState("Edificio");
  const [puntoEnEdicion, setPuntoEnEdicion] = useState(null);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(true);

  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

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
      .catch((error) => console.error("Error cargando geografías:", error));

    const q = query(collection(db, "puntos_interes"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setPuntosGlobales(data);
    });

    return () => unsubscribe();
  }, []);

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (term.trim() === "") {
      setSearchResults([]);
      return;
    }

    const termNormalizado = normalizarTexto(term);

    const matches = geografiasMapa.map(geo => {
      const nombreEspanol = obtenerNombrePaisCanonico(obtenerNombrePaisDesdeGeo(geo));
      return { geo, nombreEspanol };
    }).filter(item => 
      normalizarTexto(item.nombreEspanol).includes(termNormalizado)
    );

    const uniqueMatches = [];
    const seen = new Set();
    matches.forEach(item => {
      if (!seen.has(item.nombreEspanol) && item.nombreEspanol) {
        seen.add(item.nombreEspanol);
        uniqueMatches.push(item);
      }
    });

    setSearchResults(uniqueMatches.slice(0, 8));
  };

  const handleSelectSearchResult = (item) => {
    setSearchTerm("");
    setSearchResults([]);
    handleCountryClick(item.geo);
  };

  const coincideConPais = (punto, geoPais) => {
    if (!punto || !geoPais) return false;
    const nombrePaisPunto = detectarNombrePaisPunto(punto, geografiasMapa);
    const nombrePaisGeo = obtenerNombrePaisCanonico(
      obtenerNombrePaisDesdeGeo(geoPais)
    );

    if (nombrePaisPunto && nombrePaisPunto !== "Desconocido") {
      return normalizarTexto(nombrePaisPunto) === normalizarTexto(nombrePaisGeo);
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
    resetearFormulario();
    setPanelAbierto(true);
    setTooltipContent("");
  };

  const resetearFormulario = () => {
    setNombre("");
    setDireccion("");
    setFoto("");
    setComentarios("");
    setTipo("Edificio");
    setPuntoEnEdicion(null);
    setMostrarFormulario(false);
    const inputFoto = document.getElementById("inputFoto");
    if (inputFoto) inputFoto.value = "";
  };

  const iniciarEdicion = (punto) => {
    setNombre(punto.nombre);
    setDireccion(punto.direccion);
    setFoto(punto.foto || "");
    setComentarios(punto.descripcion || "");
    
    if (punto.tipo === "Edificios") setTipo("Edificio");
    else if (punto.tipo === "Monumentos") setTipo("Monumento");
    else if (punto.tipo === "Miradores") setTipo("Mirador");
    else setTipo(punto.tipo || "Edificio");

    setPuntoEnEdicion(punto);
    setMostrarFormulario(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que quieres borrar este punto de interés?")) {
      try {
        await deleteDoc(doc(db, "puntos_interes", id));
        if (puntoEnEdicion && puntoEnEdicion.id === id) {
          resetearFormulario();
        }
      } catch (error) {
        console.error("Error al eliminar el documento: ", error);
      }
    }
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

    const puntoData = {
      paisId: obtenerIdPaisDesdeGeo(selectedCountry),
      nombrePais,
      continente,
      nombre,
      direccion,
      foto,
      descripcion: comentarios,
      coordenadas,
      tipo
    };

    if (puntoEnEdicion) {
      const docRef = doc(db, "puntos_interes", puntoEnEdicion.id);
      await updateDoc(docRef, puntoData);
    } else {
      await addDoc(collection(db, "puntos_interes"), puntoData);
    }

    resetearFormulario();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const fotoComprimidaBase64 = await comprimirImagen(file);
        setFoto(fotoComprimidaBase64);
      } catch (error) {
        console.error("Error al comprimir la imagen:", error);
        alert("Hubo un error al procesar la imagen.");
      }
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

  const obtenerColorPorTipo = (tipoPunto) => {
    switch (tipoPunto) {
      case "Edificio":
      case "Edificios":
        return "#FF4444";
      case "Monumento":
      case "Monumentos":
        return "#4444FF";
      case "Mirador":
      case "Miradores":
        return "#44FF44";
      default:
        return "#FFBB00";
    }
  };

  const navegarAPunto = (punto) => {
    const nombrePaisPunto = detectarNombrePaisPunto(punto, geografiasMapa);
    const geoPais = geografiasMapa.find((geo) => {
      const nombrePaisGeo = obtenerNombrePaisCanonico(
        obtenerNombrePaisDesdeGeo(geo)
      );

      if (nombrePaisPunto && nombrePaisPunto !== "Desconocido") {
        return normalizarTexto(nombrePaisPunto) === normalizarTexto(nombrePaisGeo);
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
      const nombrePaisCanonico = obtenerNombrePaisCanonico(nombrePaisDetectado);
      const continente = obtenerContinente(nombrePaisCanonico);

      const puntoNormalizado = {
        ...punto,
        nombrePais: nombrePaisCanonico,
        continente
      };

      if (!agrupados[continente]) agrupados[continente] = {};
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
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={() => {
                  setSidebarAbierta(false);
                  handleBack();
                }}
                style={{
                  padding: "15px", textAlign: "left", fontSize: "16px",
                  backgroundColor: "white", border: "1px solid #ccc",
                  borderRadius: "5px", cursor: "pointer"
                }}
              >
                🗺️ Mapamundi principal
              </button>
              <button
                onClick={() => setVistaSidebar("puntos")}
                style={{
                  padding: "15px", textAlign: "left", fontSize: "16px",
                  backgroundColor: "white", border: "1px solid #ccc",
                  borderRadius: "5px", cursor: "pointer"
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
                  marginBottom: "20px", padding: "8px 15px", cursor: "pointer",
                  border: "none", backgroundColor: "#FF5722", color: "white",
                  borderRadius: "5px"
                }}
              >
                ⬅ Volver al menú
              </button>
              <h3 style={{ marginTop: 0 }}>Mis Puntos de Interés</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {Object.keys(puntosAgrupados).map((continente) => {
                  const paisesDelContinente = puntosAgrupados[continente];
                  const totalPuntos = Object.values(paisesDelContinente).flat().length;
                  const isExpanded = continenteExpandido === continente;

                  return (
                    <div
                      key={continente}
                      style={{
                        backgroundColor: "white", border: "1px solid #ccc",
                        borderRadius: "5px", overflow: "hidden"
                      }}
                    >
                      <div
                        onClick={() => setContinenteExpandido(isExpanded ? null : continente)}
                        style={{
                          padding: "15px", cursor: "pointer", display: "flex",
                          justifyContent: "space-between", fontWeight: "bold",
                          backgroundColor: isExpanded ? "#e0e0e0" : "white"
                        }}
                      >
                        <span>{continente}</span>
                        <span>{totalPuntos}</span>
                      </div>
                      {isExpanded && (
                        <div style={{ borderTop: "1px solid #eee", backgroundColor: "#f9f9f9" }}>
                          {Object.keys(paisesDelContinente)
                            .sort((a, b) => a.localeCompare(b))
                            .map((pais) => {
                              const puntosDelPais = paisesDelContinente[pais] || [];
                              const isPaisExpanded = paisExpandido === pais;

                              return (
                                <div key={pais}>
                                  <div
                                    onClick={() => setPaisExpandido(isPaisExpanded ? null : pais)}
                                    style={{
                                      padding: "10px 15px 10px 30px", cursor: "pointer",
                                      display: "flex", justifyContent: "space-between",
                                      borderBottom: "1px solid #eee",
                                      color: puntosDelPais.length > 0 ? "#333" : "#999"
                                    }}
                                  >
                                    <span>{pais}</span>
                                    <span>{puntosDelPais.length}</span>
                                  </div>
                                  {isPaisExpanded && (
                                    <div style={{ backgroundColor: "#fff" }}>
                                      {puntosDelPais.length === 0 ? (
                                        <div style={{ padding: "10px 15px 10px 50px", fontSize: "12px", color: "#888", borderBottom: "1px solid #f0f0f0" }}>
                                          Sin puntos de interés
                                        </div>
                                      ) : (
                                        puntosDelPais.map((punto, idx) => (
                                          <div
                                            key={idx}
                                            onClick={() => navegarAPunto(punto)}
                                            style={{
                                              padding: "10px 15px 10px 50px", borderBottom: "1px solid #f0f0f0",
                                              cursor: "pointer", transition: "background-color 0.2s"
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f8ff")}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                          >
                                            <h5 style={{ margin: "0 0 5px 0", color: "#002f5c" }}>{punto.nombre}</h5>
                                            <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>{punto.direccion}</p>
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
            position: "absolute", top: "20px", left: "20px", padding: "12px",
            cursor: "pointer", backgroundColor: "rgba(255, 255, 255, 0.9)",
            color: "#002f5c", border: "none", borderRadius: "5px", zIndex: 40,
            fontWeight: "bold", boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
          }}
        >
          ☰ Menú
        </button>
      )}

      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 60,
          width: "300px",
          display: selectedCountry ? "none" : "block"
        }}
      >
        <input
          type="text"
          placeholder="Buscar país..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
            fontSize: "16px",
            boxSizing: "border-box"
          }}
        />
        {searchResults.length > 0 && (
          <ul
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              width: "100%",
              backgroundColor: "white",
              listStyle: "none",
              margin: "5px 0 0 0",
              padding: 0,
              borderRadius: "8px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              overflow: "hidden"
            }}
          >
            {searchResults.map((item, i) => (
              <li
                key={i}
                onClick={() => handleSelectSearchResult(item)}
                style={{
                  padding: "10px 15px",
                  cursor: "pointer",
                  borderBottom: i === searchResults.length - 1 ? "none" : "1px solid #eee",
                  backgroundColor: "#fff",
                  transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f8ff")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fff")}
              >
                {item.nombreEspanol}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        style={{
          flex: 1, marginLeft: sidebarAbierta ? "350px" : "0", transition: "margin-left 0.4s ease-in-out",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: selectedCountry ? "flex-start" : "center", width: "100%", position: "relative"
        }}
      >
        {selectedCountry && (
          <button
            onClick={handleBack}
            style={{
              position: "absolute", top: "20px", right: "20px", padding: "10px 20px",
              cursor: "pointer", backgroundColor: "#FF5722", color: "white",
              border: "none", borderRadius: "5px", zIndex: 10
            }}
          >
            Volver al mundo
          </button>
        )}

        {tooltipContent && (
          <div
            style={{
              position: "fixed", top: tooltipPos.y - 40, left: tooltipPos.x,
              transform: "translateX(-50%)", backgroundColor: "rgba(0, 0, 0, 0.8)",
              color: "white", padding: "8px 12px", borderRadius: "6px", pointerEvents: "none",
              fontSize: "14px", fontWeight: "bold", zIndex: 100, whiteSpace: "nowrap",
              boxShadow: "0px 4px 6px rgba(0,0,0,0.3)"
            }}
          >
            {tooltipContent}
            <div
              style={{
                position: "absolute", bottom: "-6px", left: "50%", transform: "translateX(-50%)",
                width: "0", height: "0", borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent", borderTop: "6px solid rgba(0, 0, 0, 0.8)"
              }}
            />
          </div>
        )}

        <div
          style={{
            width: "100%", height: selectedCountry ? (panelAbierto ? "45vh" : "85vh") : "100vh",
            display: "flex", justifyContent: "center", alignItems: "center",
            transition: "height 0.8s ease-in-out", position: "relative"
          }}
        >
          <ComposableMap style={{ width: "100%", height: "100%" }}>
            <ZoomableGroup
              zoom={position.zoom} center={position.coordinates} maxZoom={50}
              onMoveEnd={(pos) => setPosition(pos)} style={{ transition: "transform 0.8s ease-in-out" }}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const geoKey = obtenerIdPaisDesdeGeo(geo);
                    const selectedKey = selectedCountry ? obtenerIdPaisDesdeGeo(selectedCountry) : "";
                    const isSelected = selectedKey === geoKey;

                    return (
                      <Geography
                        key={geo.rsmKey} geography={geo} onClick={() => handleCountryClick(geo)}
                        style={{
                          default: { fill: isSelected ? "#FFC107" : "#7a9cc6", outline: "none", transition: "fill 0.3s" },
                          hover: { fill: "#FF5722", outline: "none", cursor: "pointer" },
                          pressed: { fill: "#E64A19", outline: "none" }
                        }}
                      />
                    );
                  })
                }
              </Geographies>

              {puntos.map((punto, index) => (
                <Marker key={index} coordinates={punto.coordenadas}>
                  <circle
                    r={4 / position.zoom} fill={obtenerColorPorTipo(punto.tipo)} stroke="#fff" strokeWidth={1 / position.zoom}
                    style={{ cursor: "pointer", transition: "all 0.2s" }}
                    onClick={() => handleMarkerClick(index)}
                    onMouseEnter={(e) => {
                      setTooltipContent(punto.nombre);
                      setTooltipPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setTooltipContent("")}
                    onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                  />
                </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>

          <div
            style={{
              position: "absolute", bottom: "20px", right: "20px",
              backgroundColor: "rgba(255, 255, 255, 0.95)", padding: "15px",
              borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              zIndex: 30, color: "#333", display: "flex", flexDirection: "column",
              gap: "8px", minWidth: "130px"
            }}
          >
            <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", borderBottom: "1px solid #ccc", paddingBottom: "4px" }}>Leyenda</h4>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#FF4444", display: "inline-block" }} />
              Edificios
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#4444FF", display: "inline-block" }} />
              Monumentos
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#44FF44", display: "inline-block" }} />
              Miradores
            </div>
          </div>
        </div>

        {selectedCountry && (
          <div
            style={{
              width: "100%", maxWidth: "600px", backgroundColor: "#ECEFF1", color: "black",
              padding: "20px", borderRadius: "10px", boxSizing: "border-box", zIndex: 10,
              marginTop: "10px", animation: "fadeIn 0.8s ease-in-out"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>
                {obtenerNombrePaisCanonico(obtenerNombrePaisDesdeGeo(selectedCountry))}
              </h2>
              <button
                onClick={() => setPanelAbierto(!panelAbierto)}
                style={{
                  padding: "8px 15px", backgroundColor: "#002f5c", color: "white",
                  border: "none", borderRadius: "5px", cursor: "pointer"
                }}
              >
                {panelAbierto ? "Ocultar panel ▲" : "Mostrar panel ▼"}
              </button>
            </div>

            {panelAbierto && (
              <div style={{ marginTop: "15px", overflowY: "auto", maxHeight: "40vh", paddingRight: "5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h3 style={{ margin: 0 }}>Puntos de Interés</h3>
                  {!mostrarFormulario && (
                    <button
                      onClick={() => {
                        resetearFormulario();
                        setMostrarFormulario(true);
                      }}
                      style={{
                        padding: "8px 15px", backgroundColor: "#2ecc71", color: "white",
                        border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold"
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
                    {puntos.map((punto, index) => {
                      let tipoFormateado = punto.tipo || "Edificio";
                      if (tipoFormateado === "Edificios") tipoFormateado = "Edificio";
                      if (tipoFormateado === "Monumentos") tipoFormateado = "Monumento";
                      if (tipoFormateado === "Miradores") tipoFormateado = "Mirador";

                      return (
                        <li
                          id={`punto-${index}`} key={index}
                          style={{
                            backgroundColor: "#fff", padding: "15px", marginBottom: "10px",
                            borderRadius: "5px", transition: "background-color 0.5s", position: "relative"
                          }}
                        >
                          <h4 style={{ margin: "0 110px 5px 0" }}>{punto.nombre}</h4>
                          <div style={{ position: "absolute", top: "15px", right: "15px", display: "flex", gap: "5px" }}>
                            <button
                              onClick={() => iniciarEdicion(punto)}
                              style={{
                                padding: "5px 10px", backgroundColor: "#FFC107",
                                border: "none", borderRadius: "3px", cursor: "pointer"
                              }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(punto.id)}
                              style={{
                                padding: "5px 10px", backgroundColor: "#FF4444",
                                color: "white", border: "none", borderRadius: "3px", cursor: "pointer"
                              }}
                            >
                              Borrar
                            </button>
                          </div>
                          <p style={{ margin: "0 0 5px 0", fontSize: "14px", color: "#666" }}>{punto.direccion}</p>
                          <span style={{ fontSize: "12px", fontWeight: "bold", color: obtenerColorPorTipo(punto.tipo), display: "block", marginBottom: "10px" }}>
                            Tipo: {tipoFormateado}
                          </span>
                          {punto.descripcion && <p style={{ margin: "0 0 10px 0" }}>{punto.descripcion}</p>}
                          {punto.foto && (
                            <img src={punto.foto} alt={punto.nombre} style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "5px" }} />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {mostrarFormulario && (
                  <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "8px", marginTop: "20px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
                    <h4 style={{ marginTop: 0, borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
                      {puntoEnEdicion ? "Editar Punto de Interés" : "Nuevo Punto de Interés"}
                    </h4>
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontWeight: "bold", fontSize: "14px", color: "#333" }}>Nombre *</label>
                        <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontWeight: "bold", fontSize: "14px", color: "#333" }}>Dirección *</label>
                        <input type="text" required value={direccion} onChange={(e) => setDireccion(e.target.value)} style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontWeight: "bold", fontSize: "14px", color: "#333" }}>Tipo de punto *</label>
                        <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc", backgroundColor: "#fff" }}>
                          <option value="Edificio">Edificio</option>
                          <option value="Monumento">Monumento</option>
                          <option value="Mirador">Mirador</option>
                        </select>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontWeight: "bold", fontSize: "14px", color: "#333" }}>Imagen</label>
                        <input id="inputFoto" type="file" accept=".jpg, .jpeg, image/jpeg" onChange={handleFileChange} style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc", backgroundColor: "#fff" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontWeight: "bold", fontSize: "14px", color: "#333" }}>Comentarios</label>
                        <textarea rows="3" value={comentarios} onChange={(e) => setComentarios(e.target.value)} style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc", resize: "vertical" }} />
                      </div>
                      <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                        <button type="submit" style={{ flex: 1, padding: "12px", backgroundColor: "#002f5c", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Guardar</button>
                        <button type="button" onClick={resetearFormulario} style={{ flex: 1, padding: "12px", backgroundColor: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Cancelar</button>
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
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}