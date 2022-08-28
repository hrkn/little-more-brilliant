// cf: https://developer.mozilla.org/ja/docs/Glossary/Forbidden_header_name
const inviolableHeaders = [
  "Accept-Charset",
  "Accept-Encoding",
  "Access-Control-Request-Headers",
  "Access-Control-Request-Method",
  "Connection",
  "Content-Length",
  "Cookie",
  "Cookie2",
  "Date",
  "DNT",
  "Expect",
  "Feature-Policy",
  "Host",
  "Keep-Alive",
  "Origin",
  "Proxy-.*",
  "Sec-.*",
  "Referer",
  "TE",
  "Trailer",
  "Transfer-Encoding",
  "Upgrade",
  "Via",
].map((e) => e.trim());
const inviolableHeaderPattern = new RegExp(
  `^(${inviolableHeaders.join("|")})$`,
  "i"
);

let headerStorage = {};

chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    details.requestHeaders.forEach((element) => {
      if (!inviolableHeaderPattern.test(element.name)) {
        headerStorage[element.name] = element.value;
      }
    });
    console.log(headerStorage);
  },
  { urls: ["https://m.feelcycle.com/api/*"] },
  ["requestHeaders"]
);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.request) {
    case "headerStorage":
      sendResponse(headerStorage);
  }
});
