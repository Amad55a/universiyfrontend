export const extractPdfHeadings = async (pdf) => {
  const headings = [];
  const lastSeenPage = new Map();

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    let content;
    let viewport;
    try {
      const page = await pdf.getPage(pageNumber);
      [content, viewport] = await Promise.all([
        page.getTextContent(),
        Promise.resolve(page.getViewport({ scale: 1 })),
      ]);
    } catch (error) {
      console.error(`Unable to inspect PDF page ${pageNumber} for headings.`, error);
      continue;
    }

    const lines = [];
    const contentItems = Array.isArray(content?.items) ? content.items : [];
    for (const item of contentItems) {
      const text = typeof item.str === "string" ? item.str.trim() : "";
      const height = Number(item.height);
      const y = Number(item.transform?.[5]);
      if (!text || !Number.isFinite(height) || height <= 0 || !Number.isFinite(y)) continue;

      let line = lines.find((candidate) =>
        Math.abs(candidate.y - y) <= Math.max(2, height * 0.25)
      );
      if (!line) {
        line = { y, height, text: "" };
        lines.push(line);
      }
      line.height = Math.max(line.height, height);
      line.text = `${line.text}${line.text ? " " : ""}${text}`;
    }

    const bodySizes = lines.map((line) => line.height).sort((a, b) => a - b);
    if (!bodySizes.length || !Number.isFinite(viewport.height)) continue;
    const middle = Math.floor(bodySizes.length / 2);
    const medianSize = bodySizes.length % 2
      ? bodySizes[middle]
      : (bodySizes[middle - 1] + bodySizes[middle]) / 2;

    for (const line of lines) {
      const title = line.text.replace(/\s+/g, " ").trim();
      const top = viewport.height - line.y;
      const normalizedTitle = title.toLocaleLowerCase();
      const previousPage = lastSeenPage.get(normalizedTitle);
      if (
        title.length < 4 ||
        title.length > 120 ||
        !/\p{L}/u.test(title) ||
        /[.!?]$/.test(title) ||
        line.height < medianSize * 1.25 ||
        top < 0 ||
        top > viewport.height * 0.4
      ) continue;

      if (previousPage !== undefined && pageNumber - previousPage <= 1) {
        lastSeenPage.set(normalizedTitle, pageNumber);
        continue;
      }
      lastSeenPage.set(normalizedTitle, pageNumber);
      headings.push({ title, dest: null, page: pageNumber, depth: 0 });
    }
  }

  return headings;
};
