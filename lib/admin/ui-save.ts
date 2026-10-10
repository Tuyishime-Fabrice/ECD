/**
 * What a finished save leaves behind in the dashboard. A save can take a while (one
 * request per group of new pictures), and editing goes on meanwhile: anything changed
 * after Save was pressed stays as an unsaved change on top of what was saved. It is
 * never overwritten by the copy that was sent.
 */

/** A line for the History summary ("Changed story “Keza”"); `seq` says when it was written. */
export type Note = { text: string; seq: number };

/** The draft after a save: what was saved, or the newer draft if it changed during the save. */
export function draftAfterSave<T>(current: T, sent: T, saved: T): T {
  return JSON.stringify(current) === JSON.stringify(sent) ? saved : current;
}

/** Only notes written after Save was pressed (`seq` above `sentUpTo`) are still unsaved. */
export function notesAfterSave(notes: ReadonlyMap<string, Note>, sentUpTo: number): Map<string, Note> {
  return new Map([...notes].filter(([, note]) => note.seq > sentUpTo));
}
