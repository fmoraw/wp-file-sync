import * as dotenv from "dotenv";
const ENV_FILE_PATH = process.argv[2] ? `${process.argv[2]}/.env` : `${process.cwd()}/.env`
dotenv.config({ path: ENV_FILE_PATH });
import * as cheerio from "cheerio";
import { updateCache, createNewCache } from "./cache";
import {login, getHtmlPageWithContent} from "./api";
import { existsSync } from "fs";

const CONTENT_PATH = process.argv[2] ? process.argv[2] : process.cwd() + "/files"

const init = async () => {
  if(!CONTENT_PATH) {
    console.log(`Saving files to ${CONTENT_PATH}`)
  }

  validateEnvVariables();
  await login();
  const html = await getHtmlPageWithContent();
  if(html) {
      const elements = parseData(html);
      await createOrUpdateCache(elements);
  }
};

const parseData = (html: string) => {
  const $ = cheerio.load(html);
  const selector: string = process.env.HTML_AHREF_ELEMENT_SELECTOR ? 
    process.env.HTML_AHREF_ELEMENT_SELECTOR : "a[rel=\"noopener noreferrer\"]";

  const foundElements: string[] = [];
  const elements = $(selector) as cheerio.Cheerio<cheerio.Element>
  elements.map((_, el) => foundElements.push(el.attribs.href));
  console.info(`Found ${foundElements.length} links.`);
  return foundElements;
};

export const createOrUpdateCache = async (fileUrls: string[]) => {
  const cacheFileContent = existsSync(CONTENT_PATH);

  if(cacheFileContent) {
      updateCache(fileUrls);
  } else {
      createNewCache(fileUrls);
  }
};

const validateEnvVariables = () => {
  if(!process.env.BASE_URL || process.env.BASE_URL?.length == 0) {
    throw console.error("BASE_URL not set!");
  }
  if(!process.env.PASSWORD) {
    console.warn("PASSWORD not set!");
  }
};

init();