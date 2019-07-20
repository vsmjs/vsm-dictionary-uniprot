/**
 * File used to quick test the `getEntries` function of
 * `DictionaryUniprot.js`
 */

const DictionaryUniprot = require('../src/DictionaryUniprot');

const dict = new DictionaryUniprot({log: true});

dict.getEntries({
  filter: {
    id: [
      'https://www.uniprot.org/uniprot/P52413',
      'https://www.uniprot.org/uniprot/P53142',
      'https://www.uniprot.org/uniprot/P12345',
      'https://www.uniprot.org/uniprot/P05067'
    ]},
  //sort: 'str',
  page: 1,
  perPage: 5
}, (err, res) => {
  if (err) console.log(JSON.stringify(err, null, 4));
  else {
    console.log(JSON.stringify(res, null, 4));
    console.log('\n#Results: ' + res.items.length);
  }
}
);
