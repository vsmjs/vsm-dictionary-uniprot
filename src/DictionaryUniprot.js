const Dictionary = require('vsm-dictionary');
const { getLastPartOfURL, fixedEncodeURIComponent, getElementsInParentheses,
  getStringBeforeFirstSeparator, isJSONString } = require('./fun');

module.exports = class DictionaryUniprot extends Dictionary {

  constructor(options) {
    const opt = options || {};
    super(opt);

    // optimized mapping for curators
    this.optimap = (typeof opt.optimap === 'boolean')
      ? opt.optimap
      : true;

    // Uniprot-specific parameters
    this.uniprotDictID = 'https://www.uniprot.org';
    this.uniprotURLPreffix = this.uniprotDictID + '/uniprot';
    this.uniprotColumns = 'id,comment(FUNCTION),protein names,genes,organism,reviewed,entry name,annotation score';
    this.uniprotFormat  = opt.format || 'tab';

    const baseURL = opt.baseURL || 'https://www.uniprot.org/uniprot';

    this.perPageMax = 50;

    // enable the console.log() usage
    this.enableLogging = opt.log || false;

    this.urlGetEntries = opt.urlGetEntries || baseURL + '/?query=$queryString';
    this.urlGetMatches = opt.urlGetMatches || baseURL + '/?query=$queryString';
  }

  getDictInfos(options, cb) {
    let res = {
      items: [
        {
          id: this.uniprotDictID,
          abbrev: 'UniProt',
          name: 'Universal Protein Resource'
        }
      ]
    };

    if (!this.hasProperFilterIDProperty(options)) {
      return cb(null, res);
    } else {
      return (options.filter.id.includes(this.uniprotDictID))
        ? cb(null, res)
        : cb(null, { items: [] });
    }
  }

  getEntries(options, cb) {
    if (this.hasProperFilterDictIDProperty(options)
      && !options.filter.dictID.includes(this.uniprotDictID)) {
      return cb(null, { items: [] });
    }

    const urlArray = this.buildEntryURLs(options);
    let callsRemaining = urlArray.length;
    const urlToResultsMap = new Map();
    let answered = false;

    for (let url of urlArray) {
      if (this.enableLogging)
        console.log('URL: ' + url);

      urlToResultsMap.set(url, []);

      this.request(url, (err, res) => {
        if (err) {
          if (!answered) {
            answered = true;
            --callsRemaining;
            return cb(err);
          }
        } else {
          urlToResultsMap.set(url, this.mapUniprotResToEntryObj(res, options));
        }

        --callsRemaining;
        // all calls have returned, so sort and trim results
        if (callsRemaining <= 0) {
          // gather all results in one array
          let arr = [];
          for (let entryObjArray of urlToResultsMap.values())
            arr = arr.concat(entryObjArray);

          // When requesting specific list of ids, do sorting and trimming
          if (this.hasProperFilterIDProperty(options)) {
            arr = this.trimEntryObjArray(
              this.sortEntries(arr, options), options
            );
          }

          // z-prune results
          arr = Dictionary.zPropPrune(arr, options.z);

          if (!answered) cb(err, { items: arr });
        }
      });
    }
  }

  getEntryMatchesForString(str, options, cb) {
    if ((!str) || (str.trim() === '')) return cb(null, {items: []});

    if (this.hasProperFilterDictIDProperty(options)
      && !options.filter.dictID.includes(this.pubMedDictID)) {
      return cb(null, { items: [] });
    }

    const url = this.prepareMatchStringSearchURL(str, options);

    if (this.enableLogging)
      console.log('URL: ' + url);

    this.request(url, (err, res) => {
      if (err) return cb(err);
      let matchObjArray = this.mapUniprotResToMatchObj(res, str);

      // z-prune results
      let arr = Dictionary.zPropPrune(matchObjArray, options.z);

      cb(err, { items: arr });
    });
  }

  buildEntryURLs(options) {
    let idList = [];

    // remove empty space ids
    if (this.hasProperFilterIDProperty(options)) {
      idList = options.filter.id.filter(id => id.trim() !== '');
    }

    if (idList.length !== 0) {
      // specific IDs
      return idList.map(entryId =>
        this.prepareEntrySearchURL(options, entryId)
      );
    } else {
      // all IDs
      return [this.prepareEntrySearchURL(options, '')];
    }
  }

  mapUniprotResToEntryObj(res) {
    let lines = res.split('\n');
    // remove header and last empty line
    lines = lines.slice(1, lines.length - 1);

    res = [];
    for (let line of lines) {
      let columns = line.split('\t');
      res.push(this.mapUniprotColumnsToEntryObj(columns));
    }

    return res;
  }

  mapUniprotResToMatchObj(res, str) {
    let lines = res.split('\n');
    // remove header and last empty line
    lines = lines.slice(1, lines.length - 1);

    res = [];
    for (let line of lines) {
      let columns = line.split('\t');
      res.push(this.mapUniprotColumnsToMatchObj(columns, str));
    }

    return res;
  }

  prepareEntrySearchURL(options, entryId) {
    let url = this.urlGetEntries;

    if (entryId === '') {
      // all ids
      url = url.replace('$queryString', '*') + '&columns='
        + fixedEncodeURIComponent(this.uniprotColumns);

      // by default return id-sorted results
      url += '&sort=id&desc=no';

      // add limit and offset URL parameters
      let limit = this.perPageMax;
      if (this.hasProperPerPageProperty(options)) {
        limit = options.perPage;
      }

      url += '&limit=' + limit;

      if (this.hasProperPageProperty(options)) {
        url += '&offset=' + (options.page - 1) * limit;
      } else
        url += '&offset=0';

    } else {
      // specific id
      const uniprotId = getLastPartOfURL(entryId);

      url = url.replace('$queryString', 'id:' + uniprotId) + '&columns='
        + fixedEncodeURIComponent(this.uniprotColumns);
    }

    url += '&format=' + this.uniprotFormat;
    return url;
  }

  prepareMatchStringSearchURL(str, options) {
    let url = this.urlGetMatches
      .replace('$queryString', fixedEncodeURIComponent(str))
      + '&columns=' + fixedEncodeURIComponent(this.uniprotColumns);

    // by default returned high-scored results first
    url += '&sort=score';

    // add limit and offset URL parameters
    let limit = this.perPageMax;
    if (this.hasProperPerPageProperty(options)) {
      limit = options.perPage;
    }

    url += '&limit=' + limit;

    if (this.hasProperPageProperty(options)) {
      url += '&offset=' + (options.page - 1) * limit;
    } else
      url += '&offset=0';

    url += '&format=' + this.uniprotFormat;
    return url;
  }

  mapUniprotColumnsToEntryObj(columns) {
    const uniprotID       = columns[0];
    const description     = columns[1];
    const proteinNames    = columns[2];
    const genes           = columns[3];
    const organism        = columns[4];
    const status          = columns[5]; //reviewed, unreviewed, deleted, etc.
    const entryName       = columns[6];
    const annotationScore = columns[7];

    const firstSynonym = getStringBeforeFirstSeparator(proteinNames, '(');
    const otherSynonyms = getElementsInParentheses(proteinNames);

    return {
      id: this.uniprotURLPreffix + '/' + uniprotID,
      dictID: this.uniprotDictID,
      ...((description !== '')
        && {
          descr: this.refineDescriptionStr(description)
        }
      ),
      terms: this.buildTerms(firstSynonym, otherSynonyms, entryName),
      z: {
        ...((genes !== '')
          && {
            genes: this.getGenes(genes),
          }
        ),
        ...((organism !== '')
          && {
            species: organism
          }
        ),
        ...((status !== '')
          && {
            status: status
          }
        ),
        ...((entryName !== '')
          && {
            entry: entryName
          }
        ),
        ...((annotationScore !== '')
          && {
            score: annotationScore
          }
        )
      }
    };
  }

  mapUniprotColumnsToMatchObj(columns, str) {
    const uniprotID       = columns[0];
    const description     = columns[1];
    const proteinNames    = columns[2];
    const genes           = columns[3];
    const organism        = columns[4];
    const status          = columns[5]; //reviewed, unreviewed, deleted, etc.
    const entryName       = columns[6];
    const annotationScore = columns[7];

    // hopefully never empty
    const firstSynonym = getStringBeforeFirstSeparator(proteinNames, '(');
    const otherSynonyms = getElementsInParentheses(proteinNames);
    const mainTerm = (this.optimap && entryName !== '')
      ? entryName
      : firstSynonym;

    return {
      id: this.uniprotURLPreffix + '/' + uniprotID,
      dictID: this.uniprotDictID,
      str: mainTerm,
      ...((description !== '')
        && {
          descr: this.refineDescriptionStr(description)
        }
      ),
      type: mainTerm.startsWith(str) ? 'S' : 'T',
      terms: this.buildTerms(firstSynonym, otherSynonyms, entryName),
      z: {
        ...((genes !== '')
          && {
            genes: this.getGenes(genes),
          }
        ),
        ...((organism !== '')
          && {
            species: organism
          }
        ),
        ...((status !== '')
          && {
            status: status
          }
        ),
        ...((entryName !== '')
          && {
            entry: entryName
          }
        ),
        ...((annotationScore !== '')
          && {
            score: annotationScore
          }
        )
      }
    };
  }

  refineDescriptionStr(descriptionStr) {
    let funStr = 'FUNCTION:';
    return (descriptionStr.startsWith(funStr))
      ? descriptionStr.replace(funStr, '').trim()
      : descriptionStr;
  }

  getGenes(genesStr) {
    // there can be a semi-colon sometimes
    let str = getStringBeforeFirstSeparator(genesStr, ';');
    return str.split(' ');
  }

  buildTerms(firstSynonym, otherSynonyms, entryName) {
    let res = [];

    if (this.optimap && entryName !== '') {
      res.push({ str: entryName});
    }

    res.push({ str: firstSynonym });

    for (let synonym of otherSynonyms) {
      res.push({ str: synonym });
    }

    return res;
  }

  sortEntries(arr, options) {
    if (!this.hasProperEntrySortProperty(options)
      || options.sort === 'id'
      || options.sort === 'dictID')
      return arr.sort((a, b) =>
        this.str_cmp(a.id, b.id));
    else if (options.sort === 'str')
      return arr.sort((a, b) =>
        this.str_cmp(a.terms[0].str, b.terms[0].str)
        || this.str_cmp(a.id, b.id));
  }

  str_cmp(a, b, caseMatters = false) {
    if (!caseMatters) {
      a = a.toLowerCase();
      b = b.toLowerCase();
    }
    return a < b
      ? -1
      : a > b
        ? 1
        : 0;
  }

  trimEntryObjArray(arr, options) {
    let numOfResults = arr.length;
    let page = this.hasProperPageProperty(options)
      ? options.page
      : 1;
    let pageSize = this.hasProperPerPageProperty(options)
      ? options.perPage
      : this.perPageMax;

    return arr.slice(
      ((page - 1) * pageSize),
      Math.min(page * pageSize, numOfResults)
    );
  }

  hasProperFilterDictIDProperty(options) {
    return options.hasOwnProperty('filter')
      && options.filter.hasOwnProperty('dictID')
      && Array.isArray(options.filter.dictID)
      && options.filter.dictID.length !== 0;
  }

  hasProperFilterIDProperty(options) {
    return options.hasOwnProperty('filter')
      && options.filter.hasOwnProperty('id')
      && Array.isArray(options.filter.id)
      && options.filter.id.length !== 0;
  }

  hasProperPageProperty(options) {
    return options.hasOwnProperty('page')
      && Number.isInteger(options.page)
      && options.page >= 1;
  }

  hasProperPerPageProperty(options) {
    return options.hasOwnProperty('perPage')
      && Number.isInteger(options.perPage)
      && options.perPage >= 1;
  }

  hasProperEntrySortProperty(options) {
    return options.hasOwnProperty('sort')
      && typeof options.sort === 'string'
      && (options.sort === 'dictID'
        || options.sort === 'id'
        || options.sort === 'str'
      );
  }

  request(url, cb) {
    const req = this.getReqObj();
    req.onreadystatechange = function () {
      if (req.readyState === 4) {
        if (req.status !== 200) {
          let response = req.responseText;
          if (isJSONString(response)) {
            cb(JSON.parse(response));
          } else {
            let err = '{ "status": ' + req.status
              + ', "error": ' + JSON.stringify(response) + '}';
            cb(JSON.parse(err));
          }
        }
        else {
          try {
            const response = req.responseText;
            cb(null, response);
          } catch (err) {
            cb(err);
          }
        }
      }
    };
    req.open('GET', url, true);
    req.send();
  }

  getReqObj() {
    return new (typeof XMLHttpRequest !== 'undefined'
      ? XMLHttpRequest // In browser
      : require('xmlhttprequest').XMLHttpRequest  // In Node.js
    )();
  }

};
