import {jest} from "@jest/globals";
import { Cache, createNewCache, updateCache } from "../cache";

let urlToEtagMapper = new Map<string, string>();
const downloadFileMock = jest.fn().mockImplementation(() => Promise.resolve(Buffer.alloc(1, "T")));
const getEtagMock = jest.fn().mockImplementation((url: any) => urlToEtagMapper.get(url));
jest.mock("../api",() => ({
    downloadFile: (args: any) => downloadFileMock(args),
    getEtag: (url: string) => getEtagMock(url)
}));

let mockCache: Cache | undefined  = new Map();
const deserializeCacheMock = jest.fn().mockImplementation( () => mockCache);

const serializeCacheMock = jest.fn();
const saveDownloadMock = jest.fn();
jest.mock("../cacheFileApi", () => ({
    desirializeCache: (cache: Cache) => deserializeCacheMock(cache),
    serializeCache: (cache: Cache) => serializeCacheMock(cache),
    createCacheDirectory: () =>jest.fn(),
    saveDownload: (url: string, buffer: Buffer) => saveDownloadMock(url, buffer),
}));

type TestData = {
    testName: string
    fileUrls: UrlWithEtag[];
    expectedDownloads: ExpectedDownload[];
    initialCache?: Cache;
    expectedCache: Cache;
}

type UrlWithEtag = {
    url: string
    etag: string
}

type ExpectedDownload = {
    filenName: string;
}

describe("The cache", () => {

    beforeEach(() => {
        downloadFileMock.mockClear();
        getEtagMock.mockClear();
        deserializeCacheMock.mockClear();
        jest.clearAllMocks();
        mockCache = new Map();
        urlToEtagMapper.clear();
    }); 

    describe("should be created", () => {
        const testData: TestData[] = [
            {
                testName: "Should properly create a new cache with a single file",
                fileUrls: [{
                    url: "https://abc.de/files/fileName.pdf",
                    etag: "etag1"
                }],
                expectedDownloads: [{
                    filenName: "fileName.pdf",
                }],
                expectedCache: new Map([["etag1", {url: "https://abc.de/files/fileName.pdf"}]])
            },
            {
                testName: "Should properly create a new cache with multiple files",
                fileUrls: [{
                        url: "https://abc.de/files/fileName.pdf",
                        etag: "etag1",
                    }, {
                        url: "https://abc.de/files/fileName2.pdf",
                        etag: "etag2",
                    }
                ],
                expectedDownloads: [
                    {filenName: "fileName.pdf"},
                    {filenName: "fileName2.pdf"}
                ],
                expectedCache: new Map([
                    ["etag1", {url: "https://abc.de/files/fileName.pdf"}],
                    ["etag2", {url: "https://abc.de/files/fileName2.pdf"}]
                ])
            }
        ];
    
        testData.forEach(testData => {
            it(testData.testName, async () => {
    
                testData.fileUrls.forEach(value => {
                    urlToEtagMapper.set(value.url, value.etag);
                });
          
                await createNewCache(testData.fileUrls.flatMap((urlWithEtag) => urlWithEtag.url));
               
                testData.fileUrls.map((value, index) => {
                    expect(getEtagMock).toHaveBeenNthCalledWith(
                        index + 1,
                        value.url
                    );
                    expect(downloadFileMock).toHaveBeenNthCalledWith(
                        index + 1,
                        value.url
                    );
                });
                
                expect(serializeCacheMock).toHaveBeenCalledWith(
                    testData.expectedCache
                );
    
                testData.expectedDownloads.forEach((download, index) => {
                    expect(saveDownloadMock).toHaveBeenNthCalledWith(
                        index + 1,
                        download.filenName, 
                        expect.anything()
                    );
                });
            });
        });
    });

    describe("should be updated properly", () => {
        const testData: TestData[] = [
            {
                testName: "Should properly update the cache",
                fileUrls: [{
                    url: "https://abc.de/files/fileName.pdf",
                    etag: "etag1"
                }, {
                    url: "https://abc.de/files/fileName2.pdf",
                    etag: "etag2"
                }, {
                    url: "https://abc.de/files/fileName3.pdf",
                    etag: "etag3"
                }],
                expectedDownloads: [
                    {filenName: "fileName2.pdf"},
                    {filenName: "fileName3.pdf"},
                ],
                initialCache: new Map([["etag1", {url: "https://abc.de/files/fileName.pdf"}]]),
                expectedCache: new Map([
                    ["etag1", {url: "https://abc.de/files/fileName.pdf"}],
                    ["etag2", {url: "https://abc.de/files/fileName2.pdf"}],
                    ["etag3", {url: "https://abc.de/files/fileName3.pdf"}]
                ])
            }, {
                testName: "Should remove items from the cache",
                fileUrls: [{
                    url: "https://abc.de/files/fileName2.pdf",
                    etag: "etag2"
                }],
                expectedDownloads: [{
                    filenName: "fileName2.pdf",
                }],
                initialCache: new Map([["etag1", {url: "https://abc.de/files/fileName.pdf"}]]),
                expectedCache: new Map([
                    ["etag2", {url: "https://abc.de/files/fileName2.pdf"}]
                ])
            },
        ];

        testData.forEach(testData => {
            it(testData.testName, async () => {

                mockCache = testData.initialCache;
    
                testData.fileUrls.forEach(value => {
                    urlToEtagMapper.set(value.url, value.etag);
                });
          
                await updateCache(testData.fileUrls.flatMap((urlWithEtag) => urlWithEtag.url));

                testData.fileUrls.map((value, index) => {
                    expect(getEtagMock).toHaveBeenNthCalledWith(
                        index + 1,
                        value.url
                    );
                });
                
                expect(downloadFileMock).toHaveBeenCalledTimes(testData.expectedDownloads.length);

                expect(serializeCacheMock).toHaveBeenCalledWith(
                    testData.expectedCache
                );
    
                testData.expectedDownloads.forEach((download, index) => {
                    expect(saveDownloadMock).toHaveBeenNthCalledWith(
                        index + 1,
                        download.filenName, 
                        expect.anything()
                    );
                });
            });
        });
    });
});     