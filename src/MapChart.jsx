import React, { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

export default function MapChart() {
  const [selectedCountry, setSelectedCountry] = useState(null);

  return (
    <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#002f5c",
      overflow: "hidden"
    }}>
      <ComposableMap style={{ width: "100%", height: "100%" }}>
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const isSelected = geo.rsmKey === selectedCountry;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => setSelectedCountry(isSelected ? null : geo.rsmKey)}
                  style={{
                    default: { fill: isSelected ? "#2ecc71" : "#7a9cc6", outline: "none" },
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