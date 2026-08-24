import {
  useState,
  type FormEvent,
} from "react";

import {
  supabase,
} from "../lib/supabase";

import "./AuthScreen.css";


type AuthMode =
  | "login"
  | "register";


function AuthScreen() {
  const [
    mode,
    setMode,
  ] =
    useState<AuthMode>(
      "login"
    );

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");


  function changeMode(
    newMode: AuthMode
  ) {
    setMode(
      newMode
    );

    setError("");
    setMessage("");

    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }


  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (!cleanEmail) {
      setError(
        "Introduce tu correo electrónico."
      );

      return;
    }

    if (
      password.length < 6
    ) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );

      return;
    }

    if (
      mode === "register" &&
      password !==
        confirmPassword
    ) {
      setError(
        "Las contraseñas no coinciden."
      );

      return;
    }

    setLoading(true);

    try {
      /*
       * ==========================
       * INICIAR SESIÓN
       * ==========================
       */

      if (
        mode === "login"
      ) {
        const {
          error:
            signInError,
        } =
          await supabase
            .auth
            .signInWithPassword({
              email:
                cleanEmail,

              password,
            });

        if (signInError) {
          throw signInError;
        }

        return;
      }


      /*
       * ==========================
       * CREAR CUENTA
       * ==========================
       */

      const {
        data,
        error:
          signUpError,
      } =
        await supabase
          .auth
          .signUp({
            email:
              cleanEmail,

            password,

            options: {
              emailRedirectTo:
                window.location
                  .origin,
            },
          });

      if (signUpError) {
        throw signUpError;
      }


      /*
       * Confirmación de correo
       * activada en Supabase.
       */

      if (
        !data.session
      ) {
        setMessage(
          "Cuenta creada. Te hemos enviado un correo de confirmación."
        );

        setMode(
          "login"
        );

        setPassword("");
        setConfirmPassword("");

        return;
      }

    } catch (err) {
      console.error(
        err
      );

      setError(
        err instanceof Error
          ? translateAuthError(
              err.message
            )
          : "Ha ocurrido un error."
      );

    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="auth-page">

      {/* =================================
          PARTE IZQUIERDA
          ================================= */}

      <section className="auth-hero">

        <div className="auth-hero-glow auth-glow-one" />

        <div className="auth-hero-glow auth-glow-two" />


        <div className="auth-brand">
          <div className="auth-logo">
            ✦
          </div>

          <span>
            MIS VIAJES
          </span>
        </div>


        <div className="auth-hero-content">

          <span className="auth-eyebrow">
            TU MUNDO · TUS VIAJES
          </span>

          <h1>
            Explora.
            <br />

            Guarda.
            <br />

            <em>
              Recuerda.
            </em>
          </h1>

          <p>
            Organiza todos los lugares
            que quieres descubrir y
            construye tu propio mapa
            personal del mundo.
          </p>


          <div className="auth-benefits">

            <div>
              <span>
                01
              </span>

              <p>
                Explora cualquier país
                del mundo.
              </p>
            </div>

            <div>
              <span>
                02
              </span>

              <p>
                Guarda tus puntos de
                interés.
              </p>
            </div>

            <div>
              <span>
                03
              </span>

              <p>
                Prepara tus próximos
                viajes.
              </p>
            </div>

          </div>
        </div>


        <div className="auth-hero-bottom">
          <span>
            40.7128° N
          </span>

          <div />

          <span>
            74.0060° W
          </span>
        </div>

      </section>


      {/* =================================
          FORMULARIO
          ================================= */}

      <section className="auth-form-side">

        <div className="auth-mobile-logo">
          <div>
            ✦
          </div>

          MIS VIAJES
        </div>


        <div className="auth-box">

          <header className="auth-heading">

            <span>
              {mode === "login"
                ? "BIENVENIDO DE NUEVO"
                : "EMPIEZA TU VIAJE"}
            </span>

            <h2>
              {mode === "login"
                ? "Iniciar sesión"
                : "Crear una cuenta"}
            </h2>

            <p>
              {mode === "login"
                ? "Accede a tus lugares y continúa organizando tus próximos viajes."
                : "Crea tu cuenta y empieza a construir tu mapa personal."}
            </p>

          </header>


          {/* TABS */}

          <div className="auth-tabs">

            <button
              type="button"
              className={
                mode ===
                "login"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeMode(
                  "login"
                )
              }
            >
              Iniciar sesión
            </button>


            <button
              type="button"
              className={
                mode ===
                "register"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeMode(
                  "register"
                )
              }
            >
              Crear cuenta
            </button>

          </div>


          <form
            className="auth-form"
            onSubmit={
              handleSubmit
            }
          >

            {/* EMAIL */}

            <label className="auth-field">

              <span>
                Correo electrónico
              </span>

              <div className="auth-input-wrapper">

                <input
                  type="email"
                  value={
                    email
                  }
                  onChange={(
                    event
                  ) =>
                    setEmail(
                      event.target
                        .value
                    )
                  }
                  placeholder="tu@email.com"
                  autoComplete="email"
                  required
                />

              </div>

            </label>


            {/* CONTRASEÑA */}

            <label className="auth-field">

              <span>
                Contraseña
              </span>

              <div className="auth-input-wrapper auth-password-wrapper">

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    password
                  }
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event.target
                        .value
                    )
                  }
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={
                    mode ===
                    "login"
                      ? "current-password"
                      : "new-password"
                  }
                  required
                />


                <button
                  type="button"
                  className="auth-show-password"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
                    )
                  }
                >
                  {showPassword
                    ? "Ocultar"
                    : "Mostrar"}
                </button>

              </div>

            </label>


            {/* REPETIR CONTRASEÑA */}

            {mode ===
              "register" && (

              <label className="auth-field">

                <span>
                  Repite la contraseña
                </span>

                <div className="auth-input-wrapper">

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      confirmPassword
                    }
                    onChange={(
                      event
                    ) =>
                      setConfirmPassword(
                        event.target
                          .value
                      )
                    }
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                    required
                  />

                </div>

              </label>
            )}


            {/* AVISO DE REGISTRO */}

            {mode ===
              "register" && (

              <div className="auth-register-info">

                <span>
                  ✦
                </span>

                <p>
                  Te enviaremos un correo
                  para confirmar tu cuenta
                  antes de iniciar sesión.
                </p>

              </div>
            )}


            {/* ERROR */}

            {error && (

              <div className="auth-error">

                <span>
                  !
                </span>

                <p>
                  {error}
                </p>

              </div>
            )}


            {/* MENSAJE */}

            {message && (

              <div className="auth-success">

                <span>
                  ✓
                </span>

                <p>
                  {message}
                </p>

              </div>
            )}


            {/* ENTRAR */}

            <button
              type="submit"
              className="auth-submit"
              disabled={
                loading
              }
            >

              <span>
                {loading
                  ? "Espera..."
                  : mode ===
                      "login"
                    ? "Entrar"
                    : "Crear mi cuenta"}
              </span>

              {!loading && (
                <span className="auth-submit-arrow">
                  →
                </span>
              )}

            </button>

          </form>


          {/* CAMBIO MODO */}

          <div className="auth-switch">

            <span>
              {mode === "login"
                ? "¿Todavía no tienes cuenta?"
                : "¿Ya tienes una cuenta?"}
            </span>

            <button
              type="button"
              onClick={() =>
                changeMode(
                  mode ===
                    "login"
                    ? "register"
                    : "login"
                )
              }
            >
              {mode ===
              "login"
                ? "Crear cuenta"
                : "Iniciar sesión"}
            </button>

          </div>


          <footer className="auth-footer">
            <span>
              Tus datos están asociados
              únicamente a tu cuenta.
            </span>
          </footer>

        </div>

      </section>

    </main>
  );
}


function translateAuthError(
  message: string
) {
  const lower =
    message.toLowerCase();


  if (
    lower.includes(
      "invalid login credentials"
    )
  ) {
    return "El correo o la contraseña no son correctos.";
  }


  if (
    lower.includes(
      "email not confirmed"
    )
  ) {
    return "Debes confirmar tu correo antes de iniciar sesión.";
  }


  if (
    lower.includes(
      "user already registered"
    )
  ) {
    return "Ya existe una cuenta con ese correo.";
  }


  if (
    lower.includes(
      "password"
    )
  ) {
    return "La contraseña no cumple los requisitos.";
  }


  return message;
}


export default AuthScreen;