import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "./lib/supabase";

import AuthScreen from "./components/AuthScreen";

type Props = {
  children: ReactNode;
};

function AuthGate({ children }: Props) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [loggingOut, setLoggingOut] =
    useState(false);

  useEffect(() => {
    /*
     * Comprobamos si ya existe
     * una sesión guardada.
     */
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      });

    /*
     * Escuchamos los cambios
     * de autenticación.
     */
    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession);
          setLoading(false);
        }
      );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      /*
       * No hace falta hacer:
       *
       * setSession(null)
       *
       * onAuthStateChange lo hará
       * automáticamente.
       */
    } catch (error) {
      console.error(
        "Error cerrando sesión:",
        error
      );
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05080c",
          color: "white",
        }}
      >
        Cargando...
      </div>
    );
  }

  /*
   * Sin sesión:
   * mostramos Login.
   */
  if (!session) {
    return <AuthScreen />;
  }

  /*
   * Con sesión:
   * mostramos la aplicación.
   */
  return (
    <>
      {children}

      <div
        style={{
          position: "fixed",
          right: "20px",
          bottom: "20px",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "8px 8px 8px 14px",
          border:
            "1px solid rgba(255,255,255,0.15)",
          borderRadius: "999px",
          background:
            "rgba(5,8,12,0.9)",
          color: "white",
          backdropFilter: "blur(15px)",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            opacity: 0.65,
          }}
        >
          {session.user.email}
        </span>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            minHeight: "34px",
            padding: "0 14px",
            border:
              "1px solid rgba(255,255,255,0.15)",
            borderRadius: "999px",
            background:
              "rgba(255,255,255,0.08)",
            color: "white",
            fontSize: "10px",
            fontWeight: 700,
            cursor: loggingOut
              ? "default"
              : "pointer",
          }}
        >
          {loggingOut
            ? "Saliendo..."
            : "Cerrar sesión"}
        </button>
      </div>
    </>
  );
}

export default AuthGate;