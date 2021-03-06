console.log("goa: GOA content script for Facebook services loading");

function detectLoginInfo(selector, services) {
  console.log("goa: Scraping for login info");
  var r = document.evaluate(selector, document.body, null, XPathResult.STRING_TYPE, null);
  var field = r.stringValue;
  if (!field)
    return false;
  /* If we get "http://www.facebook.com/myusername?ref=tn_tnmn", we want to
   * return "myusername". The "?ref" part might not be there, depending
   * whether Facebook Graph is enabled. */
  var matches = field.match(/www.facebook.com\/([^\?]*)/);
  var loginName = matches[1];
  if (!loginName)
    return false;
  var msg = {
    type: 'login-detected',
    data: {
      identity: loginName,
      provider: 'facebook',
      services: services,
      authenticationDomain: 'facebook.com'
    }
  };
  console.log("goa: Detected login info:", msg);
  chrome.extension.sendMessage(msg);
  return true;
}

function setupGoaIntegration(selector, services)
{
  // Run detectLoginInfo() on any DOM change if not ready yet
  if (!detectLoginInfo()) {
    var t = {};
    t.observer = new WebKitMutationObserver(function(mutations, observer) {
      if (detectLoginInfo(selector, services)) {
        observer.disconnect();
        clearTimeout(t.timeout);
      }
    });
    t.observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    t.timeout = setTimeout(function() {
        console.log("goa: Give up, unable to find any login info");
        t.observer.disconnect();
    }, 10000);
  };
}

setupGoaIntegration (
  // The DOM tree is different for accounts with Facebook Graph enabled and
  // with accounts without. This should work for both.
  'string(//div[@class="rfloat"]/ul[@id="pageNav"]'
          + '/li[@id="navTimeline" or @class="navItem firstItem tinyman"]'
          + '/a[starts-with(@href, "https://www.facebook.com/") '
                + 'or starts-with(@href, "http://www.facebook.com/")]'
          + '/@href)',
  ['chat']
);
