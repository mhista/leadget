/**
 * Plain punctuation for anything a client reads. Em and en dashes read as
 * machine-written, so outgoing text uses commas, colons and full stops
 * instead. Number ranges ("2–3 weeks") are kept.
 */
export function plain(text: string) {
  if (!text) return text;
  return text
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1-$2")            // 2–3 → 2-3
    .replace(/\s*[—–]\s*\n/g, "\n")                      // dash at a line end
    .replace(/(^|\n)\s*[—–]\s*/g, "$1- ")                // dash used as a bullet
    .replace(/([?!.:])\s*[—–]\s*/g, "$1 ")               // "really? — yes"
    .replace(/\s*[—–]\s*/g, ", ")                        // the clause dash
    .replace(/,\s*,/g, ",")
    .replace(/,\s*([.?!:;])/g, "$1")
    .replace(/[ \t]{2,}/g, " ");
}
