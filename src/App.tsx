import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { firebaseReady } from "./lib/firebase";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { BusinessProvider } from "./context/BusinessContext";
import { Shell } from "./components/Shell";
import { Splash } from "./components/Splash";
import { SetupNeeded } from "./screens/SetupNeeded";
import { SignIn } from "./screens/SignIn";
import { Dashboard } from "./screens/Dashboard";
import { Invoices } from "./screens/Invoices";
import { NewInvoice } from "./screens/NewInvoice";
import { InvoiceDetail } from "./screens/InvoiceDetail";
import { Customers } from "./screens/Customers";
import { CustomerDetail } from "./screens/CustomerDetail";
import { Items } from "./screens/Items";
import { Expenses } from "./screens/Expenses";
import { Jobs } from "./screens/Jobs";
import { More } from "./screens/More";
import { Settings } from "./screens/Settings";

function Gate() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <SignIn />;
  return (
    <BusinessProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/new" element={<NewInvoice />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="items" element={<Items />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="more" element={<More />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BusinessProvider>
  );
}

export default function App() {
  if (!firebaseReady) return <SetupNeeded />;
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  );
}
