/**
 * File System Access API Integration & Browser Fallback
 * Allows Chrome / Edge / Opera users to open and save directly to their local Excel file.
 * Provides standard input file picker & download fallback for unsupported browsers.
 */

export const isFileSystemAccessSupported = () => {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
};

/**
 * Open an Excel file using the File System Access API
 */
export async function openFileWithFileSystem() {
  if (!isFileSystemAccessSupported()) {
    throw new Error("File System Access API is not supported in this browser.");
  }

  const [fileHandle] = await window.showOpenFilePicker({
    types: [
      {
        description: "Excel Workbook (*.xlsx)",
        accept: {
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"]
        }
      }
    ],
    multiple: false
  });

  const file = await fileHandle.getFile();
  const arrayBuffer = await file.arrayBuffer();

  return {
    fileHandle,
    filename: file.name,
    arrayBuffer,
    lastModified: new Date(file.lastModified).toISOString()
  };
}

/**
 * Save arrayBuffer directly back to the original file via FileHandle
 */
export async function saveToFileHandle(fileHandle, arrayBuffer) {
  if (!fileHandle) {
    throw new Error("No active file handle provided.");
  }

  // Verify and request write permission if needed
  const options = { mode: "readwrite" };
  if ((await fileHandle.queryPermission(options)) !== "granted") {
    const permission = await fileHandle.requestPermission(options);
    if (permission !== "granted") {
      throw new Error("Write permission denied by user.");
    }
  }

  // Create writable stream
  const writable = await fileHandle.createWritable();
  await writable.write(arrayBuffer);
  await writable.close();

  return true;
}

/**
 * Save As: Prompt user to choose destination file on disk
 */
export async function saveAsWithFileSystem(arrayBuffer, suggestedName = "Personal_Finance_Database.xlsx") {
  if (!isFileSystemAccessSupported()) {
    throw new Error("File System Access API not supported.");
  }

  const fileHandle = await window.showSaveFilePicker({
    suggestedName,
    types: [
      {
        description: "Excel Workbook (*.xlsx)",
        accept: {
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"]
        }
      }
    ]
  });

  const writable = await fileHandle.createWritable();
  await writable.write(arrayBuffer);
  await writable.close();

  return {
    fileHandle,
    filename: fileHandle.name
  };
}
