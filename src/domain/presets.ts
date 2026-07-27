import type { BusinessType, Modules, JobStage, PaymentMethod } from "./types";

/**
 * One app, many kinds of business. The business type chosen at onboarding
 * is a PRESET, not a fork: it toggles modules and adjusts vocabulary.
 * Everything shares the same data model underneath.
 */

export interface BusinessTypeOption {
  value: BusinessType;
  title: string;
  blurb: string;
  modules: Modules;
}

export const BUSINESS_TYPES: BusinessTypeOption[] = [
  {
    value: "retail",
    title: "Shop / retail",
    blurb: "I sell products and want to track stock",
    modules: { inventory: true, jobs: false },
  },
  {
    value: "services",
    title: "Services / repairs",
    blurb: "I do jobs or repairs for customers",
    modules: { inventory: false, jobs: true },
  },
  {
    value: "mixed",
    title: "Both",
    blurb: "I do jobs and also sell products",
    modules: { inventory: true, jobs: true },
  },
];

export function itemNoun(type: BusinessType): string {
  if (type === "retail") return "Products";
  if (type === "services") return "Services";
  return "Items & services";
}

export const CURRENCIES = [
  { code: "NGN", label: "₦ Nigerian naira" },
  { code: "GHS", label: "₵ Ghanaian cedi" },
  { code: "KES", label: "KSh Kenyan shilling" },
  { code: "ZAR", label: "R South African rand" },
  { code: "USD", label: "$ US dollar" },
  { code: "GBP", label: "£ British pound" },
  { code: "EUR", label: "€ Euro" },
  { code: "INR", label: "₹ Indian rupee" },
];

export const JOB_STAGES: { value: JobStage; label: string }[] = [
  { value: "intake", label: "Received" },
  { value: "in_progress", label: "In progress" },
  { value: "ready", label: "Ready" },
  { value: "delivered", label: "Delivered" },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Transfer" },
  { value: "pos", label: "POS" },
  { value: "other", label: "Other" },
];

export const EXPENSE_CATEGORIES = [
  "Stock / supplies",
  "Rent",
  "Power / fuel",
  "Transport",
  "Salaries",
  "Equipment",
  "Data / airtime",
  "Other",
];
