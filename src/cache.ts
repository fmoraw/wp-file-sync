import { downloadFile, getEtag } from "./api";
import { createCacheDirectory, desirializeCache, saveDownload, serializeCache } from "./cacheFileApi";

let cache: Cache;

export type Cache = Map<string, CacheElement>
type CacheElement = { url: string }

createCacheDirectory();

export const updateCache = async (fileUrls: string[]) => {
    console.info("Update cache...");

    cache = desirializeCache();

    const tmpCache: Map<string, string> = new Map();
    const cacheEtags = Array.from(cache.keys());   

    let actualEtags: (string|undefined)[] = [];
    actualEtags = await Promise.all(fileUrls.map(async (url) => {
        const etag = await getEtag(url);
        if(etag) {
            tmpCache.set(etag, url);
            return etag;
        }
    }));

    const newEtags = findNewETags(actualEtags, cacheEtags);
    const outDatedEtags = findOutDatedETags(actualEtags, cacheEtags);

    await downloadNewFiles(newEtags, tmpCache);
    updateCacheEntries(newEtags, tmpCache);
    deleteOutDatedCacheEntries(outDatedEtags);
    serializeCache(cache);
};

export const createNewCache = async (fileUrls: string[]) => {
    cache = new Map();
    await downloadAllFiles(fileUrls);
    serializeCache(cache);
};

const findNewETags = (actualEtags: (string|undefined)[], cacheEtags: string[]) => {
    return actualEtags.filter(etag => etag!== undefined && !cacheEtags.includes(etag));
};

const findOutDatedETags = (actualEtags: (string|undefined)[], cacheEtags: string[]) => cacheEtags.filter(etag => !actualEtags.includes(etag));

const deleteOutDatedCacheEntries = (outDatedEtags: string[]) => {
    if(outDatedEtags.length > 0) {
        console.info("Delete items from cache");
        outDatedEtags.forEach((etag) => {
            cache.delete(etag);
        });
        console.info(`Deleted ${outDatedEtags.length} items!`);
    }
};

const updateCacheEntries = (newEtags: (string|undefined)[], tmpCache: Map<string, string>) => {
    if(newEtags.length > 0) {
        console.info("Adding items to cache");
        newEtags.forEach((etag) => {
            if(etag) { 
                const url = tmpCache.get(etag);
                if(url) {
                    cache.set(etag, {url: url});
                } else console.error(`No url found for eTag: ${etag}`);
            }
        });
        console.info(`Updated ${newEtags.length} items!`);
    } 
};

const getFileNameFromUrl = (url: string) =>  url.substr(url.lastIndexOf("/") + 1);

const downloadAllFiles = async (fileUrls: string[]) => {
    return await Promise.all(
        fileUrls.map(async (url) => {
            const etag = await getEtag(url);
            const response = await downloadFile(url);
            if(etag && !response.hasError && response.buffer) {
                saveDownload(getFileNameFromUrl(url), response.buffer);
                cache.set(etag, {url: url});
            }
        })
    );
};

const downloadNewFiles = async (newEtags: (string|undefined)[], tmpCache: Map<string, string>) => {
    await Promise.all(
        newEtags.map(async (value) => {
            if(value && tmpCache.has(value)) {
                const url = tmpCache.get(value);
                const response = await downloadFile(url!);
                const fileName = getFileNameFromUrl(url!);
                console.info(`Downloading ${url}`);
                if(response.buffer && !response.hasError) {
                    saveDownload(fileName, response.buffer);
                }
            } else {
                console.error(`No url found for eTag: ${value}`);
            }
        })
    );
};