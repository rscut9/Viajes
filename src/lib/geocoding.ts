export type GeocodedLocation = {
  longitude: number;
  latitude: number;
  formattedAddress: string;
};

type GeoapifyResult = {
  lon: number;
  lat: number;
  formatted?: string;
};

type GeoapifyResponse = {
  results?: GeoapifyResult[];
};

export async function geocodeAddress(
  name: string,
  address: string
): Promise<GeocodedLocation> {
  const apiKey =
    import.meta.env.VITE_GEOAPIFY_KEY;

  if (!apiKey) {
    throw new Error(
      "Falta VITE_GEOAPIFY_KEY en .env.local"
    );
  }

  const query =
    `${name}, ${address}`;

  const params =
    new URLSearchParams({
      text: query,
      format: "json",
      lang: "es",
      limit: "1",
      apiKey,
    });

  const response =
    await fetch(
      `https://api.geoapify.com/v1/geocode/search?${params.toString()}`
    );

  if (!response.ok) {
    throw new Error(
      `Error al buscar la ubicación: ${response.status}`
    );
  }

  const data =
    (await response.json()) as
      GeoapifyResponse;

  const result =
    data.results?.[0];

  if (!result) {
    throw new Error(
      "No se ha encontrado esa ubicación."
    );
  }

  return {
    longitude: result.lon,
    latitude: result.lat,
    formattedAddress:
      result.formatted ?? address,
  };
}