import {
  collection,
  doc,
  type DocumentData,
  type FirestoreDataConverter,
  type WithFieldValue,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type {
  Business,
  Customer,
  Expense,
  Invoice,
  Item,
  Payment,
  StockMovement,
} from "../domain/types";

/** Generic converter: document id lives on the object, never in the data. */
function conv<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(value: WithFieldValue<T>): DocumentData {
      const { id: _id, ...rest } = value as DocumentData;
      return rest;
    },
    fromFirestore(snap): T {
      return { id: snap.id, ...snap.data() } as T;
    },
  };
}

export const businessesCol = () => collection(db, "businesses").withConverter(conv<Business>());
export const businessDoc = (bizId: string) =>
  doc(db, "businesses", bizId).withConverter(conv<Business>());

const sub = <T extends { id: string }>(bizId: string, name: string) =>
  collection(db, "businesses", bizId, name).withConverter(conv<T>());

export const customersCol = (b: string) => sub<Customer>(b, "customers");
export const itemsCol = (b: string) => sub<Item>(b, "items");
export const invoicesCol = (b: string) => sub<Invoice>(b, "invoices");
export const paymentsCol = (b: string) => sub<Payment>(b, "payments");
export const expensesCol = (b: string) => sub<Expense>(b, "expenses");
export const movementsCol = (b: string) => sub<StockMovement>(b, "stockMovements");
