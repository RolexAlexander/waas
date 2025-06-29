import Dexie, { Table } from 'dexie';
import { SavedSession, WaaSState } from '../types';

// The WaasDexieDB class is removed to fix a TypeScript type error where `version` was not found.
// Instead, we directly create a Dexie instance and define its schema, which is a more robust pattern.
const db = new Dexie('waasDB') as Dexie & {
  sessions: Table<SavedSession>;
};

db.version(1).stores({
  sessions: 'id, name', // Primary key and index on name
});

export { db };

const SESSION_ID = 1; // Use a fixed ID for the autosaving session.

export const saveStateToDB = async (state: WaaSState) => {
    try {
        await db.sessions.put({
            id: SESSION_ID,
            name: "Last Session",
            state: JSON.parse(JSON.stringify(state)), // Ensure state is plain JSON
            createdAt: new Date(),
        });
    } catch(error) {
        console.error("Failed to save state to IndexedDB:", error);
    }
};

export const loadStateFromDB = async (): Promise<WaaSState | null> => {
    try {
        const session = await db.sessions.get(SESSION_ID);
        if (session) {
            console.log("Session state loaded from IndexedDB.");
            return session.state;
        }
        return null;
    } catch (error) {
        console.error("Failed to load state from IndexedDB:", error);
        return null;
    }
};

export const clearStateFromDB = async () => {
    try {
        await db.sessions.delete(SESSION_ID);
        console.log("Session state cleared from IndexedDB.");
    } catch (error) {
        console.error("Failed to clear state from IndexedDB:", error);
    }
};