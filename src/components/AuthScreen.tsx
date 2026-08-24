import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

type AuthMode = "login" | "register";

function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Introduce tu correo electrónico.");
      return;
    }

    if (!password) {
      setError("Introduce tu contraseña.");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      /*
       * ==========================
       * INICIAR SESIÓN
       * ==========================
       */

      if (mode === "login") {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
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

      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,

          options: {
            emailRedirectTo: window.location.origin,
          },
        });

      if (signUpError) {
        throw signUpError;
      }

      /*
       * Si tienes activada la
       * confirmación por correo,
       * Supabase no inicia sesión
       * hasta que confirmes el email.
       */

      if (!data.session) {
        setMessage(
          "Cuenta creada. Revisa tu correo y confirma tu cuenta antes de iniciar sesión."
        );

        setMode("login");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(translateAuthError(err.message));
      } else {
        setError("Ha ocurrido un error.");
      }
    } finally {
      setLoading(false);
    }
  }

  function changeMode(newMode: AuthMode) {
    setMode(newMode);

    setError("");
    setMessage("");

    setPassword("");
    setConfirmPassword("");
  }

  return (
    <main>
      <div>
        <h1>Mis Viajes</h1>

        <p>
          Guarda tus viajes y puntos de interés alrededor del mundo.
        </p>

        <div>
          <button
            type="button"
            onClick={() => changeMode("login")}
          >
            Iniciar sesión
          </button>

          <button
            type="button"
            onClick={() => changeMode("register")}
          >
            Crear cuenta
          </button>
        </div>

        <h2>
          {mode === "login"
            ? "Iniciar sesión"
            : "Crear cuenta"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">
              Correo electrónico
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="tu@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="password">
              Contraseña
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Tu contraseña"
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              required
            />
          </div>

          {mode === "register" && (
            <div>
              <label htmlFor="confirm-password">
                Repite la contraseña
              </label>

              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {error && (
            <p>
              {error}
            </p>
          )}

          {message && (
            <p>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Espera..."
              : mode === "login"
                ? "Entrar"
                : "Crear mi cuenta"}
          </button>
        </form>
      </div>
    </main>
  );
}

function translateAuthError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "El correo o la contraseña no son correctos.";
  }

  if (lower.includes("email not confirmed")) {
    return "Primero tienes que confirmar tu correo electrónico.";
  }

  if (lower.includes("user already registered")) {
    return "Ya existe una cuenta con ese correo.";
  }

  if (lower.includes("password")) {
    return "Hay un problema con la contraseña. Comprueba que cumple los requisitos.";
  }

  return message;
}

export default AuthScreen;