import React, { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase"; 

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

export default function MapChart() {
  const [savedCountries, setSavedCountries] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const docRef = doc(db, "viajes", "mis-paises");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSavedCountries(docSnap.data().lista || []);
      }
    };
    loadData();
  }, []);

  const toggleCountry = async (geoId) => {
    const newList = savedCountries.includes(geoId)
      ? savedCountries.filter(id => id !== geoId)
      : [...savedCountries, geoId];

    setSavedCountries(newList);
    await setDoc(doc(db, "viajes", "mis-paises"), { lista: newList });
  };

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#002f5c", overflow: "hidden" }}>
      <ComposableMap style={{ width: "100%", height: "100%" }}>
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const isSaved = savedCountries.includes(geo.rsmKey);
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => toggleCountry(geo.rsmKey)}
                  style={{
                    default: { fill: isSaved ? "#2ecc71" : "#7a9cc6", outline: "none" },
                    hover: { fill: "#FF5722", outline: "none", cursor: "pointer" },
                    pressed: { fill: "#2ecc71", outline: "none" }
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}