import { jest } from "@jest/globals";
import { Cache, updateCache } from "../cache";

let urlToEtagMapper = new Map<string, string>();
const downloadFileMock = jest.fn().mockImplementation(() => {
     return Promise.resolve(Buffer.alloc(1, "T"));
});
const getEtagMock = jest.fn().mockImplementation((url: any) => {
    urlToEtagMapper.get(url);
    return {
        lastModified: "TEST"
    };
});
jest.mock("../api",() => ({
    downloadFile: (args: any) => downloadFileMock(args),
    getFileInfo: (url: string) => getEtagMock(url)
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
    fileUrls: UrlWithHash[];
    expectedDownloads: ExpectedDownload[];
    initialCache?: Cache;
    expectedCache: Cache;
}

type UrlWithHash = {
    url: string
    hash: string
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

    describe("should be updated properly", () => {
        const testData: TestData[] = [
            {
                testName: "Should properly update the cache",
                fileUrls: [{
                    url: "https://abc.de/files/fileName.pdf",
                    hash: "78a9a758d56810b3602818626d7b1c6ef2fcaf37682e14057ffd03443d92a225"
                }, {
                    url: "https://abc.de/files/fileName2.pdf",
                    hash: "3562bcb62d83f8e7b5b9df155e3fa23aaa029935219b336154a44631cbc31383"
                }, {
                    url: "https://abc.de/files/fileName3.pdf",
                    hash: "101f0d62a4e13942a309b2a9033f0095cee60af3e6599f9cf6549c5282aa2e15"
                }],
                expectedDownloads: [
                    {filenName: "fileName2.pdf"},
                    {filenName: "fileName3.pdf"},
                ],
                initialCache: new Map([["78a9a758d56810b3602818626d7b1c6ef2fcaf37682e14057ffd03443d92a225", {url: "https://abc.de/files/fileName.pdf"}]]),
                expectedCache: new Map([
                    ["78a9a758d56810b3602818626d7b1c6ef2fcaf37682e14057ffd03443d92a225", {url: "https://abc.de/files/fileName.pdf"}],
                    ["3562bcb62d83f8e7b5b9df155e3fa23aaa029935219b336154a44631cbc31383", {url: "https://abc.de/files/fileName2.pdf"}],
                    ["101f0d62a4e13942a309b2a9033f0095cee60af3e6599f9cf6549c5282aa2e15", {url: "https://abc.de/files/fileName3.pdf"}]
                ])
            }, 
            {
                testName: "Should remove items from the cache",
                fileUrls: [{
                    url: "https://abc.de/files/fileName2.pdf",
                    hash: "3562bcb62d83f8e7b5b9df155e3fa23aaa029935219b336154a44631cbc31383"
                }],
                expectedDownloads: [{
                    filenName: "fileName2.pdf",
                }],
                initialCache: new Map([["78a9a758d56810b3602818626d7b1c6ef2fcaf37682e14057ffd03443d92a225", {url: "https://abc.de/files/fileName.pdf"}]]),
                expectedCache: new Map([
                    ["3562bcb62d83f8e7b5b9df155e3fa23aaa029935219b336154a44631cbc31383", {url: "https://abc.de/files/fileName2.pdf"}]
                ])
            },
        ];

        testData.forEach(testData => {
            it(testData.testName, async () => {

                mockCache = testData.initialCache;
    
                testData.fileUrls.forEach(value => {
                    urlToEtagMapper.set(value.url, value.hash);
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