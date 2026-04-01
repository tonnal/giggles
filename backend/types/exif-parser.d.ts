declare module 'exif-parser' {
  interface ExifData {
    tags: {
      DateTimeOriginal?: number;
      GPSLatitude?: number;
      GPSLongitude?: number;
      GPSAltitude?: number;
      Make?: string;
      Model?: string;
      ImageWidth?: number;
      ImageHeight?: number;
      [key: string]: any;
    };
    imageSize: {
      width: number;
      height: number;
    };
    hasThumbnail: boolean;
  }

  interface ExifParser {
    parse(): ExifData;
    enableBinaryFields(enable: boolean): ExifParser;
    enablePointers(enable: boolean): ExifParser;
    enableSimpleValues(enable: boolean): ExifParser;
    enableTagNames(enable: boolean): ExifParser;
  }

  function create(buffer: Buffer): ExifParser;

  export = { create };
}
