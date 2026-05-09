/**
 * Copy text to the clipboard, with a fallback for insecure contexts.
 *
 * `navigator.clipboard.writeText` requires a secure context (HTTPS or
 * localhost) and a recent browser. On HTTP it throws. We feature-test for
 * it and otherwise fall back to a hidden textarea + `document.execCommand`
 * — yes deprecated, but still widely supported and usable in HTTP contexts.
 *
 * Returns `true` on success, `false` if the copy failed (the caller should
 * surface a "select and copy manually" message in that case).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path
    }
  }

  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  // Avoid scrolling the page and make the element invisible.
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.padding = "0";
  textarea.style.border = "none";
  textarea.style.outline = "none";
  textarea.style.boxShadow = "none";
  textarea.style.background = "transparent";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);

  let succeeded = false;
  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    succeeded = document.execCommand("copy");
  } catch {
    succeeded = false;
  } finally {
    document.body.removeChild(textarea);
  }

  return succeeded;
}
