/**
 * File used to quick test the `getEntryMatchesForString` function of
 * `DictionaryUniProt.js`
 */

const DictionaryUniProt = require('../src/DictionaryUniProt');

const dict = new DictionaryUniProt({log: true});

dict.getEntryMatchesForString('tp53', { page: 1, perPage: 20 },
  (err, res) => {
    if (err) console.log(JSON.stringify(err, null, 4));
    else {
      console.log(JSON.stringify(res, null, 4));
      console.log('\n#Results: ' + res.items.length);
    }
  }
);
