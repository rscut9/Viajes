import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import * as maptilersdk from "@maptiler/sdk";

import {
  ensureUser,
  supabase,
} from "../lib/supabase";

import {
  geocodeAddress,
  type GeocodedLocation,
} from "../lib/geocoding";

import "./PointOfInterestPanel.css";


type Props = {
  map: maptilersdk.Map | null;

  countryCode: string;
  countryName: string;

  admin1Id?: string;
  admin1Name?: string;

  admin2Id?: string;
  admin2Name?: string;

  admin3Id?: string;
  admin3Name?: string;
};


type PointOfInterestRow = {
  id: string;

  user_id: string;

  name: string;

  address: string;

  matched_address:
    | string
    | null;

  longitude: number;

  latitude: number;

  country_code: string;

  country_name: string;

  admin1_id:
    | string
    | null;

  admin1_name:
    | string
    | null;

  admin2_id:
    | string
    | null;

  admin2_name:
    | string
    | null;

  admin3_id:
    | string
    | null;

  admin3_name:
    | string
    | null;

  image_path:
    | string
    | null;

  created_at: string;
};


type PointOfInterest =
  PointOfInterestRow & {
    imageUrl?: string;
  };


function PointOfInterestPanel({
  map,

  countryCode,
  countryName,

  admin1Id,
  admin1Name,

  admin2Id,
  admin2Name,

  admin3Id,
  admin3Name,
}: Props) {
  const [
    formOpen,
    setFormOpen,
  ] =
    useState(false);

  const [
    editingPoint,
    setEditingPoint,
  ] =
    useState<
      PointOfInterest | null
    >(null);

  const [
    selectedPoint,
    setSelectedPoint,
  ] =
    useState<
      PointOfInterest | null
    >(null);

  const [
    name,
    setName,
  ] =
    useState("");

  const [
    address,
    setAddress,
  ] =
    useState("");

  const [
    imageFile,
    setImageFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    imagePreview,
    setImagePreview,
  ] =
    useState<
      string | null
    >(null);

  const [
    location,
    setLocation,
  ] =
    useState<
      GeocodedLocation | null
    >(null);

  const [
    locating,
    setLocating,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    deleting,
    setDeleting,
  ] =
    useState(false);

  const [
    loadingPoints,
    setLoadingPoints,
  ] =
    useState(false);

  const [
    points,
    setPoints,
  ] =
    useState<
      PointOfInterest[]
    >([]);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");


  const temporaryMarkerRef =
    useRef<
      maptilersdk.Marker | null
    >(null);

  const permanentMarkersRef =
    useRef<
      maptilersdk.Marker[]
    >([]);


  /* =========================================
     PREVISUALIZACIÓN
     ========================================= */

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);

      return;
    }

    const previewUrl =
      URL.createObjectURL(
        imageFile
      );

    setImagePreview(
      previewUrl
    );

    return () => {
      URL.revokeObjectURL(
        previewUrl
      );
    };
  }, [imageFile]);


  /* =========================================
     MARCADOR TEMPORAL
     ========================================= */

  function removeTemporaryMarker() {
    temporaryMarkerRef
      .current
      ?.remove();

    temporaryMarkerRef.current =
      null;
  }


  function createTemporaryMarker(
    longitude: number,
    latitude: number
  ) {
    if (!map) {
      return;
    }

    removeTemporaryMarker();

    const marker =
      new maptilersdk.Marker({
        draggable: true,
      })
        .setLngLat([
          longitude,
          latitude,
        ])
        .addTo(map);

    marker.on(
      "dragend",
      () => {
        const position =
          marker.getLngLat();

        setLocation(
          (current) => {
            if (!current) {
              return null;
            }

            return {
              ...current,

              longitude:
                position.lng,

              latitude:
                position.lat,
            };
          }
        );
      }
    );

    temporaryMarkerRef.current =
      marker;
  }


  /* =========================================
     MARCADORES PERMANENTES
     ========================================= */

  function removePermanentMarkers() {
    permanentMarkersRef
      .current
      .forEach(
        (marker) => {
          marker.remove();
        }
      );

    permanentMarkersRef.current =
      [];
  }


  useEffect(() => {
    return () => {
      temporaryMarkerRef
        .current
        ?.remove();

      permanentMarkersRef
        .current
        .forEach(
          (marker) => {
            marker.remove();
          }
        );
    };
  }, []);


  /* =========================================
     CARGAR PUNTOS
     ========================================= */

  async function loadPoints() {
    if (!admin3Id) {
      setPoints([]);

      return;
    }

    setLoadingPoints(true);

    try {
      await ensureUser();

      const {
        data,
        error: selectError,
      } =
        await supabase
          .from(
            "points_of_interest"
          )
          .select("*")
          .eq(
            "admin3_id",
            admin3Id
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

      if (selectError) {
        throw selectError;
      }

      const rows =
        (data ?? []) as
          PointOfInterestRow[];

      const pointsWithImages =
        await Promise.all(
          rows.map(
            async (point) => {
              if (
                !point.image_path
              ) {
                return point;
              }

              const {
                data:
                  signedData,
                error:
                  signedError,
              } =
                await supabase
                  .storage
                  .from(
                    "poi-images"
                  )
                  .createSignedUrl(
                    point.image_path,
                    60 * 60
                  );

              if (
                signedError
              ) {
                console.error(
                  signedError
                );

                return point;
              }

              return {
                ...point,

                imageUrl:
                  signedData
                    .signedUrl,
              };
            }
          )
        );

      setPoints(
        pointsWithImages
      );

      /*
       * Si teníamos abierta
       * una ficha, la actualizamos.
       */
      setSelectedPoint(
        (current) => {
          if (!current) {
            return null;
          }

          return (
            pointsWithImages.find(
              (point) =>
                point.id ===
                current.id
            ) ?? null
          );
        }
      );
    } catch (err) {
      console.error(
        "Error cargando POIs:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se han podido cargar los puntos."
      );
    } finally {
      setLoadingPoints(false);
    }
  }


  useEffect(() => {
    removeTemporaryMarker();

    setFormOpen(false);

    setEditingPoint(null);
    setSelectedPoint(null);

    setName("");
    setAddress("");
    setImageFile(null);
    setLocation(null);

    setError("");
    setSuccess("");

    void loadPoints();
  }, [admin3Id]);


  /* =========================================
     MARCADORES GUARDADOS
     ========================================= */

  useEffect(() => {
    removePermanentMarkers();

    if (!map) {
      return;
    }

    points.forEach(
      (point) => {
        const marker =
          new maptilersdk.Marker()
            .setLngLat([
              point.longitude,
              point.latitude,
            ])
            .addTo(map);

        const element =
          marker.getElement();

        element.title =
          point.name;

        element.style.cursor =
          "pointer";

        element.addEventListener(
          "click",
          () => {
            setSelectedPoint(
              point
            );

            map.flyTo({
              center: [
                point.longitude,
                point.latitude,
              ],

              zoom: 17,

              pitch: 0,

              bearing: 0,

              duration: 1100,
            });
          }
        );

        permanentMarkersRef
          .current
          .push(marker);
      }
    );

    return () => {
      removePermanentMarkers();
    };
  }, [map, points]);


  /* =========================================
     ABRIR CREACIÓN
     ========================================= */

  function openCreateForm() {
    removeTemporaryMarker();

    setEditingPoint(null);
    setSelectedPoint(null);

    setName("");
    setAddress("");
    setImageFile(null);
    setLocation(null);

    setError("");
    setSuccess("");

    setFormOpen(true);
  }


  /* =========================================
     ABRIR EDICIÓN
     ========================================= */

  function openEditForm(
    point: PointOfInterest
  ) {
    setSelectedPoint(null);

    setEditingPoint(point);

    setName(
      point.name
    );

    setAddress(
      point.address
    );

    setImageFile(null);

    const existingLocation:
      GeocodedLocation = {
        longitude:
          point.longitude,

        latitude:
          point.latitude,

        formattedAddress:
          point.matched_address ??
          point.address,
      };

    setLocation(
      existingLocation
    );

    setError("");
    setSuccess("");

    setFormOpen(true);

    createTemporaryMarker(
      point.longitude,
      point.latitude
    );

    if (map) {
      map.flyTo({
        center: [
          point.longitude,
          point.latitude,
        ],

        zoom: 17,

        pitch: 0,

        bearing: 0,

        duration: 900,
      });
    }
  }


  /* =========================================
     NOMBRE
     ========================================= */

  function handleNameChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    setName(
      event.target.value
    );

    /*
     * Cambiar solo el nombre
     * no invalida las coordenadas.
     */
    setError("");
    setSuccess("");
  }


  /* =========================================
     DIRECCIÓN
     ========================================= */

  function handleAddressChange(
    event:
      ChangeEvent<HTMLTextAreaElement>
  ) {
    const newAddress =
      event.target.value;

    setAddress(
      newAddress
    );

    /*
     * Si cambia la dirección,
     * obligamos a localizar
     * nuevamente.
     */
    if (
      editingPoint &&
      newAddress.trim() ===
        editingPoint.address.trim()
    ) {
      const restoredLocation:
        GeocodedLocation = {
          longitude:
            editingPoint.longitude,

          latitude:
            editingPoint.latitude,

          formattedAddress:
            editingPoint
              .matched_address ??
            editingPoint.address,
        };

      setLocation(
        restoredLocation
      );

      createTemporaryMarker(
        editingPoint.longitude,
        editingPoint.latitude
      );
    } else {
      setLocation(null);

      removeTemporaryMarker();
    }

    setError("");
    setSuccess("");
  }


  /* =========================================
     LOCALIZAR
     ========================================= */

  async function handleLocate() {
    if (!map) {
      setError(
        "El mapa todavía no está disponible."
      );

      return;
    }

    if (!name.trim()) {
      setError(
        "Escribe primero el nombre."
      );

      return;
    }

    if (!address.trim()) {
      setError(
        "Escribe primero la ubicación."
      );

      return;
    }

    setError("");
    setSuccess("");
    setLocating(true);

    try {
      const result =
        await geocodeAddress(
          name.trim(),
          address.trim()
        );

      setLocation(result);

      createTemporaryMarker(
        result.longitude,
        result.latitude
      );

      map.flyTo({
        center: [
          result.longitude,
          result.latitude,
        ],

        zoom: 17,

        pitch: 0,

        bearing: 0,

        duration: 1400,
      });
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se ha podido localizar el lugar."
      );
    } finally {
      setLocating(false);
    }
  }


  /* =========================================
     IMAGEN
     ========================================= */

  function handleImageChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target
        .files?.[0];

    if (!file) {
      setImageFile(null);

      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        "La imagen debe ser JPG, PNG o WebP."
      );

      event.target.value =
        "";

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "La imagen no puede superar los 5 MB."
      );

      event.target.value =
        "";

      return;
    }

    setImageFile(file);

    setError("");
    setSuccess("");
  }


  /* =========================================
     SUBIR IMAGEN
     ========================================= */

  async function uploadImage(
    userId: string
  ) {
    if (!imageFile) {
      return null;
    }

    const rawExtension =
      imageFile.name
        .split(".")
        .pop()
        ?.toLowerCase();

    const extension =
      rawExtension
        ?.replace(
          /[^a-z0-9]/g,
          ""
        ) || "jpg";

    const path =
      `${userId}/${crypto.randomUUID()}.${extension}`;

    const {
      error:
        uploadError,
    } =
      await supabase
        .storage
        .from(
          "poi-images"
        )
        .upload(
          path,
          imageFile,
          {
            cacheControl:
              "3600",

            upsert:
              false,

            contentType:
              imageFile.type,
          }
        );

    if (uploadError) {
      throw uploadError;
    }

    return path;
  }


  /* =========================================
     GUARDAR / ACTUALIZAR
     ========================================= */

  async function handleSave(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!name.trim()) {
      setError(
        "Escribe el nombre."
      );

      return;
    }

    if (!address.trim()) {
      setError(
        "Escribe la ubicación."
      );

      return;
    }

    if (!location) {
      setError(
        "Primero localiza el punto en el mapa."
      );

      return;
    }

    setSaving(true);

    setError("");
    setSuccess("");

    let newImagePath:
      | string
      | null = null;

    try {
      const user =
        await ensureUser();


      /*
       * Si hay foto nueva,
       * la subimos primero.
       */
      newImagePath =
        await uploadImage(
          user.id
        );


      /* =====================================
         EDITAR PUNTO EXISTENTE
         ===================================== */

      if (editingPoint) {
        const finalImagePath =
          newImagePath ??
          editingPoint.image_path;


        const {
          error:
            updateError,
        } =
          await supabase
            .from(
              "points_of_interest"
            )
            .update({
              name:
                name.trim(),

              address:
                address.trim(),

              matched_address:
                location
                  .formattedAddress,

              longitude:
                location.longitude,

              latitude:
                location.latitude,

              image_path:
                finalImagePath,
            })
            .eq(
              "id",
              editingPoint.id
            );


        if (updateError) {
          /*
           * Si subimos foto nueva
           * pero falla el update,
           * borramos esa foto.
           */
          if (
            newImagePath
          ) {
            await supabase
              .storage
              .from(
                "poi-images"
              )
              .remove([
                newImagePath,
              ]);
          }

          throw updateError;
        }


        /*
         * Update correcto:
         * si había foto antigua
         * y pusimos una nueva,
         * eliminamos la anterior.
         */
        if (
          newImagePath &&
          editingPoint
            .image_path
        ) {
          await supabase
            .storage
            .from(
              "poi-images"
            )
            .remove([
              editingPoint
                .image_path,
            ]);
        }


        setSuccess(
          "Punto de interés actualizado correctamente."
        );
      }


      /* =====================================
         CREAR PUNTO NUEVO
         ===================================== */

      else {
        const {
          error:
            insertError,
        } =
          await supabase
            .from(
              "points_of_interest"
            )
            .insert({
              user_id:
                user.id,

              name:
                name.trim(),

              address:
                address.trim(),

              matched_address:
                location
                  .formattedAddress,

              longitude:
                location.longitude,

              latitude:
                location.latitude,

              country_code:
                countryCode,

              country_name:
                countryName,

              admin1_id:
                admin1Id ??
                null,

              admin1_name:
                admin1Name ??
                null,

              admin2_id:
                admin2Id ??
                null,

              admin2_name:
                admin2Name ??
                null,

              admin3_id:
                admin3Id ??
                null,

              admin3_name:
                admin3Name ??
                null,

              image_path:
                newImagePath,
            });


        if (insertError) {
          if (
            newImagePath
          ) {
            await supabase
              .storage
              .from(
                "poi-images"
              )
              .remove([
                newImagePath,
              ]);
          }

          throw insertError;
        }


        setSuccess(
          "Punto de interés guardado correctamente."
        );
      }


      removeTemporaryMarker();

      setFormOpen(false);
      setEditingPoint(null);

      setName("");
      setAddress("");
      setImageFile(null);
      setLocation(null);

      await loadPoints();
    } catch (err) {
      console.error(
        "Error guardando POI:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se han podido guardar los cambios."
      );
    } finally {
      setSaving(false);
    }
  }


  /* =========================================
     CANCELAR FORMULARIO
     ========================================= */

  function handleCancel() {
    removeTemporaryMarker();

    setFormOpen(false);
    setEditingPoint(null);

    setName("");
    setAddress("");
    setImageFile(null);
    setLocation(null);

    setError("");
  }


  /* =========================================
     IR AL PUNTO
     ========================================= */

  function goToPoint(
    point: PointOfInterest
  ) {
    setSelectedPoint(point);

    if (!map) {
      return;
    }

    map.flyTo({
      center: [
        point.longitude,
        point.latitude,
      ],

      zoom: 17,

      pitch: 0,

      bearing: 0,

      duration: 1200,
    });
  }


  /* =========================================
     ELIMINAR
     ========================================= */

  async function deletePoint(
    point: PointOfInterest
  ) {
    const confirmed =
      window.confirm(
        `¿Quieres eliminar "${point.name}"?`
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const {
        error:
          deleteError,
      } =
        await supabase
          .from(
            "points_of_interest"
          )
          .delete()
          .eq(
            "id",
            point.id
          );

      if (deleteError) {
        throw deleteError;
      }


      if (
        point.image_path
      ) {
        const {
          error:
            imageError,
        } =
          await supabase
            .storage
            .from(
              "poi-images"
            )
            .remove([
              point.image_path,
            ]);

        if (imageError) {
          console.error(
            imageError
          );
        }
      }


      setSelectedPoint(null);

      setSuccess(
        "Punto de interés eliminado."
      );

      await loadPoints();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se ha podido eliminar el punto."
      );
    } finally {
      setDeleting(false);
    }
  }


  /* =========================================
     JSX
     ========================================= */

  return (
    <section className="poi-section">
      <div className="poi-heading">
        <div>
          <span className="poi-kicker">
            TU VIAJE
          </span>

          <h2>
            Puntos de interés
          </h2>

          {admin3Name && (
            <p>
              {admin3Name}
            </p>
          )}
        </div>

        {points.length >
          0 && (
          <span className="poi-count">
            {points.length}
          </span>
        )}
      </div>


      {!formOpen && (
        <button
          type="button"
          className="poi-add-button"
          onClick={
            openCreateForm
          }
        >
          <span className="poi-add-icon">
            ＋
          </span>

          <span>
            Añadir punto de interés
          </span>
        </button>
      )}


      {success && (
        <div className="poi-success">
          <span>
            ✓
          </span>

          {success}
        </div>
      )}


      {formOpen && (
        <form
          className="poi-form"
          onSubmit={
            handleSave
          }
        >
          <div className="poi-form-header">
            <div>
              <span>
                {editingPoint
                  ? "EDITANDO PUNTO"
                  : "NUEVO PUNTO"}
              </span>

              <h3>
                {editingPoint
                  ? "Editar lugar"
                  : "Añadir lugar"}
              </h3>
            </div>

            <button
              type="button"
              className="poi-close-button"
              onClick={
                handleCancel
              }
            >
              ×
            </button>
          </div>


          <label className="poi-field">
            <span>
              Nombre
            </span>

            <input
              type="text"
              value={name}
              onChange={
                handleNameChange
              }
              placeholder="Catedral de Colonia"
              required
            />
          </label>


          <label className="poi-field">
            <span>
              Ubicación
            </span>

            <textarea
              value={
                address
              }
              onChange={
                handleAddressChange
              }
              rows={3}
              required
            />
          </label>


          <button
            type="button"
            className="poi-locate-button"
            onClick={
              handleLocate
            }
            disabled={
              locating
            }
          >
            <span>
              ⌖
            </span>

            {locating
              ? "Buscando ubicación..."
              : location
                ? "Volver a localizar"
                : "Localizar en el mapa"}
          </button>


          {location && (
            <div className="poi-location-box">
              <div className="poi-location-top">
                <span className="poi-location-check">
                  ✓
                </span>

                <strong>
                  Ubicación preparada
                </strong>
              </div>

              <p>
                {
                  location
                    .formattedAddress
                }
              </p>

              <div className="poi-coordinates">
                <span>
                  LAT{" "}
                  {
                    location.latitude.toFixed(
                      6
                    )
                  }
                </span>

                <span>
                  LNG{" "}
                  {
                    location.longitude.toFixed(
                      6
                    )
                  }
                </span>
              </div>

              <small>
                También puedes
                arrastrar el marcador.
              </small>
            </div>
          )}


          <label className="poi-upload">
            <span className="poi-upload-title">
              {editingPoint
                ?.image_path
                ? "Cambiar imagen"
                : "Imagen"}
            </span>

            <div className="poi-upload-box">
              <span className="poi-upload-icon">
                ▧
              </span>

              <div>
                <strong>
                  {imageFile
                    ? imageFile.name
                    : editingPoint
                        ?.image_path
                      ? "Seleccionar una imagen nueva"
                      : "Seleccionar imagen"}
                </strong>

                <small>
                  JPG, PNG o WebP · máximo 5 MB
                </small>
              </div>
            </div>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={
                handleImageChange
              }
            />
          </label>


          {imagePreview && (
            <div className="poi-preview-wrapper">
              <img
                src={
                  imagePreview
                }
                alt="Nueva imagen"
                className="poi-image-preview"
              />

              <span>
                NUEVA IMAGEN
              </span>
            </div>
          )}


          {!imagePreview &&
            editingPoint
              ?.imageUrl && (
            <div className="poi-preview-wrapper">
              <img
                src={
                  editingPoint
                    .imageUrl
                }
                alt={
                  editingPoint
                    .name
                }
                className="poi-image-preview"
              />

              <span>
                IMAGEN ACTUAL
              </span>
            </div>
          )}


          {error && (
            <div className="poi-error">
              <span>
                !
              </span>

              {error}
            </div>
          )}


          <div className="poi-form-actions">
            <button
              type="button"
              className="poi-cancel-button"
              onClick={
                handleCancel
              }
              disabled={
                saving
              }
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="poi-save-button"
              disabled={
                saving ||
                !location
              }
            >
              {saving
                ? "Guardando..."
                : editingPoint
                  ? "Guardar cambios"
                  : "Guardar punto"}
            </button>
          </div>
        </form>
      )}


      {loadingPoints && (
        <div className="poi-loading">
          <span className="poi-loading-dot" />

          Cargando lugares...
        </div>
      )}


      {!loadingPoints &&
        points.length >
          0 && (
          <div className="poi-list-wrapper">
            <div className="poi-list-header">
              <span>
                LUGARES GUARDADOS
              </span>

              <span>
                {points.length}
              </span>
            </div>

            <div className="poi-list">
              {points.map(
                (
                  point,
                  index
                ) => (
                  <button
                    key={
                      point.id
                    }
                    type="button"
                    className="poi-card"
                    onClick={() =>
                      goToPoint(
                        point
                      )
                    }
                  >
                    <div className="poi-card-number">
                      {String(
                        index + 1
                      ).padStart(
                        2,
                        "0"
                      )}
                    </div>

                    {point.imageUrl ? (
                      <img
                        className="poi-card-image"
                        src={
                          point.imageUrl
                        }
                        alt={
                          point.name
                        }
                      />
                    ) : (
                      <div className="poi-card-placeholder">
                        📍
                      </div>
                    )}

                    <div className="poi-card-content">
                      <strong>
                        {
                          point.name
                        }
                      </strong>

                      <span>
                        {
                          point.address
                        }
                      </span>
                    </div>

                    <span className="poi-card-arrow">
                      →
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        )}


      {!loadingPoints &&
        points.length ===
          0 &&
        !formOpen && (
          <div className="poi-empty">
            <div className="poi-empty-icon">
              ⌖
            </div>

            <strong>
              Todavía no hay lugares guardados
            </strong>

            <span>
              Añade cualquier lugar
              que quieras visitar.
            </span>
          </div>
        )}


      {/* =====================================
          FICHA DEL PUNTO
          ===================================== */}

      {selectedPoint && (
        <div className="poi-detail-overlay">
          <article className="poi-detail-card">
            <button
              type="button"
              className="poi-detail-close"
              onClick={() =>
                setSelectedPoint(
                  null
                )
              }
            >
              ×
            </button>


            {selectedPoint.imageUrl ? (
              <div className="poi-detail-image-wrapper">
                <img
                  src={
                    selectedPoint
                      .imageUrl
                  }
                  alt={
                    selectedPoint
                      .name
                  }
                  className="poi-detail-image"
                />

                <div className="poi-detail-image-overlay" />
              </div>
            ) : (
              <div className="poi-detail-no-image">
                <span>
                  📍
                </span>
              </div>
            )}


            <div className="poi-detail-content">
              <span className="poi-detail-kicker">
                PUNTO DE INTERÉS
              </span>

              <h3>
                {
                  selectedPoint
                    .name
                }
              </h3>


              <div className="poi-detail-location">
                <span>
                  ⌖
                </span>

                <p>
                  {
                    selectedPoint
                      .address
                  }
                </p>
              </div>


              <div className="poi-detail-meta">
                {selectedPoint
                  .admin3_name && (
                  <div>
                    <span>
                      MUNICIPIO
                    </span>

                    <strong>
                      {
                        selectedPoint
                          .admin3_name
                      }
                    </strong>
                  </div>
                )}

                <div>
                  <span>
                    PAÍS
                  </span>

                  <strong>
                    {
                      selectedPoint
                        .country_name
                    }
                  </strong>
                </div>
              </div>


              <div className="poi-detail-coordinates">
                <span>
                  LAT{" "}
                  {
                    selectedPoint
                      .latitude
                      .toFixed(
                        6
                      )
                  }
                </span>

                <span>
                  LNG{" "}
                  {
                    selectedPoint
                      .longitude
                      .toFixed(
                        6
                      )
                  }
                </span>
              </div>


              <div className="poi-detail-actions poi-detail-actions-three">
                <button
                  type="button"
                  className="poi-detail-map-button"
                  onClick={() =>
                    goToPoint(
                      selectedPoint
                    )
                  }
                >
                  ⌖ Ver mapa
                </button>

                <button
                  type="button"
                  className="poi-detail-edit-button"
                  onClick={() =>
                    openEditForm(
                      selectedPoint
                    )
                  }
                >
                  ✎ Editar
                </button>

                <button
                  type="button"
                  className="poi-detail-delete-button"
                  onClick={() =>
                    deletePoint(
                      selectedPoint
                    )
                  }
                  disabled={
                    deleting
                  }
                >
                  {deleting
                    ? "..."
                    : "Eliminar"}
                </button>
              </div>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

export default PointOfInterestPanel;