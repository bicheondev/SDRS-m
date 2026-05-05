import JSZip from 'jszip';

import { buildShipCsvText } from './shipCsv.js';
import { buildImagesArchive } from './imagesZip.js';

export async function buildDatabaseExportBlob(databaseState) {
  const zip = new JSZip();

  zip.file('ship.csv', buildShipCsvText(databaseState.shipRecords));
  zip.file('images.zip', await buildImagesArchive(databaseState.imageEntries));

  return zip.generateAsync({ type: 'blob' });
}
