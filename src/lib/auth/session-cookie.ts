/** Shared cookie name. Kept dependency-free so anything can import it without
 *  pulling in `server-only`, the DB client, or next/headers. */
export const SESSION_COOKIE = "ecom_inv_session";
