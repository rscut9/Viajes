import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  countries,
} from "countries-list";

import * as isoCountries
  from "i18n-iso-countries";

import esLocale
  from "i18n-iso-countries/langs/es.json";

import pointOnFeature
  from "@turf/point-on-feature";

import booleanPointInPolygon
  from "@turf/boolean-point-in-polygon";

import type {
  Feature,
  MultiPolygon,
  Polygon,
} from "geojson";

import {
  ensureUser,
  supabase,
} from "../lib/supabase";


isoCountries.registerLocale(
  esLocale
);


/* =========================================
   TIPOS
   ========================================= */

type PointRow = {
  id: string;

  name: string;

  address: string;

  longitude: number;

  latitude: number;

  country_code: string;

  admin1_name:
    | string
    | null;

  admin2_name:
    | string
    | null;

  admin3_name:
    | string
    | null;
};


type MapPointTarget = {
  id: string;

  name: string;

  address: string;

  longitude: number;

  latitude: number;

  countryCode: string;
};


type Props = {
  onOpenPoint:
    (
      point: MapPointTarget
    ) => void;
};


type ContinentCode =
  | "EU"
  | "AS"
  | "AF"
  | "NA"
  | "SA"
  | "OC"
  | "AN";


type ContinentItem = {
  code: ContinentCode;

  name: string;
};


type CountryItem = {
  code: string;

  name: string;

  continent: ContinentCode;
};


type AdminProperties = {
  shapeName?: string;

  shapeISO?: string;

  shapeID?: string;

  shapeGroup?: string;

  shapeType?: string;
};


type AdminGeometry =
  | Polygon
  | MultiPolygon;


type AdminFeature =
  Feature<
    AdminGeometry,
    AdminProperties
  >;


type AdminCollection = {
  type: "FeatureCollection";

  features:
    AdminFeature[];
};


type AdminItem = {
  id: string;

  name: string;

  feature: AdminFeature;
};


/* =========================================
   CONTINENTES
   ========================================= */

const CONTINENTS:
  ContinentItem[] = [
    {
      code: "EU",
      name: "Europa",
    },

    {
      code: "AS",
      name: "Asia",
    },

    {
      code: "AF",
      name: "África",
    },

    {
      code: "NA",
      name: "América del Norte",
    },

    {
      code: "SA",
      name: "América del Sur",
    },

    {
      code: "OC",
      name: "Oceanía",
    },

    {
      code: "AN",
      name: "Antártida",
    },
  ];


/* =========================================
   NORMALIZAR NOMBRES
   ========================================= */

function normalizeName(
  value:
    | string
    | null
    | undefined
) {
  return (
    value
      ?.trim()
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
    ?? ""
  );
}


/* =========================================
   CONTINENTE DE UN PAÍS
   ========================================= */

function getContinentFromCountry(
  countryCode: string
):
  | ContinentCode
  | null {
  const code =
    countryCode
      .trim()
      .toUpperCase();


  const country =
    countries[
      code as
        keyof typeof countries
    ];


  if (!country) {
    return null;
  }


  const continent =
    country.continent as
      ContinentCode;


  const valid =
    CONTINENTS.some(
      (item) =>
        item.code ===
        continent
    );


  return valid
    ? continent
    : null;
}


/* =========================================
   TODOS LOS PAÍSES
   ========================================= */

function getAllCountries():
  CountryItem[] {
  return Object.entries(
    countries
  )
    .map(
      ([
        countryCode,
        countryData,
      ]) => {
        const continent =
          countryData
            .continent as
            ContinentCode;


        const spanishName =
          isoCountries.getName(
            countryCode,
            "es"
          );


        return {
          code:
            countryCode,

          name:
            spanishName ??
            countryData.name,

          continent,
        };
      }
    )
    .filter(
      (country) =>
        CONTINENTS.some(
          (continent) =>
            continent.code ===
            country.continent
        )
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
          "es"
        )
    );
}


/* =========================================
   GEOBOUNDARIES
   ADM1 / ADM2 / ADM3
   ========================================= */

async function fetchAdminLevel(
  countryCode: string,

  level: 1 | 2 | 3
): Promise<AdminItem[]> {
  const alpha3 =
    isoCountries.alpha2ToAlpha3(
      countryCode
    );


  if (!alpha3) {
    throw new Error(
      "No se ha podido obtener el código ISO del país."
    );
  }


  const metadataUrl =
    `/geoboundaries-api/api/current/gbOpen/${alpha3}/ADM${level}/`;


  const metadataResponse =
    await fetch(
      metadataUrl
    );


  if (
    !metadataResponse.ok
  ) {
    throw new Error(
      `Este país no dispone de ADM${level} en geoBoundaries.`
    );
  }


  const metadata =
    await metadataResponse
      .json();


  const remoteGeoJsonUrl =
    metadata
      .simplifiedGeometryGeoJSON
    ??
    metadata
      .gjDownloadURL;


  if (!remoteGeoJsonUrl) {
    throw new Error(
      `No se ha encontrado la geometría ADM${level}.`
    );
  }


  let localGeoJsonUrl =
    remoteGeoJsonUrl;


  if (
    remoteGeoJsonUrl.startsWith(
      "https://github.com"
    )
  ) {
    localGeoJsonUrl =
      remoteGeoJsonUrl.replace(
        "https://github.com",
        "/geoboundaries-github"
      );
  }


  const geometryResponse =
    await fetch(
      localGeoJsonUrl
    );


  if (
    !geometryResponse.ok
  ) {
    throw new Error(
      `No se ha podido descargar ADM${level}.`
    );
  }


  const collection =
    (await geometryResponse
      .json()) as
      AdminCollection;


  if (
    collection.type !==
      "FeatureCollection" ||
    !Array.isArray(
      collection.features
    )
  ) {
    throw new Error(
      `ADM${level} no es un GeoJSON válido.`
    );
  }


  return collection.features
    .map(
      (
        feature,
        index
      ) => {
        const name =
          feature
            .properties
            ?.shapeName
          ??
          `Área ${index + 1}`;


        const id =
          feature
            .properties
            ?.shapeID
          ??
          feature
            .properties
            ?.shapeISO
          ??
          `${countryCode}-ADM${level}-${index}`;


        return {
          id,
          name,
          feature,
        };
      }
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
          "es"
        )
    );
}


/* =========================================
   ENCONTRAR HIJOS ADMINISTRATIVOS
   ========================================= */

function getChildrenOfParent(
  children: AdminItem[],

  parent: AdminItem
) {
  return children.filter(
    (child) => {
      try {
        const point =
          pointOnFeature(
            child.feature
          );


        return booleanPointInPolygon(
          point,
          parent.feature
        );
      } catch {
        return false;
      }
    }
  );
}


/* =========================================
   COMPONENTE
   ========================================= */

function PointsOfInterestExplorer({
  onOpenPoint,
}: Props) {
  const [
    points,
    setPoints,
  ] =
    useState<
      PointRow[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState("");


  /* =====================================
     ELEMENTOS DESPLEGADOS
     ===================================== */

  const [
    expandedContinent,
    setExpandedContinent,
  ] =
    useState<
      ContinentCode | null
    >(null);


  const [
    expandedCountry,
    setExpandedCountry,
  ] =
    useState<
      string | null
    >(null);


  const [
    expandedRegionKey,
    setExpandedRegionKey,
  ] =
    useState<
      string | null
    >(null);


  const [
    expandedAdmin2Key,
    setExpandedAdmin2Key,
  ] =
    useState<
      string | null
    >(null);


  const [
    expandedAdmin3Key,
    setExpandedAdmin3Key,
  ] =
    useState<
      string | null
    >(null);


  /* =====================================
     CACHÉS GEOBOUNDARIES
     ===================================== */

  const [
    admin1ByCountry,
    setAdmin1ByCountry,
  ] =
    useState<
      Record<
        string,
        AdminItem[]
      >
    >({});


  const [
    admin2ByCountry,
    setAdmin2ByCountry,
  ] =
    useState<
      Record<
        string,
        AdminItem[]
      >
    >({});


  const [
    admin3ByCountry,
    setAdmin3ByCountry,
  ] =
    useState<
      Record<
        string,
        AdminItem[]
      >
    >({});


  /* =====================================
     ESTADOS DE CARGA
     ===================================== */

  const [
    loadingCountry,
    setLoadingCountry,
  ] =
    useState<
      string | null
    >(null);


  const [
    loadingRegionKey,
    setLoadingRegionKey,
  ] =
    useState<
      string | null
    >(null);


  const [
    loadingAdmin2Key,
    setLoadingAdmin2Key,
  ] =
    useState<
      string | null
    >(null);


  /* =====================================
     ERRORES
     ===================================== */

  const [
    countryErrors,
    setCountryErrors,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});


  const [
    regionErrors,
    setRegionErrors,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});


  const [
    admin2Errors,
    setAdmin2Errors,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});


  /* =====================================
     TODOS LOS PAÍSES
     ===================================== */

  const allCountries =
    useMemo(
      () =>
        getAllCountries(),
      []
    );


  /* =====================================
     CARGAR PUNTOS DE SUPABASE
     ===================================== */

  useEffect(() => {
    async function loadPoints() {
      setLoading(true);

      setError("");


      try {
        await ensureUser();


        const {
          data,
          error:
            selectError,
        } =
          await supabase
            .from(
              "points_of_interest"
            )
            .select(
              `
                id,
                name,
                address,
                longitude,
                latitude,
                country_code,
                admin1_name,
                admin2_name,
                admin3_name
              `
            );


        if (selectError) {
          throw selectError;
        }


        setPoints(
          (data ?? []) as
            PointRow[]
        );
      } catch (err) {
        console.error(
          "Error cargando puntos:",
          err
        );


        setError(
          err instanceof Error
            ? err.message
            : "No se han podido cargar tus puntos de interés."
        );
      } finally {
        setLoading(
          false
        );
      }
    }


    void loadPoints();
  }, []);


  /* =====================================
     CONTAR POR PAÍS
     ===================================== */

  const countryCounts =
    useMemo(() => {
      const counts:
        Record<
          string,
          number
        > = {};


      points.forEach(
        (point) => {
          const code =
            point
              .country_code
              .trim()
              .toUpperCase();


          if (!code) {
            return;
          }


          counts[code] =
            (
              counts[code] ??
              0
            ) + 1;
        }
      );


      return counts;
    }, [points]);


  /* =====================================
     CONTAR POR CONTINENTE
     ===================================== */

  const continentCounts =
    useMemo(() => {
      const counts:
        Record<
          ContinentCode,
          number
        > = {
          EU: 0,

          AS: 0,

          AF: 0,

          NA: 0,

          SA: 0,

          OC: 0,

          AN: 0,
        };


      points.forEach(
        (point) => {
          const continent =
            getContinentFromCountry(
              point.country_code
            );


          if (continent) {
            counts[
              continent
            ] += 1;
          }
        }
      );


      return counts;
    }, [points]);


  /* =====================================
     CONTAR ADM1
     ===================================== */

  function getAdmin1Count(
    countryCode: string,

    admin1Name: string
  ) {
    return points.filter(
      (point) =>
        point
          .country_code
          .trim()
          .toUpperCase() ===
          countryCode

        &&

        normalizeName(
          point.admin1_name
        ) ===
        normalizeName(
          admin1Name
        )
    ).length;
  }


  /* =====================================
     CONTAR ADM2
     ===================================== */

  function getAdmin2Count(
    countryCode: string,

    admin1Name: string,

    admin2Name: string
  ) {
    return points.filter(
      (point) =>
        point
          .country_code
          .trim()
          .toUpperCase() ===
          countryCode

        &&

        normalizeName(
          point.admin1_name
        ) ===
        normalizeName(
          admin1Name
        )

        &&

        normalizeName(
          point.admin2_name
        ) ===
        normalizeName(
          admin2Name
        )
    ).length;
  }


  /* =====================================
     CONTAR ADM3
     ===================================== */

  function getAdmin3Count(
    countryCode: string,

    admin1Name: string,

    admin2Name: string,

    admin3Name: string
  ) {
    return points.filter(
      (point) =>
        point
          .country_code
          .trim()
          .toUpperCase() ===
          countryCode

        &&

        normalizeName(
          point.admin1_name
        ) ===
        normalizeName(
          admin1Name
        )

        &&

        normalizeName(
          point.admin2_name
        ) ===
        normalizeName(
          admin2Name
        )

        &&

        normalizeName(
          point.admin3_name
        ) ===
        normalizeName(
          admin3Name
        )
    ).length;
  }


  /* =====================================
     ABRIR / CERRAR CONTINENTE
     ===================================== */

  function toggleContinent(
    code: ContinentCode
  ) {
    if (
      expandedContinent ===
      code
    ) {
      setExpandedContinent(
        null
      );

      setExpandedCountry(
        null
      );

      setExpandedRegionKey(
        null
      );

      setExpandedAdmin2Key(
        null
      );

      setExpandedAdmin3Key(
        null
      );

      return;
    }


    setExpandedContinent(
      code
    );

    setExpandedCountry(
      null
    );

    setExpandedRegionKey(
      null
    );

    setExpandedAdmin2Key(
      null
    );

    setExpandedAdmin3Key(
      null
    );
  }


  /* =====================================
     ABRIR / CERRAR PAÍS
     ===================================== */

  async function toggleCountry(
    countryCode: string
  ) {
    if (
      expandedCountry ===
      countryCode
    ) {
      setExpandedCountry(
        null
      );

      setExpandedRegionKey(
        null
      );

      setExpandedAdmin2Key(
        null
      );

      setExpandedAdmin3Key(
        null
      );

      return;
    }


    setExpandedCountry(
      countryCode
    );

    setExpandedRegionKey(
      null
    );

    setExpandedAdmin2Key(
      null
    );

    setExpandedAdmin3Key(
      null
    );


    if (
      admin1ByCountry[
        countryCode
      ]
    ) {
      return;
    }


    setLoadingCountry(
      countryCode
    );


    setCountryErrors(
      (current) => ({
        ...current,

        [countryCode]:
          "",
      })
    );


    try {
      const admin1 =
        await fetchAdminLevel(
          countryCode,
          1
        );


      setAdmin1ByCountry(
        (current) => ({
          ...current,

          [countryCode]:
            admin1,
        })
      );
    } catch (err) {
      console.error(
        `Error cargando ADM1 de ${countryCode}:`,
        err
      );


      setCountryErrors(
        (current) => ({
          ...current,

          [countryCode]:
            err instanceof Error
              ? err.message
              : "No se han podido cargar las regiones.",
        })
      );
    } finally {
      setLoadingCountry(
        null
      );
    }
  }


  /* =====================================
     ABRIR / CERRAR ADM1
     ===================================== */

  async function toggleRegion(
    countryCode: string,

    region: AdminItem
  ) {
    const regionKey =
      `${countryCode}:${region.id}`;


    if (
      expandedRegionKey ===
      regionKey
    ) {
      setExpandedRegionKey(
        null
      );

      setExpandedAdmin2Key(
        null
      );

      setExpandedAdmin3Key(
        null
      );

      return;
    }


    setExpandedRegionKey(
      regionKey
    );

    setExpandedAdmin2Key(
      null
    );

    setExpandedAdmin3Key(
      null
    );


    if (
      admin2ByCountry[
        countryCode
      ]
    ) {
      return;
    }


    setLoadingRegionKey(
      regionKey
    );


    setRegionErrors(
      (current) => ({
        ...current,

        [regionKey]:
          "",
      })
    );


    try {
      const admin2 =
        await fetchAdminLevel(
          countryCode,
          2
        );


      setAdmin2ByCountry(
        (current) => ({
          ...current,

          [countryCode]:
            admin2,
        })
      );
    } catch (err) {
      console.error(
        `Error cargando ADM2 de ${countryCode}:`,
        err
      );


      setRegionErrors(
        (current) => ({
          ...current,

          [regionKey]:
            err instanceof Error
              ? err.message
              : "No se han podido cargar las divisiones ADM2.",
        })
      );
    } finally {
      setLoadingRegionKey(
        null
      );
    }
  }


  /* =====================================
     ABRIR / CERRAR ADM2
     ===================================== */

  async function toggleAdmin2(
    countryCode: string,

    admin2: AdminItem
  ) {
    const key =
      `${countryCode}:${admin2.id}`;


    if (
      expandedAdmin2Key ===
      key
    ) {
      setExpandedAdmin2Key(
        null
      );

      setExpandedAdmin3Key(
        null
      );

      return;
    }


    setExpandedAdmin2Key(
      key
    );

    setExpandedAdmin3Key(
      null
    );


    if (
      admin3ByCountry[
        countryCode
      ]
    ) {
      return;
    }


    setLoadingAdmin2Key(
      key
    );


    setAdmin2Errors(
      (current) => ({
        ...current,

        [key]:
          "",
      })
    );


    try {
      const admin3 =
        await fetchAdminLevel(
          countryCode,
          3
        );


      setAdmin3ByCountry(
        (current) => ({
          ...current,

          [countryCode]:
            admin3,
        })
      );
    } catch (err) {
      console.error(
        `Error cargando ADM3 de ${countryCode}:`,
        err
      );


      setAdmin2Errors(
        (current) => ({
          ...current,

          [key]:
            err instanceof Error
              ? err.message
              : "No se han podido cargar las divisiones ADM3.",
        })
      );
    } finally {
      setLoadingAdmin2Key(
        null
      );
    }
  }


  /* =====================================
     ABRIR / CERRAR ADM3
     ===================================== */

  function toggleAdmin3(
    countryCode: string,

    admin3: AdminItem
  ) {
    const key =
      `${countryCode}:${admin3.id}`;


    setExpandedAdmin3Key(
      (current) =>
        current === key
          ? null
          : key
    );
  }


  /* =====================================
     TOTAL DE PUNTOS
     ===================================== */

  const totalPoints =
    points.length;


  /* =====================================
     JSX
     ===================================== */

  return (
    <section>

      {/* =========================
          CABECERA
          ========================= */}

      <header
        style={{
          marginBottom:
            "30px",
        }}
      >
        <span
          style={{
            color:
              "rgba(255,255,255,0.3)",

            fontSize:
              "9px",

            fontWeight:
              800,

            letterSpacing:
              "0.16em",
          }}
        >
          TU COLECCIÓN
        </span>


        <h1
          style={{
            margin:
              "8px 0 0",

            fontSize:
              "38px",

            letterSpacing:
              "-0.04em",
          }}
        >
          Mis puntos de interés
        </h1>


        <p
          style={{
            margin:
              "9px 0 0",

            color:
              "rgba(255,255,255,0.38)",

            fontSize:
              "11px",
          }}
        >
          {totalPoints === 1
            ? "1 lugar guardado"
            : `${totalPoints} lugares guardados`}
        </p>
      </header>


      {loading && (
        <p>
          Cargando puntos...
        </p>
      )}


      {error && (
        <p>
          ❌ {error}
        </p>
      )}


      {!loading &&
        !error &&
        CONTINENTS.map(
          (
            continent
          ) => {
            const continentOpen =
              expandedContinent ===
              continent.code;


            const continentCountries =
              allCountries.filter(
                (country) =>
                  country
                    .continent ===
                  continent.code
              );


            return (
              <div
                key={
                  continent.code
                }
                style={{
                  marginBottom:
                    "7px",
                }}
              >

                {/* =====================
                    CONTINENTE
                    ===================== */}

                <button
                  type="button"
                  onClick={() =>
                    toggleContinent(
                      continent.code
                    )
                  }
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "24px 1fr auto",

                    alignItems:
                      "center",

                    gap:
                      "8px",

                    width:
                      "100%",

                    minHeight:
                      "56px",

                    padding:
                      "0 16px",

                    border:
                      "1px solid rgba(255,255,255,0.09)",

                    borderRadius:
                      "12px",

                    background:
                      continentOpen
                        ? "rgba(255,255,255,0.075)"
                        : "rgba(255,255,255,0.03)",

                    color:
                      "white",

                    textAlign:
                      "left",

                    cursor:
                      "pointer",
                  }}
                >
                  <span>
                    {continentOpen
                      ? "▾"
                      : "▸"}
                  </span>


                  <strong>
                    {
                      continent.name
                    }
                  </strong>


                  <strong>
                    [
                    {
                      continentCounts[
                        continent.code
                      ]
                    }
                    ]
                  </strong>
                </button>


                {/* =====================
                    PAÍSES
                    ===================== */}

                {continentOpen && (
                  <div
                    style={{
                      margin:
                        "7px 0 14px 25px",

                      paddingLeft:
                        "13px",

                      borderLeft:
                        "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {continentCountries.map(
                      (
                        country
                      ) => {
                        const countryOpen =
                          expandedCountry ===
                          country.code;


                        const countryCount =
                          countryCounts[
                            country.code
                          ] ??
                          0;


                        const admin1 =
                          admin1ByCountry[
                            country.code
                          ] ??
                          [];


                        return (
                          <div
                            key={
                              country.code
                            }
                            style={{
                              marginBottom:
                                "4px",
                            }}
                          >

                            {/* =====================
                                PAÍS
                                ===================== */}

                            <button
                              type="button"
                              onClick={() =>
                                void toggleCountry(
                                  country.code
                                )
                              }
                              style={{
                                display:
                                  "grid",

                                gridTemplateColumns:
                                  "20px 1fr auto",

                                alignItems:
                                  "center",

                                gap:
                                  "7px",

                                width:
                                  "100%",

                                minHeight:
                                  "43px",

                                padding:
                                  "0 13px",

                                border:
                                  "1px solid rgba(255,255,255,0.055)",

                                borderRadius:
                                  "9px",

                                background:
                                  countryOpen
                                    ? "rgba(255,255,255,0.075)"
                                    : countryCount > 0
                                      ? "rgba(255,255,255,0.05)"
                                      : "rgba(255,255,255,0.015)",

                                color:
                                  countryCount > 0
                                    ? "rgba(255,255,255,0.9)"
                                    : "rgba(255,255,255,0.4)",

                                textAlign:
                                  "left",

                                cursor:
                                  "pointer",
                              }}
                            >
                              <span>
                                {countryOpen
                                  ? "▾"
                                  : "▸"}
                              </span>


                              <span>
                                {
                                  country.name
                                }
                              </span>


                              <strong>
                                [
                                {
                                  countryCount
                                }
                                ]
                              </strong>
                            </button>


                            {/* =====================
                                ADM1
                                ===================== */}

                            {countryOpen && (
                              <div
                                style={{
                                  margin:
                                    "5px 0 9px 20px",

                                  paddingLeft:
                                    "12px",

                                  borderLeft:
                                    "1px solid rgba(255,255,255,0.07)",
                                }}
                              >

                                {loadingCountry ===
                                  country.code && (
                                  <div
                                    style={{
                                      padding:
                                        "12px",

                                      color:
                                        "rgba(255,255,255,0.35)",

                                      fontSize:
                                        "9px",
                                    }}
                                  >
                                    Cargando regiones...
                                  </div>
                                )}


                                {countryErrors[
                                  country.code
                                ] && (
                                  <div
                                    style={{
                                      padding:
                                        "10px",

                                      color:
                                        "rgba(255,165,165,0.8)",

                                      fontSize:
                                        "9px",
                                    }}
                                  >
                                    ❌{" "}
                                    {
                                      countryErrors[
                                        country.code
                                      ]
                                    }
                                  </div>
                                )}


                                {admin1.map(
                                  (
                                    region
                                  ) => {
                                    const regionKey =
                                      `${country.code}:${region.id}`;


                                    const regionOpen =
                                      expandedRegionKey ===
                                      regionKey;


                                    const regionCount =
                                      getAdmin1Count(
                                        country.code,
                                        region.name
                                      );


                                    const allAdmin2 =
                                      admin2ByCountry[
                                        country.code
                                      ] ??
                                      [];


                                    const admin2Children =
                                      allAdmin2.length > 0
                                        ? getChildrenOfParent(
                                            allAdmin2,
                                            region
                                          )
                                        : [];


                                    return (
                                      <div
                                        key={
                                          region.id
                                        }
                                        style={{
                                          marginBottom:
                                            "3px",
                                        }}
                                      >

                                        {/* =====================
                                            ADM1
                                            ===================== */}

                                        <button
                                          type="button"
                                          onClick={() =>
                                            void toggleRegion(
                                              country.code,
                                              region
                                            )
                                          }
                                          style={{
                                            display:
                                              "grid",

                                            gridTemplateColumns:
                                              "18px 1fr auto",

                                            alignItems:
                                              "center",

                                            gap:
                                              "7px",

                                            width:
                                              "100%",

                                            minHeight:
                                              "39px",

                                            padding:
                                              "0 12px",

                                            border:
                                              "1px solid rgba(255,255,255,0.045)",

                                            borderRadius:
                                              "8px",

                                            background:
                                              regionOpen
                                                ? "rgba(255,255,255,0.075)"
                                                : regionCount > 0
                                                  ? "rgba(255,255,255,0.05)"
                                                  : "rgba(255,255,255,0.01)",

                                            color:
                                              regionCount > 0
                                                ? "rgba(255,255,255,0.82)"
                                                : "rgba(255,255,255,0.32)",

                                            textAlign:
                                              "left",

                                            cursor:
                                              "pointer",
                                          }}
                                        >
                                          <span>
                                            {regionOpen
                                              ? "▾"
                                              : "▸"}
                                          </span>


                                          <span>
                                            {
                                              region.name
                                            }
                                          </span>


                                          <strong>
                                            [
                                            {
                                              regionCount
                                            }
                                            ]
                                          </strong>
                                        </button>


                                        {/* =====================
                                            ADM2
                                            ===================== */}

                                        {regionOpen && (
                                          <div
                                            style={{
                                              margin:
                                                "4px 0 8px 18px",

                                              paddingLeft:
                                                "11px",

                                              borderLeft:
                                                "1px solid rgba(255,255,255,0.06)",
                                            }}
                                          >

                                            {loadingRegionKey ===
                                              regionKey && (
                                              <div
                                                style={{
                                                  padding:
                                                    "11px",

                                                  color:
                                                    "rgba(255,255,255,0.32)",

                                                  fontSize:
                                                    "8px",
                                                }}
                                              >
                                                Cargando divisiones...
                                              </div>
                                            )}


                                            {regionErrors[
                                              regionKey
                                            ] && (
                                              <div
                                                style={{
                                                  padding:
                                                    "10px",

                                                  color:
                                                    "rgba(255,165,165,0.8)",

                                                  fontSize:
                                                    "8px",
                                                }}
                                              >
                                                {
                                                  regionErrors[
                                                    regionKey
                                                  ]
                                                }
                                              </div>
                                            )}


                                            {admin2Children.map(
                                              (
                                                admin2
                                              ) => {
                                                const admin2Key =
                                                  `${country.code}:${admin2.id}`;


                                                const admin2Open =
                                                  expandedAdmin2Key ===
                                                  admin2Key;


                                                const admin2Count =
                                                  getAdmin2Count(
                                                    country.code,

                                                    region.name,

                                                    admin2.name
                                                  );


                                                const allAdmin3 =
                                                  admin3ByCountry[
                                                    country.code
                                                  ] ??
                                                  [];


                                                const admin3Children =
                                                  allAdmin3.length > 0
                                                    ? getChildrenOfParent(
                                                        allAdmin3,
                                                        admin2
                                                      )
                                                    : [];


                                                return (
                                                  <div
                                                    key={
                                                      admin2.id
                                                    }
                                                    style={{
                                                      marginBottom:
                                                        "3px",
                                                    }}
                                                  >

                                                    {/* =====================
                                                        ADM2
                                                        ===================== */}

                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        void toggleAdmin2(
                                                          country.code,
                                                          admin2
                                                        )
                                                      }
                                                      style={{
                                                        display:
                                                          "grid",

                                                        gridTemplateColumns:
                                                          "17px 1fr auto",

                                                        alignItems:
                                                          "center",

                                                        gap:
                                                          "7px",

                                                        width:
                                                          "100%",

                                                        minHeight:
                                                          "37px",

                                                        padding:
                                                          "0 11px",

                                                        border:
                                                          "1px solid rgba(255,255,255,0.04)",

                                                        borderRadius:
                                                          "7px",

                                                        background:
                                                          admin2Open
                                                            ? "rgba(255,255,255,0.07)"
                                                            : admin2Count > 0
                                                              ? "rgba(255,255,255,0.05)"
                                                              : "rgba(255,255,255,0.008)",

                                                        color:
                                                          admin2Count > 0
                                                            ? "rgba(255,255,255,0.8)"
                                                            : "rgba(255,255,255,0.27)",

                                                        textAlign:
                                                          "left",

                                                        cursor:
                                                          "pointer",
                                                      }}
                                                    >
                                                      <span>
                                                        {admin2Open
                                                          ? "▾"
                                                          : "▸"}
                                                      </span>


                                                      <span
                                                        style={{
                                                          fontSize:
                                                            "8.5px",

                                                          fontWeight:
                                                            admin2Count > 0
                                                              ? 700
                                                              : 500,
                                                        }}
                                                      >
                                                        {
                                                          admin2.name
                                                        }
                                                      </span>


                                                      <strong
                                                        style={{
                                                          fontSize:
                                                            "8px",
                                                        }}
                                                      >
                                                        [
                                                        {
                                                          admin2Count
                                                        }
                                                        ]
                                                      </strong>
                                                    </button>


                                                    {/* =====================
                                                        ADM3
                                                        ===================== */}

                                                    {admin2Open && (
                                                      <div
                                                        style={{
                                                          margin:
                                                            "4px 0 8px 17px",

                                                          paddingLeft:
                                                            "10px",

                                                          borderLeft:
                                                            "1px solid rgba(255,255,255,0.055)",
                                                        }}
                                                      >

                                                        {loadingAdmin2Key ===
                                                          admin2Key && (
                                                          <div
                                                            style={{
                                                              padding:
                                                                "10px",

                                                              color:
                                                                "rgba(255,255,255,0.3)",

                                                              fontSize:
                                                                "8px",
                                                            }}
                                                          >
                                                            Cargando municipios...
                                                          </div>
                                                        )}


                                                        {admin2Errors[
                                                          admin2Key
                                                        ] && (
                                                          <div
                                                            style={{
                                                              padding:
                                                                "10px",

                                                              color:
                                                                "rgba(255,165,165,0.8)",

                                                              fontSize:
                                                                "8px",
                                                            }}
                                                          >
                                                            {
                                                              admin2Errors[
                                                                admin2Key
                                                              ]
                                                            }
                                                          </div>
                                                        )}


                                                        {loadingAdmin2Key !==
                                                          admin2Key &&
                                                          !admin2Errors[
                                                            admin2Key
                                                          ] &&
                                                          admin3Children.map(
                                                            (
                                                              admin3
                                                            ) => {
                                                              const admin3Count =
                                                                getAdmin3Count(
                                                                  country.code,

                                                                  region.name,

                                                                  admin2.name,

                                                                  admin3.name
                                                                );


                                                              const admin3Key =
                                                                `${country.code}:${admin3.id}`;


                                                              const admin3Open =
                                                                expandedAdmin3Key ===
                                                                admin3Key;


                                                              const admin3Points =
                                                                points.filter(
                                                                  (point) =>
                                                                    point
                                                                      .country_code
                                                                      .trim()
                                                                      .toUpperCase() ===
                                                                      country.code

                                                                    &&

                                                                    normalizeName(
                                                                      point.admin1_name
                                                                    ) ===
                                                                    normalizeName(
                                                                      region.name
                                                                    )

                                                                    &&

                                                                    normalizeName(
                                                                      point.admin2_name
                                                                    ) ===
                                                                    normalizeName(
                                                                      admin2.name
                                                                    )

                                                                    &&

                                                                    normalizeName(
                                                                      point.admin3_name
                                                                    ) ===
                                                                    normalizeName(
                                                                      admin3.name
                                                                    )
                                                                );


                                                              return (
                                                                <div
                                                                  key={
                                                                    admin3.id
                                                                  }
                                                                  style={{
                                                                    marginBottom:
                                                                      "3px",
                                                                  }}
                                                                >

                                                                  {/* =====================
                                                                      ADM3
                                                                      ===================== */}

                                                                  <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                      toggleAdmin3(
                                                                        country.code,
                                                                        admin3
                                                                      )
                                                                    }
                                                                    style={{
                                                                      display:
                                                                        "grid",

                                                                      gridTemplateColumns:
                                                                        "17px 1fr auto",

                                                                      alignItems:
                                                                        "center",

                                                                      gap:
                                                                        "7px",

                                                                      width:
                                                                        "100%",

                                                                      minHeight:
                                                                        "37px",

                                                                      padding:
                                                                        "0 10px",

                                                                      border:
                                                                        "1px solid rgba(255,255,255,0.035)",

                                                                      borderRadius:
                                                                        "7px",

                                                                      background:
                                                                        admin3Open
                                                                          ? "rgba(255,255,255,0.08)"
                                                                          : admin3Count > 0
                                                                            ? "rgba(255,255,255,0.055)"
                                                                            : "rgba(255,255,255,0.006)",

                                                                      color:
                                                                        admin3Count > 0
                                                                          ? "rgba(255,255,255,0.82)"
                                                                          : "rgba(255,255,255,0.24)",

                                                                      textAlign:
                                                                        "left",

                                                                      cursor:
                                                                        "pointer",
                                                                    }}
                                                                  >
                                                                    <span
                                                                      style={{
                                                                        color:
                                                                          "rgba(255,255,255,0.3)",

                                                                        fontSize:
                                                                          "8px",
                                                                      }}
                                                                    >
                                                                      {admin3Open
                                                                        ? "▾"
                                                                        : "▸"}
                                                                    </span>


                                                                    <span
                                                                      style={{
                                                                        fontSize:
                                                                          "8px",

                                                                        fontWeight:
                                                                          admin3Count > 0
                                                                            ? 700
                                                                            : 500,
                                                                      }}
                                                                    >
                                                                      {
                                                                        admin3.name
                                                                      }
                                                                    </span>


                                                                    <strong
                                                                      style={{
                                                                        color:
                                                                          admin3Count > 0
                                                                            ? "white"
                                                                            : "rgba(255,255,255,0.15)",

                                                                        fontSize:
                                                                          "8px",
                                                                      }}
                                                                    >
                                                                      [
                                                                      {
                                                                        admin3Count
                                                                      }
                                                                      ]
                                                                    </strong>
                                                                  </button>


                                                                  {/* =====================
                                                                      PUNTOS DE INTERÉS
                                                                      ===================== */}

                                                                  {admin3Open && (
                                                                    <div
                                                                      style={{
                                                                        margin:
                                                                          "5px 0 10px 17px",

                                                                        paddingLeft:
                                                                          "10px",

                                                                        borderLeft:
                                                                          "1px solid rgba(255,255,255,0.05)",
                                                                      }}
                                                                    >

                                                                      {admin3Points.length ===
                                                                        0 && (
                                                                        <div
                                                                          style={{
                                                                            padding:
                                                                              "10px",

                                                                            color:
                                                                              "rgba(255,255,255,0.22)",

                                                                            fontSize:
                                                                              "8px",
                                                                          }}
                                                                        >
                                                                          No tienes puntos de interés guardados aquí.
                                                                        </div>
                                                                      )}


                                                                      {admin3Points.map(
                                                                        (
                                                                          point
                                                                        ) => (
                                                                          <button
                                                                            type="button"
                                                                            key={
                                                                              point.id
                                                                            }
                                                                            onClick={() =>
                                                                              onOpenPoint({
                                                                                id:
                                                                                  point.id,

                                                                                name:
                                                                                  point.name,

                                                                                address:
                                                                                  point.address,

                                                                                longitude:
                                                                                  point.longitude,

                                                                                latitude:
                                                                                  point.latitude,

                                                                                countryCode:
                                                                                  point.country_code,
                                                                              })
                                                                            }
                                                                            style={{
                                                                              display:
                                                                                "grid",

                                                                              gridTemplateColumns:
                                                                                "34px minmax(0, 1fr) 24px",

                                                                              alignItems:
                                                                                "center",

                                                                              gap:
                                                                                "10px",

                                                                              width:
                                                                                "100%",

                                                                              minHeight:
                                                                                "60px",

                                                                              marginBottom:
                                                                                "5px",

                                                                              padding:
                                                                                "8px 10px",

                                                                              border:
                                                                                "1px solid rgba(255,255,255,0.07)",

                                                                              borderRadius:
                                                                                "9px",

                                                                              background:
                                                                                "rgba(255,255,255,0.035)",

                                                                              color:
                                                                                "white",

                                                                              textAlign:
                                                                                "left",

                                                                              cursor:
                                                                                "pointer",
                                                                            }}
                                                                          >

                                                                            <span
                                                                              style={{
                                                                                display:
                                                                                  "flex",

                                                                                alignItems:
                                                                                  "center",

                                                                                justifyContent:
                                                                                  "center",

                                                                                width:
                                                                                  "34px",

                                                                                height:
                                                                                  "34px",

                                                                                borderRadius:
                                                                                  "50%",

                                                                                background:
                                                                                  "rgba(255,255,255,0.07)",

                                                                                fontSize:
                                                                                  "12px",
                                                                              }}
                                                                            >
                                                                              📍
                                                                            </span>


                                                                            <div
                                                                              style={{
                                                                                minWidth:
                                                                                  0,
                                                                              }}
                                                                            >
                                                                              <strong
                                                                                style={{
                                                                                  display:
                                                                                    "block",

                                                                                  overflow:
                                                                                    "hidden",

                                                                                  color:
                                                                                    "rgba(255,255,255,0.9)",

                                                                                  fontSize:
                                                                                    "9px",

                                                                                  lineHeight:
                                                                                    1.4,

                                                                                  textOverflow:
                                                                                    "ellipsis",

                                                                                  whiteSpace:
                                                                                    "nowrap",
                                                                                }}
                                                                              >
                                                                                {
                                                                                  point.name
                                                                                }
                                                                              </strong>


                                                                              <span
                                                                                style={{
                                                                                  display:
                                                                                    "block",

                                                                                  overflow:
                                                                                    "hidden",

                                                                                  marginTop:
                                                                                    "4px",

                                                                                  color:
                                                                                    "rgba(255,255,255,0.32)",

                                                                                  fontSize:
                                                                                    "7.5px",

                                                                                  lineHeight:
                                                                                    1.4,

                                                                                  textOverflow:
                                                                                    "ellipsis",

                                                                                  whiteSpace:
                                                                                    "nowrap",
                                                                                }}
                                                                              >
                                                                                {
                                                                                  point.address
                                                                                }
                                                                              </span>
                                                                            </div>


                                                                            <span
                                                                              style={{
                                                                                color:
                                                                                  "rgba(255,255,255,0.35)",

                                                                                fontSize:
                                                                                  "13px",

                                                                                textAlign:
                                                                                  "right",
                                                                              }}
                                                                            >
                                                                              →
                                                                            </span>

                                                                          </button>
                                                                        )
                                                                      )}

                                                                    </div>
                                                                  )}

                                                                </div>
                                                              );
                                                            }
                                                          )}


                                                        {loadingAdmin2Key !==
                                                          admin2Key &&
                                                          !admin2Errors[
                                                            admin2Key
                                                          ] &&
                                                          admin3ByCountry[
                                                            country.code
                                                          ] &&
                                                          admin3Children.length ===
                                                            0 && (
                                                          <div
                                                            style={{
                                                              padding:
                                                                "10px",

                                                              color:
                                                                "rgba(255,255,255,0.23)",

                                                              fontSize:
                                                                "8px",
                                                            }}
                                                          >
                                                            No se han encontrado divisiones ADM3.
                                                          </div>
                                                        )}

                                                      </div>
                                                    )}

                                                  </div>
                                                );
                                              }
                                            )}

                                          </div>
                                        )}

                                      </div>
                                    );
                                  }
                                )}

                              </div>
                            )}

                          </div>
                        );
                      }
                    )}

                  </div>
                )}

              </div>
            );
          }
        )}

    </section>
  );
}


export default PointsOfInterestExplorer;