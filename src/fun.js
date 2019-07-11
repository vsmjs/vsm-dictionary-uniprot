module.exports = { getLastPartOfURL, fixedEncodeURIComponent,
  getElementsInParentheses, getStringBeforeFirstSeparator };

function getLastPartOfURL(entryId) {
  return entryId.split('/').pop();
}

function fixedEncodeURIComponent(str) {
  // encode also characters: !, ', (, ), and *
  return encodeURIComponent(str).replace(/[!'()*]/g,
    c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function getElementsInParentheses(str) {
  let regex = /\((.+?)\)/g;
  let match, elements = [];

  do {
    match = regex.exec(str);
    if (match) {
      elements.push(match[1]);
    }
  } while (match);

  return elements;
}

function getStringBeforeFirstSeparator(str, sep) {
  return str.split(sep)[0].trim();
}