import React, { useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase"; 

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

export default function MapChart() {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 });
  const [puntos, setPuntos] = useState([]);
  
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [foto, setFoto] = useState("");
  const [comentarios, setComentarios] = useState("");
  
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(true);

  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const cargarPuntos = async (paisId) => {
    const q = query(collection(db, "puntos_interes"), where("paisId", "==", paisId));
    const querySnapshot = await getDocs(q);
    const puntosData = querySnapshot.docs.map(doc => doc.data());
    setPuntos(puntosData);
  };

  const handleCountryClick = (geo) => {
    const centroid = geoCentroid(geo);
    setSelectedCountry(geo);
    setPosition({ coordinates: centroid, zoom: 4 });
    cargarPuntos(geo.rsmKey);
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
    if (!nombre || !direccion) return;

    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}`);
    const data = await res.json();

    if (data.length === 0) {
      alert("No se pudo encontrar la ubicación de esa dirección en el mapa.");
      return;
    }

    const coordenadas = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
    const nuevoPunto = {
      paisId: selectedCountry.rsmKey,
      nombre,
      direccion,
      foto,
      descripcion: comentarios,
      coordenadas
    };

    await addDoc(collection(db, "puntos_interes"), nuevoPunto);
    setPuntos([...puntos, nuevoPunto]);
    
    setNombre("");
    setDireccion("");
    setFoto("");
    setComentarios("");
    document.getElementById("inputFoto").value = "";
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

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "#002f5c", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: selectedCountry ? "flex-start" : "center" }}>
      
      {selectedCountry && (
        <button 
          onClick={handleBack}
          style={{ position: "absolute", top: "20px", left: "20px", padding: "10px 20px", cursor: "pointer", backgroundColor: "#FF5722", color: "white", border: "none", borderRadius: "5px", zIndex: 10 }}
        >
          Volver
        </button>
      )}

      {tooltipContent && (
        <div style={{
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
        }}>
          {tooltipContent}
          <div style={{
            position: "absolute",
            bottom: "-6px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "0",
            height: "0",
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "6px solid rgba(0, 0, 0, 0.8)"
          }}></div>
        </div>
      )}

      <div style={{ width: "100%", height: selectedCountry ? (panelAbierto ? "45vh" : "85vh") : "100vh", display: "flex", justifyContent: "center", alignItems: "center", transition: "height 0.8s ease-in-out" }}>
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
                  const isSelected = selectedCountry && selectedCountry.rsmKey === geo.rsmKey;

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
                  r={4 / position.zoom} 
                  fill="#FF5722" 
                  stroke="#fff" 
                  strokeWidth={1 / position.zoom} 
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
      </div>

      {selectedCountry && (
        <div style={{ 
          width: "100%", maxWidth: "600px", backgroundColor: "#ECEFF1", color: "black", padding: "20px", 
          borderRadius: "10px", boxSizing: "border-box", zIndex: 10, marginTop: "10px",
          animation: "fadeIn 0.8s ease-in-out"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>{selectedCountry.properties.name}</h2>
            <button 
              onClick={() => setPanelAbierto(!panelAbierto)} 
              style={{ padding: "8px 15px", backgroundColor: "#002f5c", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
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
                    onClick={() => setMostrarFormulario(true)} 
                    style={{ padding: "8px 15px", backgroundColor: "#2ecc71", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
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
                    <li id={`punto-${index}`} key={index} style={{ backgroundColor: "#fff", padding: "15px", marginBottom: "10px", borderRadius: "5px", transition: "background-color 0.5s" }}>
                      <h4 style={{ margin: "0 0 5px 0" }}>{punto.nombre}</h4>
                      <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>{punto.direccion}</p>
                      {punto.descripcion && <p style={{ margin: "0 0 10px 0" }}>{punto.descripcion}</p>}
                      {punto.foto && <img src={punto.foto} alt={punto.nombre} style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "5px" }} />}
                    </li>
                  ))}
                </ul>
              )}
              
              {mostrarFormulario && (
                <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "8px", marginTop: "20px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
                  <h4 style={{ marginTop: 0, borderBottom: "1px solid #eee", paddingBottom: "10px" }}>Nuevo Punto de Interés</h4>
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
                      <label style={{ fontWeight: "bold", fontSize: "14px", color: "#333" }}>Imagen</label>
                      <input id="inputFoto" type="file" accept=".jpg, .jpeg, image/jpeg" onChange={handleFileChange} style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc", backgroundColor: "#fff" }} />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      <label style={{ fontWeight: "bold", fontSize: "14px", color: "#333" }}>Comentarios</label>
                      <textarea rows="3" value={comentarios} onChange={(e) => setComentarios(e.target.value)} style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc", resize: "vertical" }} />
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                      <button type="submit" style={{ flex: 1, padding: "12px", backgroundColor: "#002f5c", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                        Guardar
                      </button>
                      <button type="button" onClick={() => setMostrarFormulario(false)} style={{ flex: 1, padding: "12px", backgroundColor: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
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

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}