import { readFile } from "node:fs/promises";
import { Document } from "@langchain/core/documents";
import { PDFParse } from "pdf-parse";

// Loads a PDF file as one Document per page that contains text.
const loadPdf = async (filePath) => {
  const data = await readFile(filePath);
  const parser = new PDFParse({ data });

  try {
    const { pages, total } = await parser.getText();

    return pages
      .filter((page) => page.text.trim() !== "")
      .map(
        (page) =>
          new Document({
            pageContent: page.text,
            metadata: {
              source: filePath,
              pdf: { totalPages: total },
              loc: { pageNumber: page.num },
            },
          })
      );
  } finally {
    await parser.destroy();
  }
};

export default loadPdf;
