class Debug {
  static traceMutation(mutationsList, _observer) {
    mutationsList.forEach((m) => {
      switch (m.type) {
        case "childList":
          // ツリーに１つ以上の子が追加されたか、ツリーから削除された
          // mutation.addedNodes と mutation.removedNodes を参照
          m.addedNodes.forEach((node) => {
            console.log(`Added \n${Debug.createNodeTreeString(node)}`);
          });
          m.removedNodes.forEach((node) => {
            console.log(
              `Removed ${node.nodeName.toLowerCase()}.[${node.getAttribute?.("class") ?? ""
              }]`
            );
          });
          break;
        case "attributes":
          // Mutation.target の要素の属性値が変更された。
          // 属性名は mutation.attributeName にあり、
          // 以前の値は mutation.oldValue にある。
          let from = m.oldValue;
          let to = m.target.getAttribute(m.attributeName);
          console.log(
            `Attribute changed(target: ${m.target.nodeName.toLowerCase()}.[${m.target.className
            }]), changedAttribute:${m.attributeName}:"${from}"->"${to}"`
          );
          break;
      }
    });
  }
  static createNodeTreeString(node, strings = [], level = 0) {
    strings.push(
      `${"  ".repeat(level)}` +
      `${node.nodeName.toLowerCase()}` +
      `.[${node.getAttribute?.("class") ?? ""}]`
    );
    node.childNodes?.forEach((n) =>
      Debug.createNodeTreeString(n, strings, level + 1)
    );
    return strings.join("\n");
  }
  static traceBodyNodeMutation() {
    const observer = new MutationObserver(Debug.traceMutation);
    observer.observe(document.getElementsByTagName("body")[0], {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["style", "class"],
      attributeOldValue: true,
    });
  }
}

function simpleXpath(xpath, parentNode) {
  return document.evaluate(
    xpath,
    parentNode,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
}

async function extractFromMypage(data) {
  console.log({ data });
  return {
    limit: Number(data.member_type.replace(/マンスリーメンバー/, "")),
    lesson_count: data.lesson_num,
    consumed: data.lesson_num,
    reservation: data.reservation_num,
    reservationWzMonthlyTicket: data.reservation_status.filter(
      (e) => e.ticket_name == "マンスリー1回券"
    ).length,
    reservationWzAwayTicket: data.reservation_status.filter(
      (e) => e.ticket_name == "他店利用チケット"
    ).length,
  };
}

async function extractFromTicket(data) {
  return {
    monthlyTicket:
      data.tickets.filter((e) => e.name == "マンスリー1回券")[0]?.lot ?? 0,
    awayTicket:
      data.tickets.filter((e) => e.name == "他店利用チケット")[0]?.lot ?? 0,
  };
}

async function extractFromHistory(data) {
  return {}
}

function insertElementIfAbsent(target) {
  if (simpleXpath("//div[@class='mydata']", target) !== null) {
    return;
  }

  const placeholderStyle = "padding: 2px; font-weight: bold;";
  let $div = $("<div>", {
    class: "mydata",
    title: "※チケット数から予約割当分は差引済み",
    style: "text-align: center;",
  });
  $div.append(
    $("<span>", { name: "target_month", text: "??" }),
    document.createTextNode("月の残り受講可能数は"),
    $("<span>", { name: "available", style: placeholderStyle, text: "??" }),
    document.createTextNode("です。(現在の予約数:"),
    $("<span>", { name: "reserved", style: placeholderStyle, text: "??" }),
    document.createTextNode(")"),
    $("<br>"),
    document.createTextNode("<利用可能チケット数> マンスリー1回券:"),
    $("<span>", {
      name: "available_monthly_ticket",
      style: placeholderStyle,
      text: "??",
    }),
    document.createTextNode("枚、多店舗利用チケット:"),
    $("<span>", {
      name: "available_away_ticket",
      style: placeholderStyle,
      text: "??",
    }),
    document.createTextNode("枚")
  );
  let $hr = $("<hr>", {
    "data-v-4805e910": "",
    class: "v-divider theme--light",
  });
  $(target).find(".v-divider:last").before($hr, $div);
}

function applyData(lessonDate, mypageData, ticketData) {
  let month = lessonDate.getMonth() + 1;
  let limit =
    month == new Date().getMonth() + 1
      ? mypageData.limit - mypageData.consumed
      : mypageData.limit;
  $("[name=target_month]").text(month);
  $("[name=available]").text(limit);
  $("[name=reserved]").text(mypageData.reservation);
  $("[name=available_monthly_ticket]").text(
    ticketData.monthlyTicket - mypageData.reservationWzMonthlyTicket
  );
  $("[name=available_away_ticket]").text(
    ticketData.awayTicket - mypageData.reservationWzAwayTicket
  );
}

function onProgramSeatsLoad(mutationsList, _observer) {
  mutationsList.forEach((m) => {
    if (m.type == "attributes") {
      let from = m.oldValue;
      let to = m.target.getAttribute(m.attributeName);
      if (m.attributeName == "style" && from == "display: none;" && to == "") {
        let date = simpleXpath("//div[@class='date']", m.target);
        let program = simpleXpath("//div[@class='program']", m.target);
        // date from date class element
        let lessonDate = new Date(
          date.innerText.split(" ")[0].substring(0, 10)
        );

        // Insert placeholder DOM if absent under m.target
        insertElementIfAbsent(m.target);

        // Obtain information and put value to placeholder
        let tasks = [
          mypage().then((data) => extractFromMypage(data)),
          ticket().then((data) => extractFromTicket(data)),
        ];
        Promise.all(tasks).then((resultSet) => {
          applyData(lessonDate, resultSet[0], resultSet[1]);
        });
      }
    }
  });
}

function containsTargetNodeInDescendants(node) {
  return (
    (node.nodeType == Node.ELEMENT_NODE &&
      node.nodeName.toLowerCase() == "div" &&
      (node.classList.contains("studioDialogNewBaseStudio") ||
        node.classList.contains("studioDialog"))) ||
    Array.from(node.childNodes).some((n) => containsTargetNodeInDescendants(n))
  );
}

function watchNewDivInsertion() {
  // Watch body for newly inserted target element
  const callback = (mutationsList, _observer) => {
    let refreshNeeded = false;
    mutationsList.forEach((m) => {
      // If node added, check the tag & attribute wheater to be observed
      if (
        m.type === "childList" &&
        Array.from(m.addedNodes).some((added) =>
          containsTargetNodeInDescendants(added)
        )
      ) {
        refreshNeeded = true;
      }
    });
    if (refreshNeeded) {
      refreshDivObserver();
    }
  };
  const observer = new MutationObserver(callback);
  observer.observe(document.getElementsByTagName("body")[0], {
    childList: true,
    subtree: true,
  });
}

function refreshDivObserver() {
  // "div.program_content > div.program" にマッチする要素を監視すると同じプログラムを
  // 表示させたとき、2回目以降要素のテキストが変化しない為イベントが発火しない
  document.querySelectorAll("div[class*='studioDialog']").forEach((div) => {
    let dialog_container = div.parentElement;
    console.log(
      `${dialog_container.nodeName.toLowerCase()}.[${dialog_container.className
      }] being observed`
    );
    gDivObserver.observe(dialog_container, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["style"],
    });
  });

  console.log("refreshed observer");
}

// ==================================================

let gDivObserver = undefined;
function init() {
  gDivObserver = new MutationObserver(onProgramSeatsLoad);
  // Debug.traceBodyNodeMutation()
  watchNewDivInsertion();
  refreshDivObserver();
}

window.addEventListener("load", init);
console.log("Be little more brilliant!");
