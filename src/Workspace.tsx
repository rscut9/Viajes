import {
  useState,
} from "react";

import App from "./App";

import PointsOfInterestExplorer
  from "./components/PointsOfInterestExplorer";


type ViewMode =
  | "map"
  | "points";


export type MapPointTarget = {
  id: string;

  name: string;

  address: string;

  longitude: number;

  latitude: number;

  countryCode: string;
};


function Workspace() {
  const [
    view,
    setView,
  ] =
    useState<ViewMode>(
      "map"
    );


  function openPointOnMap(
    point: MapPointTarget
  ) {
    /*
     * Primero mostramos el mapa.
     */
    setView("map");


    /*
     * Esperamos a que React haga
     * visible de nuevo el mapa.
     */
    window.setTimeout(
      () => {
        window.dispatchEvent(
          new CustomEvent(
            "travel-open-poi",
            {
              detail: point,
            }
          )
        );
      },
      50
    );
  }


  return (
    <>
      {/* =========================
          NAVEGACIÓN
          ========================= */}

      <nav
        style={{
          position: "fixed",

          zIndex: 9998,

          top: "18px",

          right: "18px",

          display: "flex",

          gap: "5px",

          padding: "5px",

          border:
            "1px solid rgba(255,255,255,0.12)",

          borderRadius:
            "14px",

          background:
            "rgba(5,8,12,0.88)",

          backdropFilter:
            "blur(16px)",

          boxShadow:
            "0 12px 35px rgba(0,0,0,0.25)",
        }}
      >

        <button
          type="button"
          onClick={() =>
            setView("map")
          }
          style={{
            minHeight:
              "38px",

            padding:
              "0 14px",

            border:
              "none",

            borderRadius:
              "10px",

            background:
              view === "map"
                ? "white"
                : "transparent",

            color:
              view === "map"
                ? "#080c11"
                : "rgba(255,255,255,0.55)",

            fontSize:
              "10px",

            fontWeight:
              750,

            cursor:
              "pointer",
          }}
        >
          🌍 Mapa
        </button>


        <button
          type="button"
          onClick={() =>
            setView(
              "points"
            )
          }
          style={{
            minHeight:
              "38px",

            padding:
              "0 14px",

            border:
              "none",

            borderRadius:
              "10px",

            background:
              view ===
              "points"
                ? "white"
                : "transparent",

            color:
              view ===
              "points"
                ? "#080c11"
                : "rgba(255,255,255,0.55)",

            fontSize:
              "10px",

            fontWeight:
              750,

            cursor:
              "pointer",
          }}
        >
          📍 Mis puntos
        </button>

      </nav>


      {/* =========================
          MAPA

          IMPORTANTE:
          ya no desmontamos App.
          Solo la ocultamos.

          Así MapTiler sigue vivo
          mientras estás mirando
          "Mis puntos".
          ========================= */}

      <div
        style={{
          display:
            view === "map"
              ? "block"
              : "none",
        }}
      >
        <App />
      </div>


      {/* =========================
          MIS PUNTOS
          ========================= */}

      {view ===
        "points" && (

        <main
          style={{
            width:
              "100%",

            minHeight:
              "100dvh",

            padding:
              "100px 30px 60px",

            background:
              "#06090d",

            color:
              "white",
          }}
        >

          <div
            style={{
              width:
                "min(900px, 100%)",

              margin:
                "0 auto",
            }}
          >

            <PointsOfInterestExplorer
              onOpenPoint={
                openPointOnMap
              }
            />

          </div>

        </main>
      )}
    </>
  );
}


export default Workspace;