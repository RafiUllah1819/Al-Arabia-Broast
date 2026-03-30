import { AuthProvider } from "../contexts/AuthContext";
import AppLayout from "../components/layout/AppLayout";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AppLayout>
        <Component {...pageProps} />
      </AppLayout>
    </AuthProvider>
  );
}
