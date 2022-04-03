import axios, { AxiosRequestConfig } from "axios";
import FormData from "form-data";

const PASSWORD = process.env.PASSWORD;
const BASE_URL = process.env.BASE_URL;
let COOKIE = "";

export const login = async () => {
    var data = new FormData();
    data.append("post_password", PASSWORD);
    data.append("Submit", "\"Senden");
    data.append("post_id", "35");

    var config: AxiosRequestConfig = {
      method: "post",
      url: `${BASE_URL}/wp-login.php?action=ppw_postpass`,
      headers: data.getHeaders(),
      data : data,
      maxRedirects: 0
    };
  
    console.info("Logging in...");
  
   return axios(config).catch(error => {
      if(error.response.status == 302) {
        console.info("Login successfull!");
        COOKIE = error.response.headers["set-cookie"];
      } else console.error("Could not login!");
    }); 
  };
  
export const getHtmlPageWithContent = async (): Promise<string | void> => {
    console.info("GET html page with content!");

    const axiosConfig: AxiosRequestConfig = {
      method: "GET",
      headers: {
        "Cookie": COOKIE,
      },
      url: `${BASE_URL}/choere/gmc/?ppwp=1`
    };
  
    const response = await axios(axiosConfig).catch((error) => {
      console.error(`could not retrive url ${axiosConfig.url}! Status: ${error.response.status}`);
    });
    if(response) {
      console.info("Retrieved html page successfully!");
      return Promise.resolve(response.data);
    } else {
      return Promise.reject();
    }
};

export const getFileInfo = async (fileUrl: string): Promise<{lastModified: string} | void> => {
    const axiosConfig: AxiosRequestConfig = {
        method: "HEAD",
        headers: {
          "Cookie": COOKIE,
        },
        url: `${fileUrl}`
      };

    let result = await axios(axiosConfig).catch(() => {
      console.warn(`Could not get etag for url ${fileUrl}`);
    });
    if(result && result.headers) {
        return {
          lastModified: removeQuotes(result.headers["last-modified"])
        };
    }
    return Promise.resolve();
};

export const downloadFile = async (fileUrl: string): Promise<{hasError?: boolean, buffer?: Buffer}> => {
    const axiosConfig: AxiosRequestConfig = {
        method: "GET",
        headers: {
          "Cookie": COOKIE,
        },
        responseType: "arraybuffer",
        url: `${fileUrl}`
    };

    console.debug(`Downloading ${fileUrl}...`);

    const response = await axios(axiosConfig).catch(error => {
      console.warn(`Could not download file from url ${fileUrl} skipping! Status: ${error.response?.status}`);
    });

    if(response && response.data) {
      return {buffer: Buffer.from(response.data, "base64")};
    } else {
      return {hasError: true};
    }
};

const removeQuotes = (input: string) => input.replace(/['"]+/g, "");

