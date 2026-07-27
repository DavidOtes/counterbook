import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import { query, where } from "firebase/firestore";
import { businessesCol } from "../data/db";
import { useLiveQuery } from "../data/hooks";
import { useAuth } from "./AuthContext";
import { fmtMoney } from "../lib/format";
import { itemNoun } from "../domain/presets";
import type { Business, Modules } from "../domain/types";
import { Onboarding } from "../screens/Onboarding";
import { Splash } from "../components/Splash";

interface BizCtx {
  business: Business;
  businesses: Business[];
  modules: Modules;
  /** minor units -> formatted money in the business currency */
  fmt: (minor: number) => string;
  /** "Products" | "Services" | "Items & services" */
  noun: string;
  selectBusiness: (id: string) => void;
}

const Ctx = createContext<BizCtx | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const { data: businesses, loading } = useLiveQuery<Business>(
    () => (uid ? query(businessesCol(), where("memberUids", "array-contains", uid)) : null),
    [uid],
  );

  const storedId = localStorage.getItem("invoice.bizId");
  const business = businesses.find((b) => b.id === storedId) ?? businesses[0] ?? null;

  const fmt = useCallback(
    (minor: number) => fmtMoney(minor, business?.currency ?? "USD"),
    [business?.currency],
  );

  const selectBusiness = useCallback((id: string) => {
    localStorage.setItem("invoice.bizId", id);
  }, []);

  if (loading) return <Splash />;
  if (!business) return <Onboarding />;

  return (
    <Ctx.Provider
      value={{
        business,
        businesses,
        modules: business.modules,
        fmt,
        noun: itemNoun(business.type),
        selectBusiness,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useBusiness(): BizCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBusiness must be used inside BusinessProvider");
  return ctx;
}
