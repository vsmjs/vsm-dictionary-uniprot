# vsm-dictionary-uniprot

<!-- badges: start -->
[![Build Status](https://travis-ci.com/UniBioDicts/vsm-dictionary-uniprot.svg?branch=master)](https://travis-ci.com/UniBioDicts/vsm-dictionary-uniprot)
[![codecov](https://codecov.io/gh/UniBioDicts/vsm-dictionary-uniprot/branch/master/graph/badge.svg)](https://codecov.io/gh/UniBioDicts/vsm-dictionary-uniprot)
[![npm version](https://img.shields.io/npm/v/vsm-dictionary-uniprot)](https://www.npmjs.com/package/vsm-dictionary-uniprot)
[![Downloads](https://img.shields.io/npm/dm/vsm-dictionary-uniprot)](https://www.npmjs.com/package/vsm-dictionary-uniprot)
[![License](https://img.shields.io/npm/l/vsm-dictionary-uniprot)](#license)
<!-- badges: end -->

## Summary

`vsm-dictionary-uniprot` is an implementation 
of the 'VsmDictionary' parent-class/interface (from the package
[`vsm-dictionary`](https://github.com/vsm/vsm-dictionary)), that
communicates with [UniProt's](https://www.uniprot.org) 
REST API and translates the provided protein data into a VSM-specific format.

## Install

Run: `npm install`

## Example use

Create a `test.js` file and include this code:

```javascript
const DictionaryUniprot = require('./DictionaryUniprot');
const dict = new DictionaryUniprot({log: true});

dict.getEntryMatchesForString('tp53', { page: 1, perPage: 10 }, 
  (err, res) => {
    if (err) 
      console.log(JSON.stringify(err, null, 4));
    else
      console.log(JSON.stringify(res, null, 4));
  }
);
```
Then, run `node test.js`

## Tests

Run `npm test`, which runs the source code tests with Mocha.  
If you want to quickly live test the Uniprot API, go to the 
`test` directory and run:
```
node getEntries.test.js
node getEntryMatchesForString.test.js
```

## 'Build' configuration

To use a VsmDictionary in Node.js, one can simply run `npm install` and then
use `require()`. But it is also convenient to have a version of the code that
can just be loaded via a &lt;script&gt;-tag in the browser.

Therefore, we included `webpack.config.js`, which is a Webpack configuration 
file for generating such a browser-ready package.

By running `npm build`, the built file will appear in a 'dist' subfolder. 
You can use it by including: 
`<script src="../dist/vsm-dictionary-uniprot.min.js"></script>` in the
header of an HTML file. 

## Specification

Like all VsmDictionary subclass implementations, this package follows
the parent class
[specification](https://github.com/vsm/vsm-dictionary/blob/master/Dictionary.spec.md).
In the next sections we will explain the mapping between the data 
offered by Uniprot's API and the corresponding VSM objects. Useful
links for the API are: 
- https://www.uniprot.org/help/query-fields
- https://www.uniprot.org/help/uniprotkb_column_names
- https://www.uniprot.org/help/api_queries
- https://www.uniprot.org/help/text-search

Note also that we implement **strict error handling** in the sense that whenever 
we launch multiple parallel queries to Uniprot's REST API (see the functions 
specifications below), if one of them returns an error (either a string or an 
error JSON object response), then the result will be an error object (no matter 
if all the rest of the calls returned proper results). 

If the error response in not a JSON string that we can parse, we formulate the 
error as a JSON object ourselves in the following format:
```
{
  status: <number>,
  error: <response> 
}
```
where the *response* from the server is JSON stringified.

### Map Uniprot to DictInfo VSM object

This specification relates to the function:  
 `getDictInfos(options, cb)`

If the `options.filter.id` is not properly defined 
or the `https://www.uniprot.org` dictID is included in the 
list of ids used for filtering, `getDictInfos` returns a static object 
with the following properties:
- `id`: 'https://www.uniprot.org' (will be used as a `dictID`)
- `abbrev`: 'UniProt'
- `name`: 'Universal Protein Resource'

Otherwise, an empty result is returned.

### Map Uniprot to Entry VSM object

This specification relates to the function:  
 `getEntries(options, cb)`

Firstly, if the `options.filter.dictID` is properly defined and in the list of 
dictIDs the `https://www.uniprot.org` dictID is not included, then 
an **empty array** of entry objects is returned.

If the `options.filter.id` is properly defined (with IDs like
`https://www.uniprot.org/uniprot/P12345`) then for each ID (in
parallel) we send a query like this one:

```
https://www.uniprot.org/uniprot/?query=id:P12345&columns=id%2Ccomment%28FUNCTION%29%2Cprotein%20names%2Cgenes%2Corganism%2Creviewed%2Centry%20name%2Cannotation%20score&format=tab
```

Otherwise, we ask for all ids (by default **id sorted**) with this query:
```
https://www.uniprot.org/uniprot/?query=*&columns=id%2Ccomment%28FUNCTION%29%2Cprotein%20names%2Cgenes%2Corganism%2Creviewed%2Centry%20name%2Cannotation%20score&sort=id&desc=no&limit=5&offset=0&format=tab
```

Note that depending on the `options.page` and `options.perPage` options 
we adjust the `limit` and `offset` parameters accordingly. There is no 
maximum value for the `limit` parameter, but we chose a value of **50** to 
use in case `perPage` is not defined properly (the default value for 
`offset` is 0).

Only when requesting for specific IDs, we sort the results depending on the
`options.sort` value: results can be either `id`-sorted or `str`-sorted,
according to the specification of the parent 'VsmDictionary' class.
We then prune these results according to the values `options.page` (default: 1)
and `options.perPage` (default: 50).

At July 2019, Uniprot offered the results from its REST API in various formats 
but not JSON :( We chose thus the tab-separated format as shown in the above 
queries (`&format=tab`). The returned tab-separated lines are mapped to VSM 
entries. The next table shows the exact mapping:

Uniprot column | Type | Required | VSM entry/match object property | Notes  
:---:|:---:|:---:|:---:|:---:
`Entry` | String | YES | `id` | the full URL of the Uniprot ID
`FUNCTION [CC]` | String | NO | `descr` | The protein's function
`Protein names` | String | NO? | `str`,`terms[i].str` | Recommended and alternative names for the protein
`Gene names` | String | NO | `z.genes` | An array of gene names
`Organism` | String | NO | `z.species` | The organism this protein was found
`Status` | String | NO | `z.status` | Is the protein information *reviewed*, *unreviewed*, *deleted* (obsolete), etc.
`Entry name` | String | YES | `z.entry` | A Uniprot-specific ID for the entry, e.g. `VPS73_YEAST`
`Annotation` | String | NO | `z.score` | Annotation score, a quality index for the protein information (e.g. '4 out of 5')

Note that the above mapping describes what we as developers thought as the most
reasonable. There is though a global option `optimap` that you can pass to the 
`DictionaryUniprot` object, which optimizes the above mapping for curator clarity
and use. The **default value is true** and what changes in the mapping table
above (which is the mapping for `optimap: false` actually) is that the VSM's `str` 
entry/match object property takes the value of the `Entry name`. The reason behind 
this is that the `Entry name` is always different for every returned result (Uniprot's
internal id) and thus distinguishable, whereas in the original mapping the first 
protein name (which was used as `str`) is not. 

### Map Uniprot to Match VSM object

This specification relates to the function:  
 `getEntryMatchesForString(str, options, cb)`

Firstly, if the `options.filter.dictID` is properly defined and in the list of 
dictIDs the `https://www.uniprot.org` dictID is not included, then 
an **empty array** of match objects is returned.

Otherwise, an example of a URL string that is being built and send to Uniprot's 
REST API when requesting for `tp53`, is:
```
https://www.uniprot.org/uniprot/?query=tp53&columns=id%2Ccomment%28FUNCTION%29%2Cprotein%20names%2Cgenes%2Corganism%2Creviewed%2Centry%20name%2Cannotation%20score&sort=score&limit=20&offset=0&format=tab
```

The columns requested are the same as in the `getEntries(options, cb)` case as 
well as the mapping shown in the table above. Queries requesting for string 
matches **always** return results sorted based on an internal, Uniprot-specific 
score value (note the `sort=score` in the URL). This practically ensures that 
the most requested and best-quality results will be the ones returned first and 
they are the same as what you would expect when searching a term in the the main 
search box of the Uniprot website: `https://www.uniprot.org/uniprot/?query=tp53&sort=score`.

For the `limit` and `offset` parameters the same things apply as in 
the `getEntries` specification. No sorting whatsoever is done on the client
after the results are returned from Uniprot's REST API. 

## License

This project is licensed under the AGPL license - see [LICENSE.md](LICENSE.md).
