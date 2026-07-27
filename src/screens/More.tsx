import { Link } from "react-router";
import { signOutUser, useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import { BoxIcon, GearIcon, WalletIcon } from "../components/icons";
import { PageTitle } from "../components/ui";

export function More() {
  const { business, noun } = useBusiness();
  const { user } = useAuth();

  const links = [
    { to: "/items", label: noun, icon: BoxIcon, blurb: "Saved prices, barcodes and stock" },
    { to: "/expenses", label: "Expenses", icon: WalletIcon, blurb: "Money going out, with receipt photos" },
    { to: "/settings", label: "Settings", icon: GearIcon, blurb: "Business details, modules, receipt footer" },
  ];

  return (
    <div className="anim-fade">
      <PageTitle sub={business.name}>More</PageTitle>
      <ul>
        {links.map(({ to, label, icon: Icon, blurb }) => (
          <li key={to}>
            <Link to={to} className="ledger-row hover:bg-card">
              <Icon width={22} height={22} className="text-ink-soft" />
              <div className="flex-1">
                <p className="font-medium">{label}</p>
                <p className="text-[13px] text-ink-faint">{blurb}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 border-t border-line pt-4">
        <p className="text-[13px] text-ink-faint">{user?.email}</p>
        <button
          onClick={signOutUser}
          className="mt-1 text-[14px] font-semibold text-ink-soft hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
