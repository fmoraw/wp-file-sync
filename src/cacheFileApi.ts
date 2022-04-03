import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { Cache } from "./cache";

const CACHE_FILE_NAME = process.argv[2] ? `${process.argv[2]}/cache.json` : process.cwd() + "/cache.json";
const CACHE_DIR = process.argv[2] ? `${process.argv[2]}/files` : process.cwd() + "/files";

export const createCacheDirectory = async () => {
    if(!existsSync(CACHE_DIR)) {
        mkdirSync(CACHE_DIR);
    }
    if(!existsSync(CACHE_FILE_NAME)) {
        createCacheFile()
    }
};

export const createCacheFile = () => writeFileSync(CACHE_FILE_NAME, JSON.stringify([]))

export const desirializeCache = (): Cache => {
    const cacheData = readFileSync(CACHE_FILE_NAME, { encoding: "utf-8" });
    return new Map(JSON.parse(cacheData));
};

export const serializeCache = (cache: Cache) => {
    const content = JSON.stringify(Array.from(cache.entries()));
    writeFileSync(CACHE_FILE_NAME, content);
};

export const saveDownload = (filename: string, buffer: Buffer) => {
    writeFileSync(`${CACHE_DIR}/${filename}`, buffer);
};
