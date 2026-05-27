import React from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

export default function MapChart() {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <ComposableMap style={{ width: "100%", height: "100%" }}>
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                style={{
                  default: { fill: "#ECEFF1", outline: "none" },
                  hover: { fill: "#FF5722", outline: "none", cursor: "pointer" },
                  pressed: { fill: "#E64A19", outline: "none" }
                }}
              />
            ))
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}