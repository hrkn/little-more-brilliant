var headerStorage = {};

async function getHeaderStorage() {
  // Do we need to control simultaneously call to avoid overload caused by
  // multiple call in very short term?
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      null,
      { request: "headerStorage" },
      (newHeaders) => {
        headerStorage = Object.assign({}, newHeaders);
        resolve(headerStorage);
      }
    );
  });
}

async function mypage() {
  return fetch("https://m.feelcycle.com/api/user/mypage", {
    headers: await getHeaderStorage(),
    method: "POST",
    mode: "cors",
    credentials: "include",
  }).then((response) => response.json());
}

async function ticket() {
  return fetch("https://m.feelcycle.com/api/user/mypage/ticket", {
    headers: await getHeaderStorage(),
    body: JSON.stringify({}),
    method: "POST",
    mode: "cors",
    credentials: "include",
  }).then((response) => response.json());
}

async function history() {
  let d = new Date();
  return fetch("https://m.feelcycle.com/api/auth/user/lesson_hist", {
    headers: await getHeaderStorage(),
    body: JSON.stringify({}),
    method: "POST",
    mode: "cors",
    credentials: "include",
  }).then((response) => response.json());
}
