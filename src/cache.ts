import crypto from "crypto";
import cliProgress from "cli-progress";
import { downloadFile, getFileInfo } from "./api";
import { createCacheDirectory, desirializeCache, saveDownload, serializeCache } from "./cacheFileApi";

let cache: Cache;

export type Cache = Map<string, CacheElement>
type CacheElement = { url: string }

createCacheDirectory();

const cacheUpdateBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

export const updateCache = async (fileUrls: string[]) => {
    console.info("Update cache...");

    cache = desirializeCache();

    const tmpCache: Map<string, string> = new Map();
    const cachedHashs = Array.from(cache.keys());   

    cacheUpdateBar.start(fileUrls.length, 0);

    let actualHashs: (string|undefined)[] = [];
    actualHashs = await Promise.all(fileUrls.map(async (url) => {
        const fileInfo = await getFileInfo(url);
        cacheUpdateBar.increment();
        if(fileInfo && fileInfo.lastModified) {
            const hash = generateHashForFile(url, fileInfo.lastModified);
            tmpCache.set(hash, url);
            return hash;
        }
    }));
    cacheUpdateBar.stop();
    console.debug(`Found ${actualHashs.length} files`);
    const newHashs = findNewHashs(actualHashs, cachedHashs);
    const outDatedHashs: string[] = findOutDatedHashs(actualHashs, cachedHashs);
    console.debug(`Found ${newHashs.length} new items to download`);
    if(newHashs.length > 0) {
        const failedDownloads: string[] = await downloadNewFiles(newHashs, tmpCache);
        updateCacheEntries(newHashs, tmpCache);
        deleteOutDatedCacheEntries(outDatedHashs.concat(failedDownloads));
        serializeCache(cache);
    }
};

const findNewHashs = (actualHashs: (string|undefined)[], cachedHashs: string[]) => {
    return actualHashs.filter(etag => etag!== undefined && !cachedHashs.includes(etag));
};

const findOutDatedHashs = (actualEtags: (string|undefined)[], cacheEtags: string[]) => cacheEtags.filter(etag => !actualEtags.includes(etag));

const deleteOutDatedCacheEntries = (outDatedHashs: string[]) => {
    if(outDatedHashs.length > 0) {
        console.info("Delete items from cache");
        outDatedHashs.forEach((hash) => {
            cache.delete(hash);
        });
        console.info(`Deleted ${outDatedHashs.length} items!`);
    }
};

const updateCacheEntries = (newHashs: (string|undefined)[], tmpCache: Map<string, string>) => {
    if(newHashs.length > 0) {
        console.info("Adding items to cache");
        newHashs.forEach((hash) => {
            if(hash) { 
                const url = tmpCache.get(hash);
                if(url) {
                    cache.set(hash, {url: url});
                } else console.error(`No file found for url: ${url}`);
            }
        });
        console.info(`Updated ${newHashs.length} items!`);
    } 
};

const getFileNameFromUrl = (url: string) =>  url.substr(url.lastIndexOf("/") + 1);

const downloadNewFiles = async (newHashs: (string|undefined)[], tmpCache: Map<string, string>) => {
    const failedDownloads: string[] = [];
    await Promise.all(
        newHashs.map(async (value) => {
            if(value && tmpCache.has(value)) {
                const url = tmpCache.get(value);
                const response = await downloadFile(url!);
                const fileName = getFileNameFromUrl(url!);
                console.debug(`Downloading ${url}`);
                if(response.buffer && !response.hasError) {
                    saveDownload(fileName, response.buffer);
                }
            } else {
                console.error(`No url found for hash: ${value}`);
                if(value) {
                    failedDownloads.push(value);
                }
                else console.error("The hash is undefined");
            }
        })
    );
    return Promise.resolve(failedDownloads);
};

const hashCode = (input: string): string => {
    const secret = "SECRET";
    const sha256Hasher = crypto.createHmac("sha256", secret);

    return sha256Hasher.update(input).digest("hex");
};

const generateHashForFile = (url: string, lastModified: string): string => hashCode(url+lastModified);