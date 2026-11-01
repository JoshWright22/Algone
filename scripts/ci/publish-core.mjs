// Small decisions shared by the store publish scripts.

/** Chrome reports progress in uploadState, or lastAsyncUploadState from fetchStatus. */
export const chromeUploadState = (body) => body?.uploadState ?? body?.lastAsyncUploadState ?? "UNKNOWN";

/** Edge returns the operation ID in Location, either bare or as a URL path. */
export function edgeOperationId(location) {
  const id = String(location ?? "").trim().replace(/\/+$/, "").split("/").at(-1);
  if (!id) throw new Error("Edge response had no Location header");
  return id;
}
