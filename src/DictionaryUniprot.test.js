const DictionaryUniprot = require('./DictionaryUniprot');
const chai = require('chai'); chai.should();
const expect = chai.expect;
const nock = require('nock');
const fs = require('fs');
const path = require('path');

describe('DictionaryUniprot.js', () => {

  const testURLBase = 'http://test';
  const dict =
    new DictionaryUniprot({ baseURL: testURLBase, log: true });

  const melanomaStr = 'melanoma';

  const get2IDsPath = path.join(__dirname, '..', 'resources', 'ids.tab');
  const getMelanomaPath = path.join(__dirname, '..', 'resources', 'melanoma.tab');

  const getIDsStr = fs.readFileSync(get2IDsPath, 'utf8');
  const getMatchesForMelanomaStr = fs.readFileSync(getMelanomaPath, 'utf8');

  before(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  after(() => {
    nock.enableNetConnect();
  });

  describe('getDictInfos', () => {
    it('returns proper Uniprot dictInfo object', cb => {

      dict.getDictInfos({}, (err, res) => {
        expect(err).to.be.null;
        res.should.deep.equal({
          items: [
            {
              id: 'https://www.uniprot.org',
              abbrev: 'UniProt',
              name: 'Universal Protein Resource'
            }
          ]
        });
        cb();
      });
    });
  });

  describe('getEntryMatchesForString', () => {
    it('returns proper formatted error', cb => {
      nock(testURLBase)
        .get('/?query=wrong&columns=id%2Ccomment%28FUNCTION%29%2Cprotein%20names%2Cgenes%2Corganism%2Creviewed%2Centry%20name%2Cannotation%20score&sort=score&limit=50&offset=0&format=tab')
        .reply(404, 'Something is wrong!!!');

      dict.getEntryMatchesForString('wrong', {}, (err, res) => {
        err.should.deep.equal({
          status: 404,
          error: 'Something is wrong!!!'
        });
        expect(res).to.be.an('undefined');

        cb();
      });
    });
  });

  describe('buildEntryURLs', () => {
    it('returns proper array of URLs to send to Uniprot REST API', cb => {
      const options1 = {};
      const options2 = { filter: {}, sort: 'str' };
      const options3 = { filter: { id: [], dictID: '' }, sort: 'id', page: 2,
        perPage: 101 };
      const options4 = { filter: { id: ['',''] }, sort: 'id', page: 2,
        perPage: 101 };
      const options5 = { filter: { id: [
        'https://www.uniprot.org/uniprot/P12345',
        'https://www.uniprot.org/uniprot/P53142',
        'https://www.uniprot.org/uniprot/P52413'
      ], dictID: '' }, sort: '', page: 1, perPage: 10 };
      const options6 = { filter: { id: [
        '', '      ',
        'https://www.uniprot.org/uniprot/P12345',
        'https://www.uniprot.org/uniprot/P53142',
        'https://www.uniprot.org/uniprot/P52413'
      ], dictID: '' }, sort: '', page: 1, perPage: 10 };


      const res1 = dict.buildEntryURLs(options1);
      const res2 = dict.buildEntryURLs(options2);
      const res3 = dict.buildEntryURLs(options3);
      const res4 = dict.buildEntryURLs(options4);
      const res5 = dict.buildEntryURLs(options5);
      const res6 = dict.buildEntryURLs(options6);

      const URLPart = '/?query=*&columns=id%2Ccomment%28FUNCTION%29%2Cprotein%20names%2Cgenes%2Corganism%2Creviewed%2Centry%20name%2Cannotation%20score&sort=id&desc=no';
      const expectedResult1 = [
        testURLBase + URLPart + '&limit=50&offset=0&format=tab'
      ];
      const expectedResult2 = [
        testURLBase + URLPart + '&limit=50&offset=0&format=tab'
      ];
      const expectedResult3 = [
        testURLBase + URLPart + '&limit=101&offset=101&format=tab'
      ];
      const expectedResult4 = [
        testURLBase + '/?query=id:P12345&columns=id%2Ccomment%28FUNCTION%29%2Cprotein%20names%2Cgenes%2Corganism%2Creviewed%2Centry%20name%2Cannotation%20score&format=tab',
        testURLBase + '/?query=id:P53142&columns=id%2Ccomment%28FUNCTION%29%2Cprotein%20names%2Cgenes%2Corganism%2Creviewed%2Centry%20name%2Cannotation%20score&format=tab',
        testURLBase + '/?query=id:P52413&columns=id%2Ccomment%28FUNCTION%29%2Cprotein%20names%2Cgenes%2Corganism%2Creviewed%2Centry%20name%2Cannotation%20score&format=tab'
      ];

      res1.should.deep.equal(expectedResult1);
      res2.should.deep.equal(expectedResult2);
      res3.should.deep.equal(expectedResult3);
      res4.should.deep.equal(expectedResult3);
      res5.should.deep.equal(expectedResult4);
      res6.should.deep.equal(expectedResult4);

      cb();
    });
  });

  describe('mapUniprotResToEntryObj', () => {
    it('properly maps Uniprot\'s tab-seperated lines to VSM entry '
      + 'objects', cb => {
      dict.mapUniprotResToEntryObj(getIDsStr).should.deep.equal(
        [{
          id: 'https://www.uniprot.org/uniprot/P52413',
          dictID: 'https://www.uniprot.org',
          descr: 'Carrier of the growing fatty acid chain in fatty acid biosynthesis.',
          terms: [
            {
              str: 'Acyl carrier protein 3, chloroplastic'
            },
            {
              str: 'ACP'
            }
          ],
          z: {
            genes: [
              'ACL1.3',
              'ACP1-3'
            ],
            species: 'Cuphea lanceolata (Cigar flower)',
            status: 'reviewed',
            entry: 'ACP3_CUPLA',
            score: '3 out of 5',
          }
        },
        {
          id: 'https://www.uniprot.org/uniprot/P53142',
          dictID: 'https://www.uniprot.org',
          descr: 'May be involved in vacuolar protein sorting. {ECO:0000269|PubMed:12134085}.',
          terms: [
            {
              'str': 'Vacuolar protein sorting-associated protein 73'
            }
          ],
          z: {
            genes: [
              'VPS73',
              'YGL104C',
              'G3090'
            ],
            species: 'Saccharomyces cerevisiae (strain ATCC 204508 / S288c) (Baker\'s yeast)',
            status: 'reviewed',
            entry: 'VPS73_YEAST',
            score: '3 out of 5',
          }
        }]
      );

      cb();
    });
  });

  describe('mapUniprotResToMatchObj', () => {
    it('properly maps Uniprot\'s tab-seperated lines to VSM match '
      + 'objects', cb => {
      dict.mapUniprotResToMatchObj(getMatchesForMelanomaStr, 'melanoma')
        .should.deep.equal([
          {
            id: 'https://www.uniprot.org/uniprot/P43121',
            dictID: 'https://www.uniprot.org',
            str: 'Cell surface glycoprotein MUC18',
            descr: 'Plays a role in cell adhesion, and in cohesion of the endothelial monolayer at intercellular junctions in vascular tissue. Its expression may allow melanoma cells to interact with cellular elements of the vascular system, thereby enhancing hematogeneous tumor spread. Could be an adhesion molecule active in neural crest cells during embryonic development. Acts as surface receptor that triggers tyrosine phosphorylation of FYN and PTK2/FAK1, and a transient increase in the intracellular calcium concentration. {ECO:0000269|PubMed:11036077, ECO:0000269|PubMed:8292890}.',
            type: 'T',
            terms: [
              {
                str: 'Cell surface glycoprotein MUC18'
              },
              {
                str: 'Cell surface glycoprotein P1H12'
              },
              {
                str: 'Melanoma cell adhesion molecule'
              },
              {
                str: 'Melanoma-associated antigen A32'
              },
              {
                str: 'Melanoma-associated antigen MUC18'
              },
              {
                str: 'S-endo 1 endothelial-associated antigen'
              },
              {
                str: 'CD antigen CD146'
              }
            ],
            z: {
              genes: [
                'MCAM',
                'MUC18'
              ],
              species: 'Homo sapiens (Human)',
              status: 'reviewed',
              entry: 'MUC18_HUMAN',
              score: '5 out of 5'
            }
          },
          {
            id: 'https://www.uniprot.org/uniprot/Q6UVK1',
            dictID: 'https://www.uniprot.org',
            str: 'Chondroitin sulfate proteoglycan 4',
            descr: 'Proteoglycan playing a role in cell proliferation and migration which stimulates endothelial cells motility during microvascular morphogenesis. May also inhibit neurite outgrowth and growth cone collapse during axon regeneration. Cell surface receptor for collagen alpha 2(VI) which may confer cells ability to migrate on that substrate. Binds through its extracellular N-terminus growth factors, extracellular matrix proteases modulating their activity. May regulate MPP16-dependent degradation and invasion of type I collagen participating in melanoma cells invasion properties. May modulate the plasminogen system by enhancing plasminogen activation and inhibiting angiostatin. Functions also as a signal transducing protein by binding through its cytoplasmic C-terminus scaffolding and signaling proteins. May promote retraction fiber formation and cell polarization through Rho GTPase activation. May stimulate alpha-4, beta-1 integrin-mediated adhesion and spreading by recruiting and activating a signaling cascade through CDC42, ACK1 and BCAR1. May activate FAK and ERK1/ERK2 signaling cascades. {ECO:0000269|PubMed:10587647, ECO:0000269|PubMed:11278606, ECO:0000269|PubMed:15210734}.',
            type: 'T',
            terms: [
              {
                str: 'Chondroitin sulfate proteoglycan 4'
              },
              {
                str: 'Chondroitin sulfate proteoglycan NG2'
              },
              {
                str: 'Melanoma chondroitin sulfate proteoglycan'
              },
              {
                str: 'Melanoma-associated chondroitin sulfate proteoglycan'
              }
            ],
            z: {
              genes: [
                'CSPG4',
                'MCSP'
              ],
              species: 'Homo sapiens (Human)',
              status: 'reviewed',
              entry: 'CSPG4_HUMAN',
              score: '5 out of 5'
            }
          }
        ]);

      cb();
    });
  });

  describe('prepareEntrySearchURL', () => {
    it('returns proper URL(s)', cb => {
      const url1 = dict.prepareEntrySearchURL({}, '');
      const url2 = dict.prepareEntrySearchURL({ page: 1, perPage: 2 }, '');
      const url3 = dict.prepareEntrySearchURL({ sort: 'id', page: 2, perPage: 500 }, '');
      const url4 = dict.prepareEntrySearchURL({}, 'https://www.uniprot.org/uniprot/P12345');
      const url5 = dict.prepareEntrySearchURL({ page: 1, perPage: 2 }, 'https://www.uniprot.org/uniprot/Q7T2N5');
      const url6 = dict.prepareEntrySearchURL({}, 'notAUniprotID');

      const columnsURLPart = '&columns=id%2Ccomment%28FUNCTION%29%2Cprotein%20names%2Cgenes%2Corganism%2Creviewed%2Centry%20name%2Cannotation%20score';
      const expectedURL1 = testURLBase + '/?query=*' + columnsURLPart
        + '&sort=id&desc=no&limit=50&offset=0&format=tab';
      const expectedURL2 = testURLBase + '/?query=*' + columnsURLPart
        + '&sort=id&desc=no&limit=2&offset=0&format=tab';
      const expectedURL3 = testURLBase + '/?query=*' + columnsURLPart
        + '&sort=id&desc=no&limit=500&offset=500&format=tab';
      const expectedURL4 = testURLBase + '/?query=id:P12345' + columnsURLPart
        + '&format=tab';
      const expectedURL5 = testURLBase + '/?query=id:Q7T2N5' + columnsURLPart
        + '&format=tab';
      const expectedURL6 = testURLBase + '/?query=id:notAUniprotID' + columnsURLPart
        + '&format=tab';

      url1.should.equal(expectedURL1);
      url2.should.equal(expectedURL2);
      url3.should.equal(expectedURL3);
      url4.should.equal(expectedURL4);
      url5.should.equal(expectedURL5);
      url6.should.equal(expectedURL6);

      cb();
    });
  });

  describe('prepareMatchStringSearchURL', () => {
    it('returns proper URL', cb => {
      const url1 = dict.prepareMatchStringSearchURL(melanomaStr, {});
      const expectedURL = testURLBase + '/?query=melanoma&columns=id%2Ccomment%28FUNCTION%29%2Cprotein%20names%2Cgenes%2Corganism%2Creviewed%2Centry%20name%2Cannotation%20score&sort=score';
      const URLPart1 = '&limit=50&offset=0&format=tab';
      url1.should.equal(expectedURL + URLPart1);

      const url2 = dict.prepareMatchStringSearchURL(melanomaStr, { page: 'String' });
      url2.should.equal(expectedURL + URLPart1);

      const url3 = dict.prepareMatchStringSearchURL(melanomaStr, { page: 0 });
      url3.should.equal(expectedURL + URLPart1);

      const url4 = dict.prepareMatchStringSearchURL(melanomaStr, { page: 4 });
      const URLPart2 = '&limit=50&offset=150&format=tab';
      url4.should.equal(expectedURL + URLPart2);

      const url5 = dict.prepareMatchStringSearchURL(melanomaStr, { perPage: ['Str'] });
      url5.should.equal(expectedURL + URLPart1);

      const url6 = dict.prepareMatchStringSearchURL(melanomaStr, { perPage: 0 });
      url6.should.equal(expectedURL + URLPart1);

      const url7 = dict.prepareMatchStringSearchURL(melanomaStr,
        { page: 3, perPage: 100 });
      const URLPart3 = '&limit=100&offset=200&format=tab';
      url7.should.equal(expectedURL + URLPart3);

      const url8 = dict.prepareMatchStringSearchURL(melanomaStr,
        { page: 1, perPage: 2 });
      const URLPart4 = '&limit=2&offset=0&format=tab';
      url8.should.equal(expectedURL + URLPart4);

      cb();
    });
  });

  describe('refineDescriptionStr', () => {
    it('prunes description string if applicable', cb => {
      dict.refineDescriptionStr('FUNCTION: Carrier of the growing fatty acid chain in fatty acid biosynthesis.  ')
        .should.equal('Carrier of the growing fatty acid chain in fatty acid biosynthesis.');
      dict.refineDescriptionStr('UFUNCTION: Carrier').should.equal('UFUNCTION: Carrier');
      dict.refineDescriptionStr('carrier').should.equal('carrier');

      cb();
    });
  });

  describe('getGenes', () => {
    it('returns an array with the given genes for the entry', cb => {
      dict.getGenes('A B C').should.deep.equal(['A', 'B', 'C']);
      dict.getGenes('A B C; D C').should.deep.equal(['A', 'B', 'C']);
      dict.getGenes('').should.deep.equal(['']);

      cb();
    });
  });

  describe('sortEntries', () => {
    it('sorts VSM entry objects as specified in the documentation', cb => {
      const arr = [
        { id: 'e', dictID: 'uniprot', terms: [{ str: 'a'}] },
        { id: 'd', dictID: 'uniprot', terms: [{ str: 'b'}] },
        { id: 'c', dictID: 'uniprot', terms: [{ str: 'c'}] },
        { id: 'b', dictID: 'uniprot', terms: [{ str: 'b'}] },
        { id: 'a', dictID: 'uniprot', terms: [{ str: 'c'}] }
      ];
      const arrIdSorted = [
        { id: 'a', dictID: 'uniprot', terms: [{ str: 'c'}] },
        { id: 'b', dictID: 'uniprot', terms: [{ str: 'b'}] },
        { id: 'c', dictID: 'uniprot', terms: [{ str: 'c'}] },
        { id: 'd', dictID: 'uniprot', terms: [{ str: 'b'}] },
        { id: 'e', dictID: 'uniprot', terms: [{ str: 'a'}] }
      ];
      const arrStrSorted = [
        { id: 'e', dictID: 'uniprot', terms: [{ str: 'a'}] },
        { id: 'b', dictID: 'uniprot', terms: [{ str: 'b'}] },
        { id: 'd', dictID: 'uniprot', terms: [{ str: 'b'}] },
        { id: 'a', dictID: 'uniprot', terms: [{ str: 'c'}] },
        { id: 'c', dictID: 'uniprot', terms: [{ str: 'c'}] }
      ];

      const options = {};
      dict.sortEntries(arr, options).should.deep.equal(arrIdSorted);
      options.sort = {};
      dict.sortEntries(arr, options).should.deep.equal(arrIdSorted);
      options.sort = '';
      dict.sortEntries(arr, options).should.deep.equal(arrIdSorted);
      options.sort = 'dictID';
      dict.sortEntries(arr, options).should.deep.equal(arrIdSorted);
      options.sort = 'id';
      dict.sortEntries(arr, options).should.deep.equal(arrIdSorted);
      options.sort = 'str';
      dict.sortEntries(arr, options).should.deep.equal(arrStrSorted);

      cb();
    });
  });

  describe('trimEntryObjArray', () => {
    it('properly trims given array of VSM entry objects', cb => {
      const arr = [
        { id:'a', dictID: 'A', terms: [{ str: 'aaa'}] },
        { id:'b', dictID: 'B', terms: [{ str: 'bbb'}] },
        { id:'c', dictID: 'C', terms: [{ str: 'ccc'}] }
      ];

      let options = {};
      dict.trimEntryObjArray(arr, options).should.deep.equal(arr);

      options.page = -1;
      options.perPage = 'no';
      dict.trimEntryObjArray(arr, options).should.deep.equal(arr);

      options.page = 1;
      options.perPage = 2;
      dict.trimEntryObjArray(arr, options).should.deep.equal(arr.slice(0,2));

      options.page = 2;
      dict.trimEntryObjArray(arr, options).should.deep.equal(arr.slice(2,3));

      options.page = 3;
      dict.trimEntryObjArray(arr, options).should.deep.equal([]);

      cb();
    });
  });

  describe('hasProperEntrySortProperty', () => {
    it('returns true or false whether the `options.sort` property for an ' +
      'entry VSM object is properly defined', cb => {
      const options = {};
      expect(dict.hasProperEntrySortProperty(options)).to.equal(false);
      options.sort = [];
      expect(dict.hasProperEntrySortProperty(options)).to.equal(false);
      options.sort = {};
      expect(dict.hasProperEntrySortProperty(options)).to.equal(false);
      options.sort = '';
      expect(dict.hasProperEntrySortProperty(options)).to.equal(false);
      options.sort = 45;
      expect(dict.hasProperEntrySortProperty(options)).to.equal(false);
      options.sort = 'dictID';
      expect(dict.hasProperEntrySortProperty(options)).to.equal(true);
      options.sort = 'id';
      expect(dict.hasProperEntrySortProperty(options)).to.equal(true);
      options.sort = 'str';
      expect(dict.hasProperEntrySortProperty(options)).to.equal(true);
      options.sort = 'noResultsStr';
      expect(dict.hasProperEntrySortProperty(options)).to.equal(false);

      cb();
    });
  });
});
