'use strict';

var expect =  require('chai').expect;
var BloomFilter = require('../lib/bloomfilter');

describe('BloomFilter', function() {

  describe('@constructor', function() {

    it('should create instance without the new keyword', function() {
      expect(BloomFilter(2, 2)).to.be.instanceOf(BloomFilter);
    });

    it('should create instance with the new keyword', function() {
      expect(new BloomFilter(2, 2)).to.be.instanceOf(BloomFilter);
    });

  });

});
