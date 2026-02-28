import { grants, faculty, users, type Grant, type InsertGrant, type Faculty, type User, type InsertUser } from "@shared/schema";

export interface IStorage {
  getGrants(): Promise<Grant[]>;
  getFaculty(): Promise<Faculty[]>;
  // Add other methods if your app needs them
}

export class MemStorage implements IStorage {
  private _grants: Map<number, Grant>;
  private _faculty: Map<number, Faculty>;

  constructor() {
    this._grants = new Map();
    this._faculty = new Map();
  }

  async getGrants(): Promise<Grant[]> {
    return Array.from(this._grants.values());
  }

  async getFaculty(): Promise<Faculty[]> {
    return Array.from(this._faculty.values());
  }
}

// This is the line that was causing the ReferenceError
export const storage = new MemStorage();
