/**
 * system-settings — the maintenance flag and the operator's broadcast content.
 * One settings document exists, under a fixed key, so the read is a point
 * lookup and the write is an upsert against the same key. Nothing here is
 * per-user: this is what the whole instance is doing.
 */
import type { Collection } from 'mongodb';
import type { AnnouncementDoc, DocFeatureDoc, SystemSettingsDoc } from '@ereuna/shared';
import { getDb } from '@/lib/db.js';

/** The single settings document's key. */
const SETTINGS_KEY = 'app';

const MAX_ITEMS = 200;

export type MaintenanceStatus = {
    maintenanceMode: boolean;
    message: string | null;
    updatedAt: Date | null;
};

export type Announcement = {
    title: string;
    body: string;
    publishedDate: string; // ISO 8601
};

export type DocFeature = {
    title: string;
    body: string;
};

/**
 * Whether the instance is in maintenance.
 * A missing settings document means the instance has never been put into
 * maintenance, which reads as "not in maintenance" rather than as an error —
 * the status endpoint has to answer even on a fresh database.
 */
export async function maintenanceStatus(): Promise<MaintenanceStatus> {
    const doc = await settings().findOne({ key: SETTINGS_KEY });
    if (doc === null) return { maintenanceMode: false, message: null, updatedAt: null };

    return { maintenanceMode: doc.maintenanceMode, message: doc.message, updatedAt: doc.updatedAt };
}

export async function setMaintenance(maintenanceMode: boolean, message: string | null): Promise<MaintenanceStatus> {
    const updatedAt = new Date();
    await settings().updateOne(
        { key: SETTINGS_KEY },
        { $set: { maintenanceMode, message, updatedAt }, $setOnInsert: { key: SETTINGS_KEY } },
        { upsert: true },
    );

    return { maintenanceMode, message, updatedAt };
}

/** Operator announcements, newest first. */
export async function announcements(): Promise<Announcement[]> {
    const docs = await getDb()
        .collection<AnnouncementDoc>('Alerts')
        .find({})
        .sort({ publishedDate: -1 })
        .limit(MAX_ITEMS)
        .toArray();

    return docs.map((doc) => ({
        title: doc.title,
        body: doc.body,
        publishedDate: new Date(doc.publishedDate).toISOString(),
    }));
}

/** Documented features, newest first. */
export async function docFeatures(): Promise<DocFeature[]> {
    const docs = await getDb()
        .collection<DocFeatureDoc>('Docs')
        .find({})
        .sort({ _id: -1 })
        .limit(MAX_ITEMS)
        .toArray();

    return docs.map((doc) => ({ title: doc.title, body: doc.body }));
}

function settings(): Collection<SystemSettingsDoc> {
    return getDb().collection<SystemSettingsDoc>('systemSettings');
}
