import { Cache } from "../cache";
import {createCacheDirectory, desirializeCache, serializeCache} from "../cacheFileApi";

const serializedCache = "[[\"etag\",{\"url\":\"url\"}]]";

const readFileSyncMock = jest.fn().mockImplementation(() => serializedCache);
const writeFileSyncMock = jest.fn(); 
const mkdirSyncMock = jest.fn();

jest.mock("fs", () => ({
    readFileSync: (param1: string) => readFileSyncMock(param1),
    writeFileSync: (param1: string, param2: string) => writeFileSyncMock(param1, param2),
    mkdirSync: (param1: string) => mkdirSyncMock(param1)
}));

const jsonParseMock =  jest.spyOn(JSON, "parse");
const stringifySpy = jest.spyOn(JSON, "stringify");

describe("The cache file api", () => {

    const cache: Cache = new Map([["etag", {url: "url"}], ["etag2", {url: "url2"}]]);

    it("should serialize the cache", () => {
        serializeCache(cache);
        expect(stringifySpy).toHaveBeenCalled();
        expect(writeFileSyncMock).toHaveBeenCalledWith(expect.anything(), expect.anything());
        expect(writeFileSyncMock.mock.calls).toEqual([
            [`${process.cwd()}/src/cache.json`,"[[\"etag\",{\"url\":\"url\"}],[\"etag2\",{\"url\":\"url2\"}]]"]
        ]);
    });

    it("should deserialize the cache", () => {
        const result = desirializeCache();
        expect(readFileSyncMock).toHaveBeenCalledWith(`${process.cwd()}/src/cache.json`);
        expect(jsonParseMock).toHaveBeenCalledWith(serializedCache);
        expect(result.get("etag")).toEqual({url: "url"});
    });

    it("should create the cache directory", () => {
        createCacheDirectory();
        expect(mkdirSyncMock).toHaveBeenLastCalledWith(`${process.cwd()}/src/files`);
    });
});