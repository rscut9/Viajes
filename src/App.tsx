import {
  useEffect,
  useRef,
  useState,
} from "react";

import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";

import {
  feature as topojsonFeature,
} from "topojson-client";

import world from "@cublya/world-atlas/countries-50m.json";

import * as isoCountries from "i18n-iso-countries";
import esLocale from "i18n-iso-countries/langs/es.json";

import pointOnFeature from "@turf/point-on-feature";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson";

import "./App.css";

import PointOfInterestPanel from "./components/PointOfInterestPanel";

/* =========================================================
   ISO
   ========================================================= */

isoCountries.registerLocale(esLocale);

/* =========================================================
   TIPOS
   ========================================================= */

type CountryProperties = {
  name: string;
  iso_a2?: string;
};

type CountryGeometry =
  | Polygon
  | MultiPolygon;

type CountryFeature = Feature<
  CountryGeometry,
  CountryProperties
>;

type AdminProperties = {
  shapeName?: string;
  shapeISO?: string;
  shapeID?: string;
  shapeGroup?: string;
  shapeType?: string;

  appID?: string;
  appLevel?: number;
};

type AdminFeature = Feature<
  CountryGeometry,
  AdminProperties
>;

type AdminCollection =
  FeatureCollection<
    CountryGeometry,
    AdminProperties
  >;

type AdminLevel = 1 | 2 | 3;

type AdminItem = {
  key: string;

  name: string;

  level: AdminLevel;

  bounds: [
    [number, number],
    [number, number]
  ];

  feature: AdminFeature;
};

/* =========================================================
   PAÍSES
   ========================================================= */

const countries =
  topojsonFeature(
    world as any,
    (world as any).objects.countries
  ) as unknown as FeatureCollection<
    CountryGeometry,
    CountryProperties
  >;

/* =========================================================
   CAPAS ADMINISTRATIVAS
   ========================================================= */

const ADMIN_SOURCE =
  "active-admin-source";

const ADMIN_BASE_FILL =
  "active-admin-base-fill";

const ADMIN_BORDER_SHADOW =
  "active-admin-border-shadow";

const ADMIN_BORDER =
  "active-admin-border";

const ADMIN_HOVER_FILL =
  "active-admin-hover-fill";

const ADMIN_HOVER_BORDER =
  "active-admin-hover-border";

const ADMIN_SELECTED_BORDER =
  "active-admin-selected-border";

const ADMIN_HIT =
  "active-admin-hit";

const PARENT_SOURCE =
  "parent-admin-source";

const PARENT_SHADOW =
  "parent-admin-shadow";

const PARENT_BORDER =
  "parent-admin-border";

/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

function getWorldZoom() {
  if (window.innerWidth < 500) {
    return 0.3;
  }

  if (window.innerWidth < 900) {
    return 0.75;
  }

  return 1.15;
}

function getMapPadding() {
  if (window.innerWidth < 760) {
    return {
      top: 210,
      right: 25,
      bottom: 40,
      left: 25,
    };
  }

  return {
    top: 70,
    right: 70,
    bottom: 70,
    left: 520,
  };
}

/* =========================================================
   NOMBRES DE LOS NIVELES
   ========================================================= */

function getLevelName(
  countryCode: string,
  level: AdminLevel
) {
  if (countryCode === "ES") {
    if (level === 1) {
      return "Comunidades y ciudades autónomas";
    }

    if (level === 2) {
      return "Provincias";
    }

    return "Municipios";
  }

  if (countryCode === "FR") {
    if (level === 1) {
      return "Regiones";
    }

    if (level === 2) {
      return "Departamentos";
    }

    return "Municipios";
  }

  if (countryCode === "US") {
    if (level === 1) {
      return "Estados";
    }

    if (level === 2) {
      return "Condados";
    }

    return "Divisiones locales";
  }

  if (countryCode === "IT") {
    if (level === 1) {
      return "Regiones";
    }

    if (level === 2) {
      return "Provincias";
    }

    return "Municipios";
  }

  if (countryCode === "DE") {
    if (level === 1) {
      return "Estados federados";
    }

    if (level === 2) {
      return "Distritos";
    }

    return "Municipios";
  }

  if (countryCode === "JP") {
    if (level === 1) {
      return "Prefecturas";
    }

    if (level === 2) {
      return "Divisiones administrativas";
    }

    return "Municipios";
  }

  if (level === 1) {
    return "Divisiones administrativas";
  }

  if (level === 2) {
    return "Segundo nivel administrativo";
  }

  return "Tercer nivel administrativo";
}

/* =========================================================
   ISO
   ========================================================= */

function getCountryCode(
  country: CountryFeature
) {
  const directCode =
    country.properties?.iso_a2;

  if (
    directCode &&
    directCode !== "-99"
  ) {
    return directCode.toUpperCase();
  }

  if (
    country.id === undefined ||
    country.id === null
  ) {
    return null;
  }

  const numericCode =
    String(country.id).padStart(
      3,
      "0"
    );

  return (
    isoCountries.numericToAlpha2(
      numericCode
    ) ?? null
  );
}

function getSpanishCountryName(
  countryCode: string,
  fallback: string
) {
  return (
    isoCountries.getName(
      countryCode,
      "es"
    ) ?? fallback
  );
}

/* =========================================================
   MAPAMUNDI
   ========================================================= */

function addLayerBeforeLabels(
  map: maptilersdk.Map,
  layer: any
) {
  const layers =
    map.getStyle().layers ?? [];

  const symbolLayer =
    layers.find(
      (item: any) =>
        item.type === "symbol"
    );

  if (symbolLayer) {
    map.addLayer(
      layer,
      symbolLayer.id
    );
  } else {
    map.addLayer(layer);
  }
}

function addWorldCountries(
  map: maptilersdk.Map
) {
  if (
    map.getLayer(
      "countries-border"
    )
  ) {
    map.removeLayer(
      "countries-border"
    );
  }

  if (
    map.getLayer(
      "countries-fill"
    )
  ) {
    map.removeLayer(
      "countries-fill"
    );
  }

  if (
    map.getSource(
      "countries-source"
    )
  ) {
    map.removeSource(
      "countries-source"
    );
  }

  map.addSource(
    "countries-source",
    {
      type: "geojson",

      data:
        countries as any,

      generateId: true,
    }
  );

  addLayerBeforeLabels(
    map,
    {
      id: "countries-fill",

      type: "fill",

      source:
        "countries-source",

      paint: {
        "fill-color": [
          "case",

          [
            "boolean",
            [
              "feature-state",
              "hover",
            ],
            false,
          ],

          "#f2b45d",

          "#dbe8f2",
        ],

        "fill-opacity": [
          "case",

          [
            "boolean",
            [
              "feature-state",
              "hover",
            ],
            false,
          ],

          0.82,

          0.42,
        ],
      },
    }
  );

  addLayerBeforeLabels(
    map,
    {
      id: "countries-border",

      type: "line",

      source:
        "countries-source",

      paint: {
        "line-color":
          "#425466",

        "line-width":
          0.85,

        "line-opacity":
          0.85,
      },
    }
  );
}

/* =========================================================
   COORDENADAS Y BOUNDS
   ========================================================= */

function collectCoordinates(
  coordinates: unknown,
  result: Position[]
) {
  if (
    Array.isArray(coordinates) &&
    typeof coordinates[0] ===
      "number" &&
    typeof coordinates[1] ===
      "number"
  ) {
    result.push([
      coordinates[0],
      coordinates[1],
    ]);

    return;
  }

  if (
    Array.isArray(coordinates)
  ) {
    coordinates.forEach(
      (item) => {
        collectCoordinates(
          item,
          result
        );
      }
    );
  }
}

function getBoundsFromPoints(
  points: Position[]
): {
  bounds: [
    [number, number],
    [number, number]
  ];

  centerLongitude: number;
} {
  if (!points.length) {
    return {
      bounds: [
        [-10, -10],
        [10, 10],
      ],

      centerLongitude: 0,
    };
  }

  let minLatitude = 90;
  let maxLatitude = -90;

  const longitudes: number[] =
    [];

  points.forEach(
    ([longitude, latitude]) => {
      minLatitude =
        Math.min(
          minLatitude,
          latitude
        );

      maxLatitude =
        Math.max(
          maxLatitude,
          latitude
        );

      const normalized =
        ((longitude % 360) +
          360) %
        360;

      longitudes.push(
        normalized
      );
    }
  );

  longitudes.sort(
    (a, b) => a - b
  );

  let largestGap = -1;
  let largestGapIndex = 0;

  for (
    let i = 0;
    i < longitudes.length;
    i++
  ) {
    const current =
      longitudes[i];

    const next =
      i ===
      longitudes.length - 1
        ? longitudes[0] +
          360
        : longitudes[i + 1];

    const gap =
      next - current;

    if (
      gap > largestGap
    ) {
      largestGap = gap;

      largestGapIndex = i;
    }
  }

  let west =
    longitudes[
      (largestGapIndex + 1) %
        longitudes.length
    ];

  let east =
    longitudes[
      largestGapIndex
    ];

  if (east < west) {
    east += 360;
  }

  let centerLongitude =
    (west + east) / 2;

  while (
    centerLongitude > 180
  ) {
    west -= 360;
    east -= 360;
    centerLongitude -= 360;
  }

  while (
    centerLongitude < -180
  ) {
    west += 360;
    east += 360;
    centerLongitude += 360;
  }

  return {
    bounds: [
      [
        west,
        minLatitude,
      ],

      [
        east,
        maxLatitude,
      ],
    ],

    centerLongitude,
  };
}

function getFeatureBounds(
  feature:
    | CountryFeature
    | AdminFeature
) {
  const points: Position[] =
    [];

  collectCoordinates(
    feature.geometry.coordinates,
    points
  );

  return getBoundsFromPoints(
    points
  );
}

/* =========================================================
   MÁSCARA DEL PAÍS
   ========================================================= */

function shiftLongitude(
  longitude: number,
  centerLongitude: number
) {
  let result = longitude;

  while (
    result -
      centerLongitude >
    180
  ) {
    result -= 360;
  }

  while (
    result -
      centerLongitude <
    -180
  ) {
    result += 360;
  }

  return result;
}

function normalizeRing(
  ring: Position[],
  centerLongitude: number
): Position[] {
  return ring.map(
    ([longitude, latitude]) => [
      shiftLongitude(
        longitude,
        centerLongitude
      ),

      latitude,
    ]
  );
}

function ringArea(
  ring: Position[]
) {
  let area = 0;

  for (
    let i = 0;
    i < ring.length - 1;
    i++
  ) {
    const [x1, y1] =
      ring[i];

    const [x2, y2] =
      ring[i + 1];

    area +=
      x1 * y2 -
      x2 * y1;
  }

  return area / 2;
}

function makeClockwise(
  ring: Position[]
) {
  if (
    ringArea(ring) > 0
  ) {
    return [
      ...ring,
    ].reverse();
  }

  return ring;
}

function makeCounterClockwise(
  ring: Position[]
) {
  if (
    ringArea(ring) < 0
  ) {
    return [
      ...ring,
    ].reverse();
  }

  return ring;
}

function createCountryMask(
  country: CountryFeature,
  centerLongitude: number
): Feature<MultiPolygon> {
  const exteriorRings:
    Position[][] = [];

  const interiorRings:
    Position[][] = [];

  if (
    country.geometry.type ===
    "Polygon"
  ) {
    const coordinates =
      country.geometry.coordinates;

    if (coordinates[0]) {
      exteriorRings.push(
        normalizeRing(
          coordinates[0],
          centerLongitude
        )
      );
    }

    coordinates
      .slice(1)
      .forEach((ring) => {
        interiorRings.push(
          normalizeRing(
            ring,
            centerLongitude
          )
        );
      });
  }

  if (
    country.geometry.type ===
    "MultiPolygon"
  ) {
    country.geometry.coordinates.forEach(
      (polygon) => {
        if (polygon[0]) {
          exteriorRings.push(
            normalizeRing(
              polygon[0],
              centerLongitude
            )
          );
        }

        polygon
          .slice(1)
          .forEach((ring) => {
            interiorRings.push(
              normalizeRing(
                ring,
                centerLongitude
              )
            );
          });
      }
    );
  }

  const west =
    centerLongitude - 180;

  const east =
    centerLongitude + 180;

  const south =
    -85.05112878;

  const north =
    85.05112878;

  const worldRing =
    makeCounterClockwise([
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ]);

  const mainPolygon:
    Position[][] = [
      worldRing,

      ...exteriorRings.map(
        makeClockwise
      ),
    ];

  const interiorPolygons =
    interiorRings.map(
      (ring) => [
        makeCounterClockwise(
          ring
        ),
      ]
    );

  return {
    type: "Feature",

    properties: {},

    geometry: {
      type:
        "MultiPolygon",

      coordinates: [
        mainPolygon,
        ...interiorPolygons,
      ],
    },
  };
}

function addCountryMask(
  map: maptilersdk.Map,
  country: CountryFeature,
  centerLongitude: number
) {
  const mask =
    createCountryMask(
      country,
      centerLongitude
    );

  map.addSource(
    "country-mask-source",
    {
      type: "geojson",

      data:
        mask as any,
    }
  );

  map.addLayer({
    id:
      "outside-country-mask",

    type: "fill",

    source:
      "country-mask-source",

    paint: {
      "fill-color":
        "#040609",

      "fill-opacity":
        0.97,
    },
  } as any);
}

/* =========================================================
   BORDE EXTERIOR DEL PAÍS
   ========================================================= */

function addCountryBorder(
  map: maptilersdk.Map,
  country: CountryFeature
) {
  map.addSource(
    "selected-country-source",
    {
      type: "geojson",

      data:
        country as any,
    }
  );

  map.addLayer({
    id:
      "selected-country-glow",

    type: "line",

    source:
      "selected-country-source",

    paint: {
      "line-color":
        "#ffffff",

      "line-width":
        7,

      "line-opacity":
        0.15,

      "line-blur":
        3,
    },
  } as any);

  map.addLayer({
    id:
      "selected-country-border",

    type: "line",

    source:
      "selected-country-source",

    paint: {
      "line-color":
        "#ffffff",

      "line-width": [
        "interpolate",

        ["linear"],

        ["zoom"],

        2,
        1.2,

        6,
        2,

        12,
        3,
      ],

      "line-opacity":
        0.95,
    },
  } as any);
}

/* =========================================================
   GEOBOUNDARIES
   ========================================================= */

async function fetchAdminLevel(
  countryCodeAlpha2: string,
  level: AdminLevel
): Promise<AdminCollection> {
  const alpha3 =
    isoCountries.alpha2ToAlpha3(
      countryCodeAlpha2
    );

  if (!alpha3) {
    throw new Error(
      "No se ha podido obtener el código ISO del país."
    );
  }

  const metadataURL =
    `/geoboundaries-api/api/current/gbOpen/${alpha3}/ADM${level}/`;

  const metadataResponse =
    await fetch(metadataURL);

  if (
    !metadataResponse.ok
  ) {
    throw new Error(
      `Este país no dispone de ADM${level} en geoBoundaries.`
    );
  }

  const metadata =
    await metadataResponse.json();

  const remoteGeoJSONURL =
    metadata.simplifiedGeometryGeoJSON ||
    metadata.gjDownloadURL;

  if (!remoteGeoJSONURL) {
    throw new Error(
      `No se ha encontrado la geometría ADM${level}.`
    );
  }

  let localGeoJSONURL =
    remoteGeoJSONURL;

  if (
    remoteGeoJSONURL.startsWith(
      "https://github.com"
    )
  ) {
    localGeoJSONURL =
      remoteGeoJSONURL.replace(
        "https://github.com",
        "/geoboundaries-github"
      );
  }

  const geometryResponse =
    await fetch(
      localGeoJSONURL
    );

  if (
    !geometryResponse.ok
  ) {
    throw new Error(
      `No se ha podido descargar ADM${level}.`
    );
  }

  const data =
    await geometryResponse.json();

  if (
    !data ||
    data.type !==
      "FeatureCollection" ||
    !Array.isArray(
      data.features
    )
  ) {
    throw new Error(
      `ADM${level} no es un GeoJSON válido.`
    );
  }

  return data as AdminCollection;
}

/* =========================================================
   CONVERTIR GEOJSON EN ELEMENTOS DE LA LISTA
   ========================================================= */

function createAdminItems(
  collection: AdminCollection,
  level: AdminLevel
): AdminItem[] {
  const result =
    collection.features.map(
      (feature, index) => {
        const key =
          feature.properties
            ?.shapeID ||
          feature.properties
            ?.shapeISO ||
          `adm-${level}-${index}`;

        const name =
          feature.properties
            ?.shapeName ||
          `División ${index + 1}`;

        feature.properties = {
          ...feature.properties,

          appID: key,

          appLevel:
            level,
        };

        const {
          bounds,
        } =
          getFeatureBounds(
            feature
          );

        return {
          key,
          name,
          level,
          bounds,
          feature,
        };
      }
    );

  result.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name,
        "es",
        {
          sensitivity:
            "base",
        }
      )
  );

  return result;
}

/* =========================================================
   FILTRAR HIJOS DE UNA REGIÓN
   ========================================================= */

function getChildrenOfParent(
  allChildren: AdminItem[],
  parent: AdminItem
) {
  return allChildren.filter(
    (child) => {
      try {
        /*
         * Elegimos un punto garantizado
         * sobre/dentro de la geometría hija.
         */

        const point =
          pointOnFeature(
            child.feature as any
          );

        /*
         * Y comprobamos si ese punto está
         * dentro de la geometría padre.
         */

        return booleanPointInPolygon(
          point as any,
          parent.feature as any
        );
      } catch {
        return false;
      }
    }
  );
}

/* =========================================================
   BORRAR CAPAS ADMINISTRATIVAS
   ========================================================= */

function clearAdminLayers(
  map: maptilersdk.Map
) {
  const layers = [
    ADMIN_HIT,
    ADMIN_SELECTED_BORDER,
    ADMIN_HOVER_BORDER,
    ADMIN_HOVER_FILL,
    ADMIN_BORDER,
    ADMIN_BORDER_SHADOW,
    ADMIN_BASE_FILL,
    PARENT_BORDER,
    PARENT_SHADOW,
  ];

  layers.forEach((id) => {
    if (map.getLayer(id)) {
      map.removeLayer(id);
    }
  });

  if (
    map.getSource(
      ADMIN_SOURCE
    )
  ) {
    map.removeSource(
      ADMIN_SOURCE
    );
  }

  if (
    map.getSource(
      PARENT_SOURCE
    )
  ) {
    map.removeSource(
      PARENT_SOURCE
    );
  }
}

/* =========================================================
   CAPAS DEL NIVEL ACTUAL
   ========================================================= */

function showAdminLevel(
  map: maptilersdk.Map,
  items: AdminItem[],
  parent:
    | AdminItem
    | null
) {
  clearAdminLayers(map);

  /*
   * Borde de la comunidad/provincia
   * dentro de la que estamos.
   */

  if (parent) {
    map.addSource(
      PARENT_SOURCE,
      {
        type: "geojson",

        data:
          parent.feature as any,
      }
    );

    map.addLayer({
      id:
        PARENT_SHADOW,

      type: "line",

      source:
        PARENT_SOURCE,

      paint: {
        "line-color":
          "#000000",

        "line-width":
          7,

        "line-opacity":
          0.8,

        "line-blur":
          1,
      },
    } as any);

    map.addLayer({
      id:
        PARENT_BORDER,

      type: "line",

      source:
        PARENT_SOURCE,

      paint: {
        "line-color":
          "#ffffff",

        "line-width":
          3.5,

        "line-opacity":
          1,
      },
    } as any);
  }

  const collection:
    FeatureCollection<
      CountryGeometry,
      AdminProperties
    > = {
      type:
        "FeatureCollection",

      features:
        items.map(
          (item) =>
            item.feature
        ),
    };

  map.addSource(
    ADMIN_SOURCE,
    {
      type: "geojson",

      data:
        collection as any,
    }
  );

  /*
   * Relleno prácticamente invisible.
   */

  map.addLayer({
    id:
      ADMIN_BASE_FILL,

    type: "fill",

    source:
      ADMIN_SOURCE,

    paint: {
      "fill-color":
        "#ffffff",

      "fill-opacity":
        0.01,
    },
  } as any);

  /*
   * Sombra para que los bordes
   * se vean sobre satélite.
   */

  map.addLayer({
    id:
      ADMIN_BORDER_SHADOW,

    type: "line",

    source:
      ADMIN_SOURCE,

    paint: {
      "line-color":
        "#000000",

      "line-opacity":
        0.9,

      "line-width": [
        "interpolate",

        ["linear"],

        ["zoom"],

        3,
        2.8,

        8,
        4,

        14,
        5,
      ],

      "line-blur":
        0.8,
    },
  } as any);

  map.addLayer({
    id:
      ADMIN_BORDER,

    type: "line",

    source:
      ADMIN_SOURCE,

    paint: {
      "line-color":
        "#ffffff",

      "line-opacity":
        0.76,

      "line-width": [
        "interpolate",

        ["linear"],

        ["zoom"],

        3,
        0.8,

        8,
        1.25,

        14,
        1.8,
      ],
    },
  } as any);

  /*
   * HOVER:
   *
   * aquí sí dejamos un pequeño
   * relleno para saber exactamente
   * qué territorio estás señalando.
   */

  map.addLayer({
    id:
      ADMIN_HOVER_FILL,

    type: "fill",

    source:
      ADMIN_SOURCE,

    filter: [
      "==",

      ["get", "appID"],

      "__nothing__",
    ] as any,

    paint: {
      "fill-color":
        "#ffffff",

      "fill-opacity":
        0.18,
    },
  } as any);

  map.addLayer({
    id:
      ADMIN_HOVER_BORDER,

    type: "line",

    source:
      ADMIN_SOURCE,

    filter: [
      "==",

      ["get", "appID"],

      "__nothing__",
    ] as any,

    paint: {
      "line-color":
        "#ffffff",

      "line-width":
        4,

      "line-opacity":
        1,
    },
  } as any);

  /*
   * SELECCIÓN:
   *
   * SOLO BORDE.
   * No hay fondo amarillo.
   */

  map.addLayer({
    id:
      ADMIN_SELECTED_BORDER,

    type: "line",

    source:
      ADMIN_SOURCE,

    filter: [
      "==",

      ["get", "appID"],

      "__nothing__",
    ] as any,

    paint: {
      "line-color":
        "#ffffff",

      "line-width": [
        "interpolate",

        ["linear"],

        ["zoom"],

        3,
        4,

        9,
        5,

        14,
        7,
      ],

      "line-opacity":
        1,

      "line-blur":
        0.15,
    },
  } as any);

  /*
   * Capa invisible para clicks
   * y movimiento del ratón.
   */

  map.addLayer({
    id:
      ADMIN_HIT,

    type: "fill",

    source:
      ADMIN_SOURCE,

    paint: {
      "fill-color":
        "#ffffff",

      "fill-opacity":
        0.001,
    },
  } as any);
}

/* =========================================================
   HOVER
   ========================================================= */

function setAdminHover(
  map: maptilersdk.Map,
  key: string | null
) {
  if (
    !map.getLayer(
      ADMIN_HOVER_FILL
    )
  ) {
    return;
  }

  const filter =
    key
      ? [
          "==",

          ["get", "appID"],

          key,
        ]
      : [
          "==",

          ["get", "appID"],

          "__nothing__",
        ];

  map.setFilter(
    ADMIN_HOVER_FILL,
    filter as any
  );

  map.setFilter(
    ADMIN_HOVER_BORDER,
    filter as any
  );
}

/* =========================================================
   SELECCIÓN
   ========================================================= */

function setAdminSelected(
  map: maptilersdk.Map,
  key: string | null
) {
  if (
    !map.getLayer(
      ADMIN_SELECTED_BORDER
    )
  ) {
    return;
  }

  const filter =
    key
      ? [
          "==",

          ["get", "appID"],

          key,
        ]
      : [
          "==",

          ["get", "appID"],

          "__nothing__",
        ];

  map.setFilter(
    ADMIN_SELECTED_BORDER,
    filter as any
  );
}

/* =========================================================
   FILTRO DE TEXTO
   ========================================================= */

function filterByName(
  items: AdminItem[],
  query: string
) {
  const normalized =
    query
      .trim()
      .toLocaleLowerCase(
        "es"
      );

  if (!normalized) {
    return items;
  }

  return items.filter(
    (item) =>
      item.name
        .toLocaleLowerCase(
          "es"
        )
        .includes(
          normalized
        )
  );
}

/* =========================================================
   COMPONENTE DE LISTA
   ========================================================= */

type AdminListProps = {
  items: AdminItem[];

  selectedKey:
    | string
    | null;

  hoveredKey:
    | string
    | null;

  onHover:
    (
      item:
        | AdminItem
        | null
    ) => void;

  onSelect:
    (
      item: AdminItem
    ) => void;
};

function AdminList({
  items,
  selectedKey,
  hoveredKey,
  onHover,
  onSelect,
}: AdminListProps) {
  return (
    <div className="admin-list">
      {items.map(
        (item, index) => {
          const selected =
            selectedKey ===
            item.key;

          const hovered =
            hoveredKey ===
            item.key;

          return (
            <button
              key={item.key}
              type="button"
              className={[
                "admin-item",

                selected
                  ? "selected"
                  : "",

                hovered
                  ? "hovered"
                  : "",
              ]
                .filter(
                  Boolean
                )
                .join(" ")}
              onMouseEnter={() =>
                onHover(
                  item
                )
              }
              onMouseLeave={() =>
                onHover(
                  null
                )
              }
              onClick={() =>
                onSelect(
                  item
                )
              }
            >
              <span className="admin-number">
                {String(
                  index + 1
                ).padStart(
                  2,
                  "0"
                )}
              </span>

              <span className="admin-name">
                {item.name}
              </span>

              <span className="admin-arrow">
                →
              </span>
            </button>
          );
        }
      )}
    </div>
  );
}

/* =========================================================
   APP
   ========================================================= */

function App() {
  const mapContainer =
    useRef<HTMLDivElement | null>(
      null
    );

  const mapRef =
    useRef<maptilersdk.Map | null>(
      null
    );

  const viewModeRef =
    useRef<
      "world" | "country"
    >("world");

  const activeLevelRef =
    useRef<AdminLevel>(1);

  const activeItemsRef =
    useRef<
      Map<string, AdminItem>
    >(new Map());

  const countryCodeRef =
    useRef<string | null>(
      null
    );

  const countryBoundsRef =
    useRef<
      [
        [number, number],
        [number, number]
      ] | null
    >(null);

  /*
   * Caché:
   *
   * si ya hemos descargado ADM2
   * de España, no lo volvemos a
   * descargar cada vez.
   */

  const adminCacheRef =
    useRef<
      Map<string, AdminItem[]>
    >(new Map());

  /*
   * Evita que una petición antigua
   * pise una navegación nueva.
   */

  const navigationTokenRef =
    useRef(0);

  const hoveredCountryRef =
    useRef<
      number |
      string |
      undefined
    >(undefined);

  const hoveredAdminRef =
    useRef<string | null>(
      null
    );

  const selectFromMapRef =
    useRef<
      (item: AdminItem) =>
        void
    >(() => {});

  const provinceSectionRef =
    useRef<HTMLElement | null>(
      null
    );

  const municipalitySectionRef =
    useRef<HTMLElement | null>(
      null
    );

  /* =======================================================
     ESTADO
     ======================================================= */

  const [
    selectedCountry,
    setSelectedCountry,
  ] = useState<string | null>(
    null
  );

  const [
    selectedCountryCode,
    setSelectedCountryCode,
  ] = useState<string | null>(
    null
  );

  const [
    communities,
    setCommunities,
  ] = useState<AdminItem[]>(
    []
  );

  const [
    provinces,
    setProvinces,
  ] = useState<AdminItem[]>(
    []
  );

  const [
    municipalities,
    setMunicipalities,
  ] = useState<AdminItem[]>(
    []
  );

  const [
    selectedCommunity,
    setSelectedCommunity,
  ] = useState<AdminItem | null>(
    null
  );

  const [
    selectedProvince,
    setSelectedProvince,
  ] = useState<AdminItem | null>(
    null
  );

  const [
    selectedMunicipality,
    setSelectedMunicipality,
  ] = useState<AdminItem | null>(
    null
  );

  const [
    hoveredAdminKey,
    setHoveredAdminKey,
  ] = useState<string | null>(
    null
  );

  const [
    loadingLevel,
    setLoadingLevel,
  ] = useState<AdminLevel | null>(
    null
  );

  const [
    levelError,
    setLevelError,
  ] = useState("");

  const [
    communitySearch,
    setCommunitySearch,
  ] = useState("");

  const [
    provinceSearch,
    setProvinceSearch,
  ] = useState("");

  const [
    municipalitySearch,
    setMunicipalitySearch,
  ] = useState("");

  const [
    terrainEnabled,
    setTerrainEnabled,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  /* =======================================================
     CACHE / DESCARGA
     ======================================================= */

  async function loadLevel(
    countryCode: string,
    level: AdminLevel
  ) {
    const cacheKey =
      `${countryCode}-ADM${level}`;

    const cached =
      adminCacheRef.current.get(
        cacheKey
      );

    if (cached) {
      return cached;
    }

    const collection =
      await fetchAdminLevel(
        countryCode,
        level
      );

    const items =
      createAdminItems(
        collection,
        level
      );

    adminCacheRef.current.set(
      cacheKey,
      items
    );

    return items;
  }

  /* =======================================================
     ACTIVAR NIVEL EN MAPA
     ======================================================= */

  function activateLevel(
    items: AdminItem[],
    level: AdminLevel,
    parent:
      | AdminItem
      | null
  ) {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    activeLevelRef.current =
      level;

    activeItemsRef.current.clear();

    items.forEach(
      (item) => {
        activeItemsRef.current.set(
          item.key,
          item
        );
      }
    );

    hoveredAdminRef.current =
      null;

    setHoveredAdminKey(
      null
    );

    showAdminLevel(
      map,
      items,
      parent
    );
  }

  /* =======================================================
     HOVER
     ======================================================= */

  function previewAdmin(
    item:
      | AdminItem
      | null
  ) {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    const key =
      item?.key ?? null;

    hoveredAdminRef.current =
      key;

    setHoveredAdminKey(
      key
    );

    setAdminHover(
      map,
      key
    );
  }

  /* =======================================================
     ZOOM
     ======================================================= */

  function zoomToItem(
    item: AdminItem,
    maxZoom: number
  ) {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    map.fitBounds(
      item.bounds,
      {
        padding:
          getMapPadding(),

        duration:
          1300,

        maxZoom,
      }
    );
  }

  /* =======================================================
     COMUNIDAD → PROVINCIAS
     ======================================================= */

  async function selectCommunity(
    community: AdminItem
  ) {
    const map =
      mapRef.current;

    const countryCode =
      countryCodeRef.current;

    if (
      !map ||
      !countryCode
    ) {
      return;
    }

    const token =
      ++navigationTokenRef.current;

    setSelectedCommunity(
      community
    );

    setSelectedProvince(
      null
    );

    setSelectedMunicipality(
      null
    );

    setProvinces([]);

    setMunicipalities([]);

    setProvinceSearch("");

    setMunicipalitySearch("");

    setLevelError("");

    /*
     * Primero queda marcado
     * únicamente el borde.
     */

    setAdminSelected(
      map,
      community.key
    );

    zoomToItem(
      community,
      8.5
    );

    setLoadingLevel(2);

    try {
      const allADM2 =
        await loadLevel(
          countryCode,
          2
        );

      if (
        token !==
        navigationTokenRef.current
      ) {
        return;
      }

      const children =
        getChildrenOfParent(
          allADM2,
          community
        );

      setProvinces(
        children
      );

      setLoadingLevel(
        null
      );

      activateLevel(
        children,
        2,
        community
      );

      setTimeout(
        () => {
          provinceSectionRef
            .current
            ?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "start",
            });
        },

        120
      );
    } catch (err) {
      if (
        token !==
        navigationTokenRef.current
      ) {
        return;
      }

      setLoadingLevel(
        null
      );

      setLevelError(
        err instanceof Error
          ? err.message
          : "No se han podido cargar las provincias."
      );
    }
  }

  /* =======================================================
     PROVINCIA → MUNICIPIOS
     ======================================================= */

  async function selectProvince(
    province: AdminItem
  ) {
    const map =
      mapRef.current;

    const countryCode =
      countryCodeRef.current;

    if (
      !map ||
      !countryCode
    ) {
      return;
    }

    const token =
      ++navigationTokenRef.current;

    setSelectedProvince(
      province
    );

    setSelectedMunicipality(
      null
    );

    setMunicipalities([]);

    setMunicipalitySearch("");

    setLevelError("");

    setAdminSelected(
      map,
      province.key
    );

    zoomToItem(
      province,
      10
    );

    setLoadingLevel(3);

    try {
      /*
       * En España ADM3 contiene
       * los municipios.
       *
       * La primera vez puede tardar
       * un poco porque hay miles.
       */

      const allADM3 =
        await loadLevel(
          countryCode,
          3
        );

      if (
        token !==
        navigationTokenRef.current
      ) {
        return;
      }

      const children =
        getChildrenOfParent(
          allADM3,
          province
        );

      setMunicipalities(
        children
      );

      setLoadingLevel(
        null
      );

      activateLevel(
        children,
        3,
        province
      );

      setTimeout(
        () => {
          municipalitySectionRef
            .current
            ?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "start",
            });
        },

        120
      );
    } catch (err) {
      if (
        token !==
        navigationTokenRef.current
      ) {
        return;
      }

      setLoadingLevel(
        null
      );

      setLevelError(
        err instanceof Error
          ? err.message
          : "No se han podido cargar los municipios."
      );
    }
  }

  /* =======================================================
     SELECCIONAR MUNICIPIO
     ======================================================= */

  function selectMunicipality(
    municipality: AdminItem
  ) {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    ++navigationTokenRef.current;

    setSelectedMunicipality(
      municipality
    );

    setLevelError("");

    /*
     * Solo borde.
     */

    setAdminSelected(
      map,
      municipality.key
    );

    /*
     * Aquí nos acercamos bastante.
     *
     * MapTiler empezará a mostrar
     * calles, pueblos, barrios,
     * carreteras y POIs.
     */

    zoomToItem(
      municipality,
      13
    );
  }

  /* =======================================================
     VOLVER AL NIVEL DE COMUNIDADES
     ======================================================= */

  function showCommunities() {
    const map =
      mapRef.current;

    const bounds =
      countryBoundsRef.current;

    if (
      !map ||
      !bounds
    ) {
      return;
    }

    ++navigationTokenRef.current;

    setSelectedCommunity(
      null
    );

    setSelectedProvince(
      null
    );

    setSelectedMunicipality(
      null
    );

    setProvinces([]);

    setMunicipalities([]);

    setLevelError("");

    activateLevel(
      communities,
      1,
      null
    );

    map.fitBounds(
      bounds,
      {
        padding:
          getMapPadding(),

        duration:
          1200,

        maxZoom:
          8,
      }
    );
  }

  /* =======================================================
     VOLVER A PROVINCIAS
     ======================================================= */

  function showProvinces() {
    if (
      !selectedCommunity
    ) {
      return;
    }

    ++navigationTokenRef.current;

    setSelectedProvince(
      null
    );

    setSelectedMunicipality(
      null
    );

    setMunicipalities([]);

    setLevelError("");

    activateLevel(
      provinces,
      2,
      selectedCommunity
    );

    zoomToItem(
      selectedCommunity,
      8.5
    );
  }

  /* =======================================================
     VOLVER A MUNICIPIOS
     ======================================================= */

  function showMunicipalities() {
    if (
      !selectedProvince
    ) {
      return;
    }

    ++navigationTokenRef.current;

    setSelectedMunicipality(
      null
    );

    setLevelError("");

    activateLevel(
      municipalities,
      3,
      selectedProvince
    );

    zoomToItem(
      selectedProvince,
      10
    );
  }

  /* =======================================================
     VOLVER UN NIVEL
     ======================================================= */

  function goBackOneLevel() {
    if (selectedMunicipality) {
      showMunicipalities();
      return;
    }

    if (selectedProvince) {
      showProvinces();
      return;
    }

    if (selectedCommunity) {
      showCommunities();
      return;
    }

    returnToWorld();
  }

  /* =======================================================
     MAPA
     ======================================================= */

  useEffect(() => {
    if (
      mapRef.current ||
      !mapContainer.current
    ) {
      return;
    }

    const apiKey =
      import.meta.env
        .VITE_MAPTILER_KEY;

    if (!apiKey) {
      setError(
        "No encuentro VITE_MAPTILER_KEY."
      );

      return;
    }

    maptilersdk.config.apiKey =
      apiKey;

    const map =
      new maptilersdk.Map({
        container:
          mapContainer.current,

        style:
          maptilersdk
            .MapStyle
            .DATAVIZ
            .LIGHT,

        center:
          [0, 18],

        zoom:
          getWorldZoom(),

        minZoom:
          0,

        maxZoom:
          19,

        maxPitch:
          70,

        language:
          maptilersdk
            .Language
            .SPANISH,
      });

    mapRef.current =
      map;

    map.addControl(
      new maptilersdk
        .NavigationControl({
          showCompass:
            true,
        }),

      "bottom-right"
    );

    /* =====================================================
       ENTRAR EN PAÍS
       ===================================================== */

    async function enterCountry(
      country: CountryFeature
    ) {
      const countryCode =
        getCountryCode(
          country
        );

      if (!countryCode) {
        setError(
          "No se ha podido identificar el país."
        );

        return;
      }

      const token =
        ++navigationTokenRef.current;

      const {
        bounds,
        centerLongitude,
      } =
        getFeatureBounds(
          country
        );

      countryCodeRef.current =
        countryCode;

      countryBoundsRef.current =
        bounds;

      viewModeRef.current =
        "country";

      const countryName =
        getSpanishCountryName(
          countryCode,
          country.properties.name
        );

      setSelectedCountry(
        countryName
      );

      setSelectedCountryCode(
        countryCode
      );

      setCommunities([]);

      setProvinces([]);

      setMunicipalities([]);

      setSelectedCommunity(
        null
      );

      setSelectedProvince(
        null
      );

      setSelectedMunicipality(
        null
      );

      setCommunitySearch("");

      setProvinceSearch("");

      setMunicipalitySearch("");

      setLevelError("");

      setLoadingLevel(1);

      window.scrollTo({
        top: 0,
      });

      /*
       * Descargamos ADM1 mientras
       * MapTiler cambia a satélite.
       */

      const adminPromise =
        loadLevel(
          countryCode,
          1
        );

      map.once(
        "style.load",

        async () => {
          if (
            token !==
            navigationTokenRef.current
          ) {
            return;
          }

          map.setLanguage(
            maptilersdk
              .Language
              .SPANISH
          );

          addCountryMask(
            map,
            country,
            centerLongitude
          );

          addCountryBorder(
            map,
            country
          );

          try {
            const admin1 =
              await adminPromise;

            if (
              token !==
              navigationTokenRef.current
            ) {
              return;
            }

            setCommunities(
              admin1
            );

            setLoadingLevel(
              null
            );

            activateLevel(
              admin1,
              1,
              null
            );
          } catch (err) {
            setLoadingLevel(
              null
            );

            setLevelError(
              err instanceof Error
                ? err.message
                : "No se han podido cargar las regiones."
            );
          }

          map.fitBounds(
            bounds,
            {
              padding:
                getMapPadding(),

              duration:
                1800,

              maxZoom:
                8,
            }
          );
        }
      );

      map.setStyle(
        maptilersdk
          .MapStyle
          .HYBRID
      );
    }

    /* =====================================================
       CLICK
       ===================================================== */

    function handleMapClick(
      event: any
    ) {
      if (
        viewModeRef.current ===
        "world"
      ) {
        if (
          !map.getLayer(
            "countries-fill"
          )
        ) {
          return;
        }

        const features =
          map.queryRenderedFeatures(
            event.point,
            {
              layers: [
                "countries-fill",
              ],
            }
          );

        const clickedName =
          features[0]
            ?.properties
            ?.name;

        if (!clickedName) {
          return;
        }

        const country =
          countries.features.find(
            (item) =>
              item.properties
                ?.name ===
              clickedName
          );

        if (country) {
          enterCountry(
            country
          );
        }

        return;
      }

      /*
       * Click sobre comunidad,
       * provincia o municipio.
       */

      if (
        !map.getLayer(
          ADMIN_HIT
        )
      ) {
        return;
      }

      const features =
        map.queryRenderedFeatures(
          event.point,
          {
            layers: [
              ADMIN_HIT,
            ],
          }
        );

      const key =
        features[0]
          ?.properties
          ?.appID;

      if (!key) {
        return;
      }

      const item =
        activeItemsRef.current.get(
          key
        );

      if (item) {
        selectFromMapRef.current(
          item
        );
      }
    }

    /* =====================================================
       HOVER
       ===================================================== */

    function handleMouseMove(
      event: any
    ) {
      if (
        viewModeRef.current ===
        "world"
      ) {
        if (
          !map.getLayer(
            "countries-fill"
          )
        ) {
          return;
        }

        const features =
          map.queryRenderedFeatures(
            event.point,
            {
              layers: [
                "countries-fill",
              ],
            }
          );

        const id =
          features[0]?.id;

        if (
          hoveredCountryRef
            .current !==
          undefined
        ) {
          map.setFeatureState(
            {
              source:
                "countries-source",

              id:
                hoveredCountryRef
                  .current,
            },

            {
              hover: false,
            }
          );
        }

        if (
          id !== undefined
        ) {
          hoveredCountryRef
            .current = id;

          map.setFeatureState(
            {
              source:
                "countries-source",

              id,
            },

            {
              hover: true,
            }
          );

          map.getCanvas()
            .style
            .cursor =
            "pointer";
        } else {
          hoveredCountryRef
            .current =
            undefined;

          map.getCanvas()
            .style
            .cursor =
            "";
        }

        return;
      }

      if (
        !map.getLayer(
          ADMIN_HIT
        )
      ) {
        return;
      }

      const features =
        map.queryRenderedFeatures(
          event.point,
          {
            layers: [
              ADMIN_HIT,
            ],
          }
        );

      const key =
        features[0]
          ?.properties
          ?.appID;

      if (!key) {
        if (
          hoveredAdminRef
            .current
        ) {
          hoveredAdminRef
            .current =
            null;

          setHoveredAdminKey(
            null
          );

          setAdminHover(
            map,
            null
          );
        }

        map.getCanvas()
          .style.cursor =
          "";

        return;
      }

      if (
        hoveredAdminRef
          .current !==
        key
      ) {
        hoveredAdminRef
          .current =
          key;

        setHoveredAdminKey(
          key
        );

        setAdminHover(
          map,
          key
        );
      }

      map.getCanvas()
        .style.cursor =
        "pointer";
    }

    function handleMouseLeave() {
      if (
        viewModeRef.current ===
        "country"
      ) {
        hoveredAdminRef
          .current =
          null;

        setHoveredAdminKey(
          null
        );

        setAdminHover(
          map,
          null
        );
      }
    }

    map.on(
      "load",
      () => {
        map.setLanguage(
          maptilersdk
            .Language
            .SPANISH
        );

        addWorldCountries(
          map
        );
      }
    );

    map.on(
      "click",
      handleMapClick
    );

    map.on(
      "mousemove",
      handleMouseMove
    );

    map
      .getCanvas()
      .addEventListener(
        "mouseleave",
        handleMouseLeave
      );

    return () => {
      map
        .getCanvas()
        .removeEventListener(
          "mouseleave",
          handleMouseLeave
        );

      map.off(
        "click",
        handleMapClick
      );

      map.off(
        "mousemove",
        handleMouseMove
      );

      map.remove();

      mapRef.current =
        null;
    };
  }, []);

  useEffect(() => {
  function handleOpenPoi(event: Event) {
      const customEvent =
        event as CustomEvent<{
          id: string;
          name: string;
          address: string;
          longitude: number;
          latitude: number;
          countryCode: string;
        }>;

      const point =
        customEvent.detail;

      if (!point) {
        return;
      }

      const map =
        mapRef.current;

      if (!map) {
        return;
      }

      /*
      * El mapa estaba oculto mientras
      * veíamos "Mis puntos".
      *
      * Le indicamos que recalcule
      * su tamaño antes de movernos.
      */
      map.resize();

      /*
      * Volamos hasta el punto.
      */
      map.flyTo({
        center: [
          point.longitude,
          point.latitude,
        ],

        zoom: 17,

        pitch: 45,

        bearing: 0,

        duration: 1600,
      });
    }

    window.addEventListener(
      "travel-open-poi",
      handleOpenPoi
    );

    return () => {
      window.removeEventListener(
        "travel-open-poi",
        handleOpenPoi
      );
    };
  }, []);

  /* =======================================================
     CLICK DESDE EL MAPA
     ======================================================= */

  selectFromMapRef.current =
    (item: AdminItem) => {
      if (item.level === 1) {
        selectCommunity(
          item
        );

        return;
      }

      if (item.level === 2) {
        selectProvince(
          item
        );

        return;
      }

      selectMunicipality(
        item
      );
    };

  /* =======================================================
     MUNDO
     ======================================================= */

  function returnToWorld() {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    ++navigationTokenRef.current;

    viewModeRef.current =
      "world";

    countryCodeRef.current =
      null;

    countryBoundsRef.current =
      null;

    activeItemsRef.current.clear();

    setSelectedCountry(
      null
    );

    setSelectedCountryCode(
      null
    );

    setCommunities([]);

    setProvinces([]);

    setMunicipalities([]);

    setSelectedCommunity(
      null
    );

    setSelectedProvince(
      null
    );

    setSelectedMunicipality(
      null
    );

    setLevelError("");

    setTerrainEnabled(
      false
    );

    window.scrollTo({
      top: 0,
    });

    if (
      map.hasTerrain()
    ) {
      map.disableTerrain();
    }

    map.once(
      "style.load",

      () => {
        map.setLanguage(
          maptilersdk
            .Language
            .SPANISH
        );

        addWorldCountries(
          map
        );

        map.easeTo({
          center:
            [0, 18],

          zoom:
            getWorldZoom(),

          pitch:
            0,

          bearing:
            0,

          duration:
            1500,
        });
      }
    );

    map.setStyle(
      maptilersdk
        .MapStyle
        .DATAVIZ
        .LIGHT
    );
  }

  /* =======================================================
     TERRENO 3D
     ======================================================= */

  function toggleTerrain() {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    if (
      map.hasTerrain()
    ) {
      map.disableTerrain();

      setTerrainEnabled(
        false
      );

      map.easeTo({
        pitch: 0,

        bearing: 0,

        duration: 900,
      });

      return;
    }

    map.enableTerrain(
      1.2
    );

    setTerrainEnabled(
      true
    );

    map.easeTo({
      pitch: 48,

      bearing: -12,

      duration: 1100,
    });
  }

  /* =======================================================
     LISTAS FILTRADAS
     ======================================================= */

  const visibleCommunities =
    filterByName(
      communities,
      communitySearch
    );

  const visibleProvinces =
    filterByName(
      provinces,
      provinceSearch
    );

  const visibleMunicipalities =
    filterByName(
      municipalities,
      municipalitySearch
    );

  /* =======================================================
     JSX
     ======================================================= */

  return (
    <main
      className={
        selectedCountry
          ? "app is-exploring"
          : "app world-view"
      }
    >
      <div
        ref={mapContainer}
        className="map"
      />

      {!selectedCountry ? (
        <section className="welcome-panel">
          <div className="eyebrow">
            MIS VIAJES
          </div>

          <h1>
            ¿Dónde quieres ir?
          </h1>

          <p>
            Selecciona cualquier país
            del mapa.
          </p>

          <div className="world-help">
            Arrastra · Haz zoom ·
            Selecciona un país
          </div>
        </section>
      ) : (
        <aside className="explorer-page">
          {/* =============================
              NAVEGACIÓN STICKY
              ============================= */}

          <nav className="explorer-sticky-nav">
            <div className="explorer-sticky-actions">
              <button
                type="button"
                className="explorer-nav-button"
                onClick={
                  goBackOneLevel
                }
              >
                <span>←</span>
                <span>Atrás</span>
              </button>

              <button
                type="button"
                className="explorer-nav-button world"
                onClick={
                  returnToWorld
                }
              >
                <span>🌍</span>
                <span>Mapamundi</span>
              </button>

              <button
                type="button"
                className={
                  terrainEnabled
                    ? "explorer-nav-button terrain active"
                    : "explorer-nav-button terrain"
                }
                onClick={
                  toggleTerrain
                }
              >
                {terrainEnabled
                  ? "✓ 3D"
                  : "🏔 3D"}
              </button>
            </div>

            <div className="explorer-path">
              <button
                type="button"
                onClick={
                  showCommunities
                }
                title={
                  `Volver a ${selectedCountry}`
                }
              >
                {selectedCountry}
              </button>

              {selectedCommunity && (
                <>
                  <span className="explorer-path-separator">
                    ›
                  </span>

                  <button
                    type="button"
                    onClick={
                      showProvinces
                    }
                    title={
                      `Volver a ${selectedCommunity.name}`
                    }
                  >
                    {selectedCommunity.name}
                  </button>
                </>
              )}

              {selectedProvince && (
                <>
                  <span className="explorer-path-separator">
                    ›
                  </span>

                  <button
                    type="button"
                    onClick={
                      showMunicipalities
                    }
                    title={
                      `Volver a ${selectedProvince.name}`
                    }
                  >
                    {selectedProvince.name}
                  </button>
                </>
              )}

              {selectedMunicipality && (
                <>
                  <span className="explorer-path-separator">
                    ›
                  </span>

                  <span className="explorer-path-current">
                    {selectedMunicipality.name}
                  </span>
                </>
              )}
            </div>
          </nav>

          {/* =============================
              CABECERA
              ============================= */}

          <header className="explorer-header">
            <div className="eyebrow">
              EXPLORANDO
            </div>

            <h1>
              {selectedCountry}
            </h1>

            <p>
              Navega por su organización
              territorial. Al acercarte,
              el mapa irá mostrando
              carreteras, ciudades,
              pueblos y lugares.
            </p>
          </header>

          {/* =============================
              NIVELES ADMINISTRATIVOS
              ============================= */}

          <section className="hierarchy-section">
            {selectedCommunity ? (
              <div className="collapsed-level">
                <div className="collapsed-level-copy">
                  <span className="section-kicker">
                    NIVEL 1 · SELECCIONADO
                  </span>

                  <strong>
                    {selectedCommunity.name}
                  </strong>

                  <span className="collapsed-level-type">
                    {selectedCountryCode
                      ? getLevelName(
                          selectedCountryCode,
                          1
                        )
                      : "Región"}
                  </span>
                </div>

                <button
                  type="button"
                  className="collapsed-level-change"
                  onClick={
                    showCommunities
                  }
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">
                      NIVEL 1
                    </span>

                    <h2>
                      {selectedCountryCode
                        ? getLevelName(
                            selectedCountryCode,
                            1
                          )
                        : "Regiones"}
                    </h2>
                  </div>

                  {communities.length >
                    0 && (
                    <span className="count-badge">
                      {
                        communities.length
                      }
                    </span>
                  )}
                </div>

                {loadingLevel === 1 ? (
                  <div className="loading-row">
                    <span className="small-loader" />

                    Cargando regiones…
                  </div>
                ) : communities.length >
                  0 ? (
                  <>
                    <div className="search-wrapper">
                      <span>
                        ⌕
                      </span>

                      <input
                        type="search"
                        value={
                          communitySearch
                        }
                        onChange={(
                          event
                        ) =>
                          setCommunitySearch(
                            event.target
                              .value
                          )
                        }
                        placeholder="Buscar..."
                      />
                    </div>

                    <AdminList
                      items={
                        visibleCommunities
                      }
                      selectedKey={
                        null
                      }
                      hoveredKey={
                        hoveredAdminKey
                      }
                      onHover={
                        previewAdmin
                      }
                      onSelect={
                        selectCommunity
                      }
                    />
                  </>
                ) : levelError ? (
                  <div className="info-box error">
                    {levelError}
                  </div>
                ) : null}
              </>
            )}
          </section>

          {/* =============================
              NIVEL 2
              ============================= */}

          {selectedCommunity && (
            <section
              ref={
                provinceSectionRef
              }
              className="hierarchy-section highlighted-section"
            >
              {selectedProvince ? (
                <div className="collapsed-level">
                  <div className="collapsed-level-copy">
                    <span className="section-kicker">
                      NIVEL 2 · SELECCIONADO
                    </span>

                    <strong>
                      {selectedProvince.name}
                    </strong>

                    <span className="collapsed-level-type">
                      {selectedCountryCode
                        ? getLevelName(
                            selectedCountryCode,
                            2
                          )
                        : "Segundo nivel"}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="collapsed-level-change"
                    onClick={
                      showProvinces
                    }
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <div className="parent-context">
                    <span>
                      DENTRO DE
                    </span>

                    <strong>
                      {
                        selectedCommunity.name
                      }
                    </strong>
                  </div>

                  <div className="section-heading">
                    <div>
                      <span className="section-kicker">
                        NIVEL 2
                      </span>

                      <h2>
                        {selectedCountryCode
                          ? getLevelName(
                              selectedCountryCode,
                              2
                            )
                          : "Segundo nivel"}
                      </h2>
                    </div>

                    {provinces.length >
                      0 && (
                      <span className="count-badge">
                        {
                          provinces.length
                        }
                      </span>
                    )}
                  </div>

                  {loadingLevel === 2 ? (
                    <div className="loading-row">
                      <span className="small-loader" />

                      Cargando provincias…
                    </div>
                  ) : provinces.length >
                    0 ? (
                    <>
                      <div className="search-wrapper">
                        <span>
                          ⌕
                        </span>

                        <input
                          type="search"
                          value={
                            provinceSearch
                          }
                          onChange={(
                            event
                          ) =>
                            setProvinceSearch(
                              event.target
                                .value
                            )
                          }
                          placeholder="Buscar..."
                        />
                      </div>

                      <AdminList
                        items={
                          visibleProvinces
                        }
                        selectedKey={
                          null
                        }
                        hoveredKey={
                          hoveredAdminKey
                        }
                        onHover={
                          previewAdmin
                        }
                        onSelect={
                          selectProvince
                        }
                      />
                    </>
                  ) : loadingLevel !==
                    2 ? (
                    <div className="info-box">
                      {levelError ||
                        "No se han encontrado divisiones de segundo nivel."}
                    </div>
                  ) : null}
                </>
              )}
            </section>
          )}

          {/* =============================
              NIVEL 3
              ============================= */}

          {selectedProvince && (
            <section
              ref={
                municipalitySectionRef
              }
              className="hierarchy-section highlighted-section"
            >
              {selectedMunicipality ? (
                <div className="collapsed-level">
                  <div className="collapsed-level-copy">
                    <span className="section-kicker">
                      NIVEL 3 · SELECCIONADO
                    </span>

                    <strong>
                      {selectedMunicipality.name}
                    </strong>

                    <span className="collapsed-level-type">
                      {selectedCountryCode
                        ? getLevelName(
                            selectedCountryCode,
                            3
                          )
                        : "Municipio"}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="collapsed-level-change"
                    onClick={
                      showMunicipalities
                    }
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <div className="parent-context">
                    <span>
                      DENTRO DE
                    </span>

                    <strong>
                      {
                        selectedProvince.name
                      }
                    </strong>
                  </div>

                  <div className="section-heading">
                    <div>
                      <span className="section-kicker">
                        NIVEL 3
                      </span>

                      <h2>
                        {selectedCountryCode
                          ? getLevelName(
                              selectedCountryCode,
                              3
                            )
                          : "Municipios"}
                      </h2>
                    </div>

                    {municipalities.length >
                      0 && (
                      <span className="count-badge">
                        {
                          municipalities.length
                        }
                      </span>
                    )}
                  </div>

                  {loadingLevel === 3 ? (
                    <div className="loading-row">
                      <span className="small-loader" />

                      Cargando municipios.
                      La primera vez puede
                      tardar unos segundos…
                    </div>
                  ) : municipalities.length >
                    0 ? (
                    <>
                      <div className="search-wrapper">
                        <span>
                          ⌕
                        </span>

                        <input
                          type="search"
                          value={
                            municipalitySearch
                          }
                          onChange={(
                            event
                          ) =>
                            setMunicipalitySearch(
                              event.target
                                .value
                            )
                          }
                          placeholder="Buscar municipio..."
                        />
                      </div>

                      <AdminList
                        items={
                          visibleMunicipalities
                        }
                        selectedKey={
                          null
                        }
                        hoveredKey={
                          hoveredAdminKey
                        }
                        onHover={
                          previewAdmin
                        }
                        onSelect={
                          selectMunicipality
                        }
                      />
                    </>
                  ) : loadingLevel !==
                    3 ? (
                    <div className="info-box">
                      {levelError ||
                        "Este territorio no dispone de un tercer nivel administrativo."}
                    </div>
                  ) : null}
                </>
              )}
            </section>
          )}

          {/* =============================
              MUNICIPIO SELECCIONADO
              ============================= */}

          {selectedMunicipality && (
            <section className="place-section">
              <span className="section-kicker">
                TERRITORIO
                SELECCIONADO
              </span>

              <h2>
                {
                  selectedMunicipality.name
                }
              </h2>

              <p>
                El borde blanco marca
                exactamente el municipio.
                Dentro puedes seguir
                acercándote libremente.
              </p>

              <div className="place-features">
                <div>
                  <span>
                    🛰️
                  </span>

                  <strong>
                    Satélite
                  </strong>
                </div>

                <div>
                  <span>
                    🛣️
                  </span>

                  <strong>
                    Carreteras
                  </strong>
                </div>

                <div>
                  <span>
                    🏘️
                  </span>

                  <strong>
                    Pueblos
                  </strong>
                </div>

                <div>
                  <span>
                    🏙️
                  </span>

                  <strong>
                    Ciudades
                  </strong>
                </div>
              </div>

              <p className="small-note">
                Los núcleos de población
                aparecen directamente
                como etiquetas del mapa.
                No se dibuja un borde
                artificial alrededor de
                una ciudad o pueblo:
                el límite administrativo
                real es el municipio.
              </p>
            </section>
          )}

          {selectedMunicipality && (
            <PointOfInterestPanel
              map={mapRef.current}

              countryCode={countryCodeRef.current ?? ""}
              countryName={selectedCountry ?? ""}

              admin1Id={selectedCommunity?.key}
              admin1Name={selectedCommunity?.name}

              admin2Id={selectedProvince?.key}
              admin2Name={selectedProvince?.name}

              admin3Id={selectedMunicipality?.key}
              admin3Name={selectedMunicipality?.name}
            />
          )}

          <footer className="data-footer">
            Límites administrativos:
            geoBoundaries · Mapa y
            fotografía: MapTiler
          </footer>
        </aside>
      )}

      {error && (
        <div className="fatal-error">
          {error}
        </div>
      )}
    </main>
  );
}

export default App;