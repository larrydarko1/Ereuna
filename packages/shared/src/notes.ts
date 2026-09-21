/** The notes contract — the shapes `/api/notes` answers with. Timestamps are ISO 8601 strings. */

export type NoteRow = {
    id: string;
    symbol: string;
    message: string;
    createdAt: string;
    updatedAt: string;
};

export type NotePage = {
    items: NoteRow[];
    total: number;
    page: number;
    limit: number;
};
