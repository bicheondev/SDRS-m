import { importImagesZipFile } from './imagesZip.js';
import { importShipCsvFile } from './shipCsv.js';

export async function loadBundledDatabaseStateFromFiles({ imagesFile, shipFile }) {
  const { fileName: imagesFileName, imageEntries } = await importImagesZipFile(imagesFile);
  const shipResult = await importShipCsvFile(shipFile, imageEntries);

  return {
    shipRecords: shipResult.shipRecords,
    imageEntries,
    files: {
      ship: {
        name: shipResult.fileName,
        imported: true,
        modified: false,
      },
      images: {
        name: imagesFileName,
        imported: true,
        modified: false,
      },
    },
  };
}
